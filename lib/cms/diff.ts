import type { FieldSpec, SectionSpec } from "@/lib/cms/admin-schema";
import { PAGE_LINKS } from "@/lib/cms/defaults";

/**
 * "What will change on the website": every field that differs between the
 * published words and Nat's drafts, labelled the way the dashboard labels it,
 * for the review she sees before she publishes. Prices, lengths, switches and
 * pages are shown as she would read them, not as stored.
 */
export type Change = {
  /** "Frontal Install · Price". */
  label: string;
  before: string;
  after: string;
  /** A change Square does not know about: a service's name, price, length or availability. */
  square?: boolean;
};

type Item = Record<string, unknown>;

export function formatDollars(cents: unknown): string {
  if (typeof cents !== "number") return "";
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

export function formatMinutes(minutes: unknown): string {
  if (typeof minutes !== "number" || minutes <= 0) return "Not shown";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} minutes`;
  return `${hours} hour${hours === 1 ? "" : "s"}${rest ? ` ${rest} minutes` : ""}`;
}

function shown(field: FieldSpec, value: unknown, section: Item): string {
  switch (field.kind) {
    case "toggle":
      return value ? field.on : field.off;
    case "price":
      return formatDollars(value);
    case "minutes":
      return formatMinutes(value);
    case "page":
      return PAGE_LINKS.find((page) => page.href === value)?.label ?? String(value ?? "");
    case "primaryLocation": {
      const items = (section.items ?? []) as { id: string; name: string; region: string }[];
      const place = items.find((item) => item.id === value);
      return place ? `${place.name}, ${place.region}` : "None";
    }
    default:
      return typeof value === "string" ? value : value == null ? "" : String(value);
  }
}

const join = (...parts: string[]) => parts.filter(Boolean).join(" · ");

function walk(
  fields: FieldSpec[],
  before: Item,
  after: Item,
  prefix: string,
  out: Change[],
  sections: { before: Item; after: Item },
  squarePath: boolean,
) {
  for (const field of fields) {
    const a = before?.[field.key];
    const b = after?.[field.key];
    const label = join(prefix, field.label);

    switch (field.kind) {
      case "group":
        walk(field.fields, (a ?? {}) as Item, (b ?? {}) as Item, join(prefix, field.label), out, sections, false);
        break;
      case "record":
        for (const entry of field.entries) {
          walk(
            entry.fields,
            ((a ?? {}) as Item)[entry.key] as Item,
            ((b ?? {}) as Item)[entry.key] as Item,
            join(prefix, entry.title),
            out,
            sections,
            false,
          );
        }
        break;
      case "fixed":
        field.itemTitles.forEach((title, index) => {
          walk(
            field.fields,
            ((a ?? []) as Item[])[index],
            ((b ?? []) as Item[])[index],
            join(prefix, field.label, title),
            out,
            sections,
            false,
          );
        });
        break;
      case "keyed": {
        const oldItems = (a ?? []) as Item[];
        const newItems = (b ?? []) as Item[];
        const oldOrder = oldItems.map((item) => String(item.id));
        const newOrder = newItems.map((item) => String(item.id));
        if (field.reorder && oldOrder.join() !== newOrder.join()) {
          out.push({
            label: join(label, "Order"),
            before: oldItems.map((item) => field.titleOf(item)).join(", "),
            after: newItems.map((item) => field.titleOf(item)).join(", "),
          });
        }
        for (const item of newItems) {
          const previous = oldItems.find((candidate) => candidate.id === item.id);
          walk(
            field.fields,
            previous ?? {},
            item,
            join(prefix, field.titleOf(previous ?? item)),
            out,
            sections,
            field.key === "items" && squarePath,
          );
        }
        break;
      }
      case "list": {
        const oldItems = (a ?? []) as unknown[];
        const newItems = (b ?? []) as unknown[];
        const count = Math.max(oldItems.length, newItems.length);
        for (let index = 0; index < count; index++) {
          // "Question 3", not "Questions · question 3".
          const itemLabel = join(prefix, `${field.itemName[0].toUpperCase()}${field.itemName.slice(1)} ${index + 1}`);
          const was = oldItems[index];
          const now = newItems[index];
          const describe = (item: unknown) =>
            item === undefined ? "" : field.fields.length === 0 ? String(item) : field.titleOf(item, index);
          if (was === undefined || now === undefined) {
            out.push({
              label: join(itemLabel, was === undefined ? "Added" : "Removed"),
              before: describe(was),
              after: describe(now),
            });
          } else if (field.fields.length === 0) {
            if (was !== now) out.push({ label: itemLabel, before: String(was), after: String(now) });
          } else {
            walk(field.fields, was as Item, now as Item, itemLabel, out, sections, false);
          }
        }
        break;
      }
      default: {
        const left = shown(field, a, sections.before);
        const right = shown(field, b, sections.after);
        if (left !== right) {
          out.push({
            label,
            before: left,
            after: right,
            ...(squarePath && ["name", "price", "minutes", "active"].includes(field.key) ? { square: true } : {}),
          });
        }
      }
    }
  }
}

export function diffSection(spec: SectionSpec, before: Item, after: Item): Change[] {
  const out: Change[] = [];
  for (const group of spec.groups) {
    walk(group.fields, before, after, "", out, { before, after }, spec.key === "services");
  }
  return out;
}
