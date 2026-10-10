import type { FieldSpec, SectionSpec, TextSpec } from "@/lib/cms/admin-schema";
import { DEFAULT_CONTENT, PAGE_LINKS, type SectionKey } from "@/lib/cms/defaults";
import { findPlaceholders, isSafeWebUrl, LOCATION_TOKENS, type Places } from "@/lib/cms/model";

/**
 * What the dashboard checks before it saves a section, in Nat's words.
 *
 * Errors stop a save; warnings are said and allowed. The build checks again
 * in its own way (lib/cms/model.ts) and falls back to the original wording
 * rather than publish something broken, but by then Nat would not know why,
 * so the helpful messages are here, beside the field.
 *
 * Paths are relative to the section and use the same keys the content does:
 * "items.2.answer" in a list, "items.frontal-install.price" in a set of ids.
 */
export type Issues = Record<string, string>;

type Context = {
  /** Where Nat works, as this section would be published (drafts included). */
  places: Places;
};

type Item = Record<string, unknown>;

const LOCATION_SET = new Set<string>(LOCATION_TOKENS);

function placeholderList(extra: string[]): string {
  const names = [...LOCATION_TOKENS, ...extra].map((name) => `{${name}}`);
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function checkText(spec: TextSpec, value: unknown, path: string, errors: Issues, warnings: Issues, context: Context) {
  const text = typeof value === "string" ? value : "";
  const trimmed = text.trim();
  if (spec.required && trimmed === "") {
    errors[path] = "Fill this in. It shows on the website.";
    return;
  }
  if (text.length > spec.max) {
    errors[path] = `Keep this to ${spec.max} characters or fewer. It is ${text.length} now.`;
    return;
  }
  const allowed = new Set<string>([...LOCATION_SET, ...(spec.placeholders ?? [])]);
  const used = findPlaceholders(text);
  const unknown = used.find((name) => !allowed.has(name));
  if (unknown) {
    errors[path] = `{${unknown}} is not something the website can fill in. You can use ${placeholderList(spec.placeholders ?? [])}.`;
    return;
  }
  if (used.includes("current location") && !context.places.primary) {
    warnings[path] = "Every location is switched off, so {current location} would show nothing here.";
  } else if (used.includes("other locations") && context.places.others.length === 0) {
    warnings[path] = "You have no other locations switched on, so {other locations} would show nothing here. Check how the sentence reads below.";
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkField(field: FieldSpec, value: unknown, path: string, errors: Issues, warnings: Issues, context: Context) {
  switch (field.kind) {
    case "text":
    case "textarea":
      checkText(field, value, path, errors, warnings, context);
      return;
    case "email": {
      const text = typeof value === "string" ? value.trim() : "";
      if (!text && field.required) errors[path] = "Fill in an email address. Clients use it to reach you.";
      else if (text && !EMAIL.test(text)) errors[path] = "Enter an email address like name@example.com.";
      return;
    }
    case "phone": {
      const text = typeof value === "string" ? value.trim() : "";
      if (text && (!/^[+()\-.\s\d]{7,25}$/.test(text) || text.replace(/\D/g, "").length < 7)) {
        errors[path] = "Use a phone number with digits, spaces, brackets, dots, + or - only, like (410) 555-0134.";
      }
      return;
    }
    case "url": {
      const text = typeof value === "string" ? value.trim() : "";
      if (!text) return;
      if (!isSafeWebUrl(text) || !text.startsWith("https://")) {
        errors[path] = "Use the full address, starting with https://";
        return;
      }
      if (field.host) {
        const host = new URL(text).hostname.toLowerCase();
        if (host !== field.host && !host.endsWith(`.${field.host}`)) {
          errors[path] = `This should be an address on ${field.host}.`;
        }
      }
      return;
    }
    case "page":
      if (!PAGE_LINKS.some((page) => page.href === value)) errors[path] = "Choose a page from the list.";
      return;
    case "price":
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
        errors[path] = "Enter a price in dollars, like 100 or 95.50.";
      }
      return;
    case "minutes":
      if (typeof value !== "number" || !Number.isInteger(value) || (value !== 0 && (value < 15 || value > 600))) {
        errors[path] = "Enter a length between 15 and 600 minutes, or 0 to show none.";
      }
      return;
    case "toggle":
    case "primaryLocation":
      return;
    case "group":
      checkFields(field.fields, (value ?? {}) as Item, path, errors, warnings, context);
      return;
    case "record":
      for (const entry of field.entries) {
        checkFields(entry.fields, ((value ?? {}) as Item)[entry.key] as Item, `${path}.${entry.key}`, errors, warnings, context);
      }
      return;
    case "fixed":
      ((value ?? []) as Item[]).forEach((item, index) =>
        checkFields(field.fields, item, `${path}.${index}`, errors, warnings, context),
      );
      return;
    case "keyed":
      ((value ?? []) as Item[]).forEach((item) =>
        checkFields(field.fields, item, `${path}.${String(item.id)}`, errors, warnings, context),
      );
      return;
    case "list": {
      const items = (value ?? []) as unknown[];
      if (items.length < field.min) {
        errors[path] = `Keep at least ${field.min} ${field.itemName}${field.min === 1 ? "" : "s"}.`;
      } else if (items.length > field.max) {
        errors[path] = `There is room for ${field.max} ${field.itemName}s at most.`;
      }
      items.forEach((item, index) => {
        if (field.fields.length === 0) {
          checkText(
            { kind: "text", key: "", label: "", max: field.itemMax ?? 200, required: true },
            item,
            `${path}.${index}`,
            errors,
            warnings,
            context,
          );
        } else {
          checkFields(field.fields, item as Item, `${path}.${index}`, errors, warnings, context);
        }
      });
      return;
    }
  }
}

function checkFields(fields: FieldSpec[], value: Item | undefined, path: string, errors: Issues, warnings: Issues, context: Context) {
  for (const field of fields) {
    const childPath = path ? `${path}.${field.key}` : field.key;
    checkField(field, (value ?? {})[field.key], childPath, errors, warnings, context);
  }
}

const SAMPLE_QUOTES = new Set(DEFAULT_CONTENT.reviews.items.map((item) => item.quote.trim()));

/** True while any of the launch's written sample reviews is still on the page. */
export function hasSampleReviews(items: { quote: string }[]): boolean {
  return items.some((item) => SAMPLE_QUOTES.has(item.quote.trim()));
}

/** The rules that look across fields rather than at one. */
function checkSection(key: SectionKey, value: Item, errors: Issues, warnings: Issues) {
  if (key === "locations") {
    const items = (value.items ?? []) as { id: string; name: string; region: string; active: boolean }[];
    const seen = new Map<string, number>();
    items.forEach((item, index) => {
      const name = `${item.name.trim().toLowerCase()}|${item.region.trim().toLowerCase()}`;
      if (!item.name.trim()) return;
      if (seen.has(name)) errors[`items.${index}.name`] = "This location is already on the list.";
      else seen.set(name, index);
    });
    const active = items.filter((item) => item.active);
    if (active.length === 0) {
      warnings.primary =
        "Every location is switched off. The website will say you are between studios and name no town until you switch one back on.";
    } else if (!active.some((item) => item.id === value.primary)) {
      errors.primary = "Choose your current location from the locations that are switched on.";
    }
  }

  if (key === "services") {
    const labels = Object.entries((value.categories ?? {}) as Record<string, string>);
    const seen = new Set<string>();
    for (const [id, label] of labels) {
      const normal = label.trim().toLowerCase();
      if (normal && seen.has(normal)) errors[`categories.${id}`] = "Each heading needs its own name, or two groups would merge.";
      seen.add(normal);
    }
    const items = (value.items ?? []) as { active: boolean }[];
    if (!items.some((item) => item.active)) {
      warnings.items = "No service is on the menu. The booking page will show the scheduler only.";
    }
  }

  if (key === "reviews") {
    const items = (value.items ?? []) as { quote: string }[];
    if (value.placeholder === false && hasSampleReviews(items)) {
      errors.placeholder =
        "Some of the launch's sample reviews are still on the list. Replace them with real clients' words before switching the notice off.";
    }
    if (items.length === 0) warnings.items = "With no reviews, the Reviews page shows its opening only.";
  }
}

export function validateSection(spec: SectionSpec, value: Item, context: Context): { errors: Issues; warnings: Issues } {
  const errors: Issues = {};
  const warnings: Issues = {};
  for (const group of spec.groups) checkFields(group.fields, value, "", errors, warnings, context);
  checkSection(spec.key, value, errors, warnings);
  return { errors, warnings };
}

/** The DOM id of a field's control, so an error can move focus to it. */
export function fieldId(section: string, path: string): string {
  return `cms-${section}-${path.replace(/[^a-zA-Z0-9-]/g, "_")}`;
}
