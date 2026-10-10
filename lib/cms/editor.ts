import { CONTENT_RULES, DEFAULT_CONTENT, type SectionKey } from "@/lib/cms/defaults";
import {
  fillPlaceholders,
  locationValues,
  mergeSection,
  normalizeLocations,
  normalizeText,
  placesOf,
  type Places,
} from "@/lib/cms/model";

/**
 * Small helpers the dashboard edits with (components/admin/cms). Pure, so
 * tests/cms-editor.test.mjs can check them without a browser.
 */

export type Item = Record<string, unknown>;

/**
 * A section in full, the way the site would build it from `raw` (a release's
 * section or a draft): every field present, every value of the right type.
 * Placeholders such as {current location} are left as written.
 */
export function sectionFrom(key: SectionKey, raw: unknown): Item {
  return mergeSection(key, DEFAULT_CONTENT[key], raw, CONTENT_RULES) as unknown as Item;
}

/** Every text in a value tidied the way the site stores it (lib/cms/model.ts, normalizeText). */
export function tidy<T>(value: T): T {
  if (typeof value === "string") return normalizeText(value) as T;
  if (Array.isArray(value)) return value.map((item) => tidy(item)) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, tidy(item)])) as T;
  }
  return value;
}

/** Same content. Key order is stable here: every value is built from the defaults' shape. */
export function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Where Nat works, as a locations section (published, saved or still being typed) would put it. */
export function placesFor(locations: unknown): Places {
  const section = sectionFrom("locations", locations) as unknown as Parameters<typeof normalizeLocations>[0];
  return placesOf(normalizeLocations(section));
}

/** What the per-page placeholders read as in a preview, so a sentence reads naturally. */
const SAMPLES: Record<string, string> = {
  service: "Frontal Install",
  finish: "Curls",
  "install type": "reinstalls",
  style: "Deep Wave Glam",
};

/** A text as the website would show it: the locations filled in, and samples for the rest. */
export function previewText(text: string, places: Places): string {
  return fillPlaceholders(fillPlaceholders(text, locationValues(places)), SAMPLES);
}

/**
 * An id for a location added in the dashboard. Never shown; it only has to
 * be unique and the shape lib/cms/model.ts accepts, so the current-location
 * choice can point at a location before it has been saved.
 */
export function nextLocationId(items: { id?: unknown }[]): string {
  const taken = new Set(items.map((item) => String(item.id ?? "")));
  for (let n = items.length + 1; ; n++) {
    const id = `location-${n}`;
    if (!taken.has(id)) return id;
  }
}

/** A price as Nat types it: "95", "95.50", "$1,200". Cents, or null when it is not a price. */
export function parseDollars(text: string): number | null {
  const clean = text.replace(/[$,\s]/g, "");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number.parseFloat(clean) * 100);
}

/** Cents as Nat would type them: 9500 -> "95", 9550 -> "95.50". */
export function dollarsText(cents: number): string {
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

/** Minutes as typed: whole numbers only. */
export function parseMinutes(text: string): number | null {
  const clean = text.trim();
  if (!/^\d{1,3}$/.test(clean)) return null;
  return Number.parseInt(clean, 10);
}

/** A date and time in the studio's own time zone: "Oct 9, 2026, 3:04 PM". */
export function studioTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
