/**
 * How published content becomes the content the site is built with.
 *
 * Pure functions, shared by the build (lib/cms/published.ts), the dashboard
 * (components/admin/cms) and the unit tests (tests/cms-model.test.mjs). It
 * imports nothing but types, so `node --test` can load it as it is; the
 * rules it applies are passed in (CONTENT_RULES in lib/cms/published.ts).
 *
 * ---------------------------------------------------------------------------
 * THE ONE GUARANTEE
 * ---------------------------------------------------------------------------
 * Whatever a release holds, resolveContent() returns an object exactly the
 * shape of DEFAULT_CONTENT, every value of the right type. A field that is
 * missing, the wrong type, out of range or an unsafe link takes its default.
 * Only the owner can publish (supabase/migrations/0011), so this is not the
 * security boundary; it is what keeps a half-finished edit, an older release
 * or a future field from ever breaking a page.
 */

export type ContentRules = {
  freeLists: Record<string, { item: unknown; required: string[]; max: number }>;
  requiredText: string[];
  numberRanges: Record<string, [number, number]>;
  linkFields: Record<string, "web" | "page">;
  pageLinks: { href: string }[];
};

/** A location as the pages use it, with its label already composed. */
export type Place = {
  id: string;
  name: string;
  region: string;
  description: string;
  notice: string;
  /** "Towson, MD". */
  label: string;
};

/** Where Nat is working, worked out once from the `locations` section. */
export type Places = {
  /** Active locations, the current one first. Empty while every chair is closed. */
  active: Place[];
  primary: Place | null;
  others: Place[];
  /** "Towson, MD", or "" with nothing active. */
  current: string;
  /** "Laurel, MD", or "Laurel and Columbia, MD". "" when there are none. */
  other: string;
  /** "Towson and Laurel, MD". */
  all: string;
};

/** What next.config.ts hands the build: the release current when it started. */
export type PublishedSnapshot = {
  release: number;
  publishedAt: string;
  content: Record<string, unknown>;
};

/** Longest a single published text may be. The dashboard sets tighter limits per field. */
export const MAX_TEXT = 5000;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "services.items.*.name" against "services.items.frontal-install.name". */
export function matchesPath(path: string, pattern: string): boolean {
  const a = path.split(".");
  const b = pattern.split(".");
  return a.length === b.length && b.every((part, index) => part === "*" || part === a[index]);
}

function matchesAny(path: string, patterns: Iterable<string>): string | null {
  for (const pattern of patterns) if (matchesPath(path, pattern)) return pattern;
  return null;
}

/**
 * Text as the site stores it: Windows line endings made plain, control
 * characters dropped, no stray space before a line break, at most one blank
 * line in a row, trimmed. Intentional line breaks are kept.
 */
export function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT);
}

/** An https (or http) address with a real host, and nothing else. */
export function isSafeWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

// --------------------------------------------------------------- merging ---

function mergeText(def: string, raw: unknown, path: string, rules: ContentRules): string {
  if (typeof raw !== "string") return def;
  const text = normalizeText(raw);

  const link = matchesAny(path, Object.keys(rules.linkFields));
  if (link) {
    const kind = rules.linkFields[link];
    if (kind === "page") return rules.pageLinks.some((page) => page.href === text) ? text : def;
    // An empty web address is allowed: it switches that link off.
    return text === "" || isSafeWebUrl(text) ? text : def;
  }

  if (text === "" && def !== "" && matchesAny(path, rules.requiredText)) return def;
  return text;
}

function mergeNumber(def: number, raw: unknown, path: string, rules: ContentRules): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return def;
  const range = matchesAny(path, Object.keys(rules.numberRanges));
  if (range) {
    const [min, max] = rules.numberRanges[range];
    if (raw < min || raw > max) return def;
  }
  return Math.round(raw);
}

/** A list Nat adds to: her items, in her order, each checked against the template. */
function mergeFreeList(
  def: unknown[],
  raw: unknown,
  path: string,
  rules: ContentRules,
  list: { item: unknown; required: string[]; max: number },
): unknown[] {
  // Never published: the default list. Published empty: empty, on purpose.
  if (!Array.isArray(raw)) return def.map((item, index) => merge(item, undefined, `${path}.${index}`, rules));

  const out: unknown[] = [];
  for (const entry of raw) {
    if (out.length >= list.max) break;
    const item = merge(list.item, entry, `${path}.${out.length}`, rules, true);
    const filled = list.required.every((key) => {
      const value = key === "" ? item : (item as UnknownRecord)[key];
      return typeof value === "string" && value !== "";
    });
    if (filled) out.push(item);
  }
  return out;
}

/** A fixed set of ids: Nat's order, unknown ids dropped, missing ones put back. */
function mergeKeyedList(def: UnknownRecord[], raw: unknown, path: string, rules: ContentRules): unknown[] {
  const byId = new Map(def.map((item) => [item.id as string, item]));
  const seen = new Set<string>();
  const out: unknown[] = [];

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!isRecord(entry) || typeof entry.id !== "string") continue;
      const base = byId.get(entry.id);
      if (!base || seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(merge(base, entry, `${path}.${entry.id}`, rules));
    }
  }
  for (const base of def) {
    if (!seen.has(base.id as string)) out.push(merge(base, undefined, `${path}.${base.id}`, rules));
  }
  return out;
}

/**
 * `def` is the default at `path`; `raw` is whatever was published there.
 * `strict` is set inside a free-list item, where an empty field stays empty
 * (a new FAQ answer has no default to fall back to) and is judged by the
 * list's own `required`.
 */
function merge(def: unknown, raw: unknown, path: string, rules: ContentRules, strict = false): unknown {
  if (typeof def === "string") {
    if (strict) return typeof raw === "string" ? normalizeText(raw) : def;
    return mergeText(def, raw, path, rules);
  }
  if (typeof def === "boolean") return typeof raw === "boolean" ? raw : def;
  if (typeof def === "number") return mergeNumber(def, raw, path, rules);

  if (Array.isArray(def)) {
    const list = rules.freeLists[path];
    if (list) return mergeFreeList(def, raw, path, rules, list);
    if (def.length > 0 && def.every((item) => isRecord(item) && typeof item.id === "string")) {
      return mergeKeyedList(def as UnknownRecord[], raw, path, rules);
    }
    return def.map((item, index) => merge(item, Array.isArray(raw) ? raw[index] : undefined, `${path}.${index}`, rules));
  }

  if (isRecord(def)) {
    const source = isRecord(raw) ? raw : {};
    const out: UnknownRecord = {};
    for (const key of Object.keys(def)) {
      out[key] = merge(def[key], source[key], path ? `${path}.${key}` : key, rules, strict);
    }
    return out;
  }

  return def;
}

/**
 * Published content laid over the defaults, field by field. Exported apart
 * from resolveContent so the dashboard can show a section the way the site
 * would build it, placeholders still in place.
 */
export function mergeContent<T>(defaults: T, raw: unknown, rules: ContentRules): T {
  return merge(defaults, raw, "", rules) as T;
}

/** One section, the same way. */
export function mergeSection<T>(key: string, defaults: T, raw: unknown, rules: ContentRules): T {
  return merge(defaults, raw, key, rules) as T;
}

// ------------------------------------------------------------- locations ---

/** "Towson", "Towson and Laurel", "Towson, Laurel and Columbia". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Several places as one phrase. Sharing a state, the state is said once:
 * "Towson and Laurel, MD". Otherwise each keeps its own:
 * "Towson, MD and Alexandria, VA".
 */
export function joinPlaces(places: { name: string; region: string }[]): string {
  if (places.length === 0) return "";
  const regions = new Set(places.map((place) => place.region));
  if (regions.size === 1) return `${joinNames(places.map((place) => place.name))}, ${places[0].region}`;
  return joinNames(places.map((place) => `${place.name}, ${place.region}`));
}

type LocationSection = {
  primary: string;
  items: { id: string; name: string; region: string; description: string; notice: string; active: boolean }[];
};

/** A stable id for a location that arrived without one. */
function slugOf(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "location"
  );
}

/**
 * Gives every location a unique id, and makes `primary` name an active one:
 * the one Nat chose if it is still switched on, otherwise the first that is.
 * With nothing switched on there is no current location, and the site says
 * the chair is between studios rather than naming a closed town.
 */
export function normalizeLocations<T extends LocationSection>(section: T): T {
  const seen = new Set<string>();
  const items = section.items.map((item) => {
    let id = item.id && /^[a-z0-9-]{1,40}$/.test(item.id) ? item.id : slugOf(item.name);
    while (seen.has(id)) id = `${id}-2`;
    seen.add(id);
    return { ...item, id };
  });
  const active = items.filter((item) => item.active);
  const primary = active.find((item) => item.id === section.primary) ?? active[0];
  return { ...section, items, primary: primary?.id ?? "" };
}

export function placesOf(section: LocationSection): Places {
  const toPlace = (item: LocationSection["items"][number]): Place => ({
    id: item.id,
    name: item.name,
    region: item.region,
    description: item.description,
    notice: item.notice,
    label: `${item.name}, ${item.region}`,
  });
  const active = section.items.filter((item) => item.active).map(toPlace);
  const primary = active.find((place) => place.id === section.primary) ?? active[0] ?? null;
  const others = active.filter((place) => place !== primary);
  const ordered = primary ? [primary, ...others] : [];
  return {
    active: ordered,
    primary,
    others,
    current: primary?.label ?? "",
    other: joinPlaces(others),
    all: joinPlaces(ordered),
  };
}

// ---------------------------------------------------------- placeholders ---

/** The location placeholders any text on the site may use. */
export const LOCATION_TOKENS = ["current location", "other locations", "all locations"] as const;

const PLACEHOLDER = /\{\s*([a-z][a-z ]{0,30}?)\s*\}/gi;

/** Every `{name}` in a text, lower-cased, in order of appearance. */
export function findPlaceholders(text: string): string[] {
  return Array.from(text.matchAll(PLACEHOLDER), (match) => match[1].toLowerCase().replace(/\s+/g, " "));
}

/**
 * Replaces each `{name}` that has a value; leaves any other untouched, so a
 * placeholder meant for later (`{service}` on a booking page) survives the
 * location pass. Case and inner spacing do not matter: `{Current Location}`
 * works too.
 */
export function fillPlaceholders(text: string, values: Record<string, string>): string {
  return text.replace(PLACEHOLDER, (whole, name: string) => {
    const key = name.toLowerCase().replace(/\s+/g, " ");
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole;
  });
}

export function locationValues(places: Places): Record<string, string> {
  return {
    "current location": places.current,
    "other locations": places.other,
    "all locations": places.all,
  };
}

/** Every text on the site with the location placeholders filled, except the locations themselves and links. */
function fillTree(value: unknown, path: string, values: Record<string, string>, skip: string[]): unknown {
  if (matchesAny(path, skip)) return value;
  if (typeof value === "string") return fillPlaceholders(value, values);
  if (Array.isArray(value)) return value.map((item, index) => fillTree(item, `${path}.${index}`, values, skip));
  if (isRecord(value)) {
    const out: UnknownRecord = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = fillTree(item, path ? `${path}.${key}` : key, values, skip);
    }
    return out;
  }
  return value;
}

// --------------------------------------------------------------- the lot ---

/** The snapshot next.config.ts read, or null for none (a clean clone, or nothing published yet). */
export function readPublished(raw: string | undefined): PublishedSnapshot | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      isRecord(parsed) &&
      typeof parsed.release === "number" &&
      typeof parsed.publishedAt === "string" &&
      isRecord(parsed.content)
    ) {
      return { release: parsed.release, publishedAt: parsed.publishedAt, content: parsed.content };
    }
  } catch {
    // Not JSON: treated as nothing published, and the defaults are used.
  }
  return null;
}

/**
 * The content the site is built with: published values over the defaults,
 * locations tidied, every location placeholder filled in.
 */
export function resolveContent<T extends { locations: LocationSection }>(
  raw: unknown,
  defaults: T,
  rules: ContentRules,
): { content: T; places: Places } {
  const merged = mergeContent(defaults, raw, rules);
  const locations = normalizeLocations(merged.locations);
  const places = placesOf(locations);
  const filled = fillTree(
    { ...merged, locations },
    "",
    locationValues(places),
    ["locations", ...Object.keys(rules.linkFields)],
  ) as T;
  return { content: filled, places };
}

/** A multi-paragraph text as its paragraphs: split on blank lines. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
