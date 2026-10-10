// Run with: npm test
//
// The style pages, /gallery/<slug>/ (app/gallery/[slug]/page.tsx): every way
// into one lands on the right page, a style's Book button lands on that
// page's own scheduler, "Book Your Chair" still opens the whole menu, the
// old /styles/ addresses still arrive, and each page shows only its own
// published photographs (lib/gallery.ts), whether they come from the launch
// set or from the rows Nat manages in the photo manager.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "./helpers/alias.mjs";

const { COLLECTIONS, collectionPath } = await import("../lib/collections.ts");
const { COLLECTION_BOOKING_ANCHOR, COLLECTION_PAGE, bookingTarget, collectionBookingTarget } = await import(
  "../lib/content.ts"
);
const { findResolved, resolveSite } = await import("../lib/gallery.ts");
const { launchPhotoSet, photoSetFromRows } = await import("../lib/site-photos.ts");
const { DEFAULT_CONTENT } = await import("../lib/cms/defaults.ts");
const { sectionSpec } = await import("../lib/cms/admin-schema.ts");
const { validateSection } = await import("../lib/cms/validate.ts");
const editor = await import("../lib/cms/editor.ts");

/** The three the brief names. The other three collections follow the same rules. */
const NAMED = ["deep-wave-glam", "sleek-straight", "signature-bob"];
const SLUGS = COLLECTIONS.map((collection) => collection.slug);

const itemsOn = (view, slug) => findResolved(view, slug).items;
/** "deep-wave-middle-part" for /images/work/deep-wave-middle-part.jpg. */
const stems = (items) => items.map((item) => item.image.src.split("/").pop().replace(/\.[a-z]+$/, ""));

// ---------------------------------------------------------------- routing ---

test("each named style has its own page, and every collection its own address", () => {
  for (const slug of NAMED) {
    const collection = COLLECTIONS.find((candidate) => candidate.slug === slug);
    assert.ok(collection, `${slug} is not a collection`);
    assert.equal(collection.dimension, "style");
    assert.equal(collectionPath(slug), `/gallery/${slug}/`);
  }
  assert.equal(new Set(SLUGS.map(collectionPath)).size, SLUGS.length);
});

test("a style's Book opens its own page at the scheduler, never another style's or /book/", () => {
  for (const slug of SLUGS) {
    const target = collectionBookingTarget(slug);
    assert.deepEqual(target, { href: `/gallery/${slug}/#${COLLECTION_BOOKING_ANCHOR}` }, slug);
    // The Book button at the top of the page jumps down it without reloading.
    assert.deepEqual(collectionBookingTarget(slug, { onPage: true }), { href: `#${COLLECTION_BOOKING_ANCHOR}` });
  }
  const hrefs = SLUGS.map((slug) => collectionBookingTarget(slug).href);
  assert.equal(new Set(hrefs).size, hrefs.length);
});

test("Book Your Chair still opens the whole menu at /book/", () => {
  assert.deepEqual(bookingTarget(), { href: "/book/" });
});

/**
 * Cloudflare Pages' _redirects, read the way Pages reads it: the first rule
 * whose source matches, a `:name` placeholder standing for one whole segment.
 */
function redirectFor(path) {
  const rules = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/\s+/));
  for (const [source, destination, status] of rules) {
    const names = [];
    const pattern = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:([a-z]+)/g, (_, name) => {
      names.push(name);
      return "([^/]+)";
    });
    const match = new RegExp(`^${pattern}$`).exec(path);
    if (!match) continue;
    const to = names.reduce((out, name, index) => out.replace(`:${name}`, match[index + 1]), destination);
    return { to, status };
  }
  return null;
}

test("the old /styles/ addresses land on the style pages in one hop, slash or no slash", () => {
  for (const slug of SLUGS) {
    for (const path of [`/styles/${slug}`, `/styles/${slug}/`]) {
      assert.deepEqual(redirectFor(path), { to: collectionPath(slug), status: "301" }, path);
    }
  }
  // The pages themselves are never redirected.
  for (const slug of SLUGS) assert.equal(redirectFor(collectionPath(slug)), null);
});

// ----------------------------------------------------------- photographs ---

test("each style page shows only its own published photographs, once each, in Nat's order", () => {
  const set = launchPhotoSet();
  const view = resolveSite(set);
  for (const slug of SLUGS) {
    const own = set.photos.filter((photo) => photo.published && photo.collections.includes(slug));
    assert.deepEqual(
      itemsOn(view, slug).map((item) => item.id),
      own.map((photo) => photo.id),
      slug,
    );
    assert.equal(new Set(own.map((photo) => photo.src)).size, own.length, `${slug} repeats a photograph`);
  }

  // What that is for the three named styles, frame by frame.
  assert.deepEqual(stems(itemsOn(view, "deep-wave-glam")), [
    "deep-wave-middle-part",
    "deep-wave-melted-part",
    "deep-wave-crimped-lengths",
    "deep-wave-braided-front",
    "deep-wave-long-layers",
    "deep-wave-shoulder-sweep",
  ]);
  // The three coloured units are tagged straight as well as colour.
  assert.deepEqual(stems(itemsOn(view, "sleek-straight")), [
    "straight-glass-finish",
    "straight-side-swoop",
    "straight-centre-part",
    "colour-pink-straight",
    "colour-blonde-straight",
    "colour-copper-centre-part",
  ]);
  assert.deepEqual(stems(itemsOn(view, "signature-bob")), [
    "bob-soft-lob",
    "bob-blunt-side-part",
    "bob-burgundy-curl",
  ]);
  // The homepage's opening photograph is in no collection, so on no style page.
  for (const slug of SLUGS) assert.ok(!stems(itemsOn(view, slug)).includes("deep-wave-front-swirl"), slug);
});

test("a photograph Nat hides leaves its style page, its count and its cover", () => {
  const set = launchPhotoSet();
  const before = findResolved(resolveSite(set), "deep-wave-glam");
  const hidden = before.cover.id;
  const after = findResolved(
    resolveSite({
      ...set,
      photos: set.photos.map((photo) => (photo.id === hidden ? { ...photo, published: false } : photo)),
    }),
    "deep-wave-glam",
  );
  assert.equal(after.items.length, before.items.length - 1);
  assert.ok(!after.items.some((item) => item.id === hidden));
  assert.equal(after.cover.id, after.items[0].id);
});

test("a photograph Nat tags with a style in the photo manager appears on that page, and only there", () => {
  const row = (fields) => ({
    id: "new-bob",
    src: "gallery/new-bob.webp",
    alt: "A chin-length bob, side parted",
    title: "New Bob",
    caption: null,
    width: 1200,
    height: 1600,
    install_type: null,
    active: true,
    display_order: 20,
    created_at: "2026-10-10T12:00:00Z",
    focal_position: null,
    featured: false,
    finish_attributes: [],
    primary_collection: "signature-bob",
    gallery_item_categories: [{ gallery_categories: { slug: "signature-bob" } }],
    site_photo_slots: [],
    cover_of: [],
    second_of: [],
    ...fields,
  });
  const view = resolveSite(
    photoSetFromRows([
      row({}),
      row({ id: "hidden-bob", src: "gallery/hidden-bob.webp", active: false }),
      row({ id: "untagged", src: "gallery/untagged.webp", primary_collection: null, gallery_item_categories: [] }),
    ]),
  );
  assert.deepEqual(itemsOn(view, "signature-bob").map((item) => item.id), ["new-bob"]);
  for (const slug of SLUGS.filter((slug) => slug !== "signature-bob")) {
    assert.deepEqual(itemsOn(view, slug), [], slug);
  }
});

// ------------------------------------------------------------- the words ---

test("the steps beside the scheduler name the style and leave no placeholder behind", () => {
  for (const collection of COLLECTIONS) {
    const steps = COLLECTION_PAGE.booking.steps(collection.title);
    assert.equal(steps.length, 3);
    assert.ok(steps.some((step) => step.includes(collection.title)), collection.slug);
    for (const step of steps) {
      assert.doesNotMatch(step, /\{[^}]*\}/);
      assert.doesNotMatch(step, /[\u2013\u2014]/, "no en or em dashes in copy");
    }
  }
});

test("the dashboard takes {style} in the booking steps and refuses what it cannot fill", () => {
  const places = editor.placesFor(DEFAULT_CONTENT.locations);
  const check = (gallery) => validateSection(sectionSpec("gallery"), gallery, { places }).errors;
  const gallery = structuredClone(DEFAULT_CONTENT.gallery);

  gallery.bookingStep1 = "Tap {service} for {style}.";
  assert.match(check(gallery).bookingStep1, /\{service\}/);
  gallery.bookingStep1 = "Tap your install, then tell Nat it is {Style}.";
  assert.equal(check(gallery).bookingStep1, undefined);
  gallery.bookingStep3 = " ";
  assert.match(check(gallery).bookingStep3, /Fill this in/);

  // The preview reads as a sentence, not with a raw {style} in it.
  assert.match(editor.previewText(DEFAULT_CONTENT.gallery.bookingStep3, places), /Deep Wave Glam/);
});
