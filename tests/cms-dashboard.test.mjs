// Run with: npm test
//
// The dashboard's side of the content manager: its map of every field
// (lib/cms/admin-schema.ts) agrees with the content itself, what it refuses
// to save and what it only warns about (lib/cms/validate.ts), how it lists
// changes before publishing (lib/cms/diff.ts), its small helpers
// (lib/cms/editor.ts), and what it says about the website (lib/cms/phase.ts).
import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/alias.mjs";

const { DEFAULT_CONTENT, FREE_LISTS, REQUIRED_TEXT, SECTION_KEYS } = await import("../lib/cms/defaults.ts");
const { matchesPath } = await import("../lib/cms/model.ts");
const { SECTION_SPECS, sectionSpec, PANEL_SECTIONS, CONTENT_TABS } = await import("../lib/cms/admin-schema.ts");
const { validateSection, fieldId, hasSampleReviews } = await import("../lib/cms/validate.ts");
const { diffSection } = await import("../lib/cms/diff.ts");
const editor = await import("../lib/cms/editor.ts");
const { publishPhase, REBUILD_PATIENCE_MS } = await import("../lib/cms/phase.ts");

const clone = (value) => structuredClone(value);
const places = editor.placesFor(DEFAULT_CONTENT.locations);
const check = (key, value, context = { places }) => validateSection(sectionSpec(key), value, context);

// ------------------------------------------------------- the field map ---

/**
 * Every field in a spec, as [path, field, insideFreeList], with list items
 * described once by their template rather than per item.
 */
function specFields(fields, prefix, out = [], inList = false) {
  for (const field of fields) {
    const path = prefix ? `${prefix}.${field.key}` : field.key;
    out.push([path, field, inList]);
    if (field.kind === "group") specFields(field.fields, path, out, inList);
    if (field.kind === "record") for (const entry of field.entries) specFields(entry.fields, `${path}.${entry.key}`, out, inList);
    if (field.kind === "fixed" || field.kind === "keyed") specFields(field.fields, `${path}.*`, out, inList);
    if (field.kind === "list") specFields(field.fields, `${path}.*`, out, true);
  }
  return out;
}

/** Every leaf of a default value, with list items as "*". */
function leaves(value, prefix, out = []) {
  if (Array.isArray(value)) {
    const sample = value[0];
    if (sample !== undefined && typeof sample === "object") {
      for (const key of Object.keys(sample)) if (key !== "id") leaves(sample[key], `${prefix}.*.${key}`, out);
    } else out.push(prefix);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) leaves(item, prefix ? `${prefix}.${key}` : key, out);
  } else out.push(prefix);
  return out;
}

test("there is a form for every section, and a section for every form", () => {
  assert.deepEqual(
    SECTION_SPECS.map((spec) => spec.key).sort(),
    [...SECTION_KEYS].sort(),
  );
  const onPanels = Object.values(PANEL_SECTIONS).flat();
  for (const key of SECTION_KEYS) assert.ok(onPanels.includes(key), `${key} is on no dashboard panel`);
  for (const key of CONTENT_TABS) assert.ok(SECTION_KEYS.includes(key));
});

test("every word on the site has a field, and every field has a word", () => {
  for (const spec of SECTION_SPECS) {
    const fields = specFields(spec.groups.flatMap((group) => group.fields), "");
    const editable = new Set(fields.filter(([, field]) => !["group", "record", "fixed", "keyed"].includes(field.kind)).map(([path]) => path));
    // A list of plain lines (the points under the biography) is its own leaf.
    for (const [path, field] of fields) if (field.kind === "list" && field.fields.length === 0) editable.add(path);
    const words = new Set(leaves(DEFAULT_CONTENT[spec.key], ""));
    for (const path of words) assert.ok(editable.has(path) || editable.has(path.replace(/\.\*$/, "")), `${spec.key}.${path} has no field`);
    for (const path of editable) {
      if (path.endsWith(".*")) continue;
      assert.ok(words.has(path) || [...words].some((word) => word.startsWith(`${path}.`)) || path === "primary", `${spec.key}.${path} is a field with no content`);
    }
  }
});

test("each field's kind matches the value it edits", () => {
  const at = (value, path) =>
    path.split(".").reduce((node, part) => (part === "*" ? (Array.isArray(node) ? node[0] : node) : node?.[part]), value);
  for (const spec of SECTION_SPECS) {
    for (const [path, field] of specFields(spec.groups.flatMap((group) => group.fields), "")) {
      const value = at(DEFAULT_CONTENT[spec.key], path);
      const where = `${spec.key}.${path}`;
      if (["text", "textarea", "email", "phone", "url", "page", "primaryLocation"].includes(field.kind)) {
        assert.equal(typeof value, "string", where);
      } else if (field.kind === "toggle") assert.equal(typeof value, "boolean", where);
      else if (field.kind === "price" || field.kind === "minutes") assert.equal(typeof value, "number", where);
      else if (field.kind === "fixed") assert.equal(value.length, field.itemTitles.length, where);
      else if (field.kind === "keyed") assert.ok(value.every((item) => typeof item.id === "string"), where);
      else if (field.kind === "list") assert.ok(FREE_LISTS[`${spec.key}.${path}`], `${where} is not a free list in lib/cms/defaults.ts`);
      else if (field.kind === "record") assert.deepEqual(field.entries.map((entry) => entry.key), Object.keys(value), where);
    }
  }
});

test("a heading the dashboard requires can never be emptied by the build either", () => {
  for (const spec of SECTION_SPECS) {
    for (const [path, field, inList] of specFields(spec.groups.flatMap((group) => group.fields), "")) {
      if (inList || !["text", "textarea"].includes(field.kind) || !field.required) continue;
      const full = `${spec.key}.${path}`;
      assert.ok(
        REQUIRED_TEXT.some((pattern) => matchesPath(full, pattern)),
        `${full} is required in the dashboard but not in REQUIRED_TEXT`,
      );
    }
  }
  // And no stale pattern: each names at least one field that exists.
  const all = SECTION_SPECS.flatMap((spec) =>
    specFields(spec.groups.flatMap((group) => group.fields), "").map(([path]) => `${spec.key}.${path}`),
  );
  for (const pattern of REQUIRED_TEXT) {
    assert.ok(all.some((path) => matchesPath(path, pattern) || matchesPath(path.replace(/\.\*/g, ".x"), pattern)), pattern);
  }
});

test("the launch words pass every check", () => {
  for (const key of SECTION_KEYS) {
    const { errors } = check(key, clone(DEFAULT_CONTENT[key]));
    assert.deepEqual(errors, {}, key);
  }
});

// ------------------------------------------------------------ the checks ---

test("refused: empty, too long, unknown placeholders", () => {
  const header = clone(DEFAULT_CONTENT.header);
  header.cta.book = "  ";
  header.nav.gallery = "x".repeat(25);
  header.closing.body = "We are in {current location}, see {nowhere}.";
  const { errors } = check("header", header);
  assert.match(errors["cta.book"], /Fill this in/);
  assert.match(errors["nav.gallery"], /24 characters or fewer/);
  assert.match(errors["closing.body"], /\{nowhere\} is not something/);

  const booking = clone(DEFAULT_CONTENT.serviceBooking);
  booking.step1 = "Tap {service} for {finish}.";
  assert.match(check("serviceBooking", booking).errors.step1, /\{finish\}/);
  booking.step1 = "Tap {Service}.";
  assert.equal(check("serviceBooking", booking).errors.step1, undefined);
});

test("refused: contact details that are not contact details", () => {
  const business = clone(DEFAULT_CONTENT.business);
  business.email = "crownedbynat";
  business.phone = "call me";
  const { errors } = check("business", business);
  assert.match(errors.email, /email address/);
  assert.match(errors.phone, /phone number/);
  business.email = "";
  assert.match(check("business", business).errors.email, /Fill in an email/);
  business.email = "a@b.co";
  business.phone = "(410) 555-0134";
  assert.deepEqual(check("business", business).errors, {});

  const seo = clone(DEFAULT_CONTENT.seo);
  for (const bad of ["javascript:alert(1)", "http://instagram.com/x", "https://evil.example/instagram.com"]) {
    seo.instagram = bad;
    assert.ok(check("seo", seo).errors.instagram, bad);
  }
  for (const good of ["", "https://www.instagram.com/crownedbynattt/", "https://instagram.com/x"]) {
    seo.instagram = good;
    assert.equal(check("seo", seo).errors.instagram, undefined, good);
  }
});

test("refused: prices and lengths that are not", () => {
  const services = clone(DEFAULT_CONTENT.services);
  services.items[0].price = null;
  services.items[1].minutes = 7;
  services.items[2].minutes = 1000;
  const { errors } = check("services", services);
  assert.match(errors["items.frontal-install.price"], /price in dollars/);
  assert.match(errors["items.closure-install.minutes"], /between 15 and 600/);
  assert.ok(errors["items.frontal-reinstall.minutes"]);
});

test("refused: two headings with one name; warned: nothing on the menu", () => {
  const services = clone(DEFAULT_CONTENT.services);
  services.categories.services = "Wig Installs";
  assert.match(check("services", services).errors["categories.services"], /own name/);
  const off = clone(DEFAULT_CONTENT.services);
  for (const item of off.items) item.active = false;
  const result = check("services", off);
  assert.deepEqual(result.errors, {});
  assert.match(result.warnings.items, /No service is on the menu/);
});

test("locations: duplicates refused, the current one must be on, all off is a warning", () => {
  const locations = clone(DEFAULT_CONTENT.locations);
  locations.items.push({ id: "location-3", name: " towson ", region: "md", description: "", notice: "", active: true });
  assert.match(check("locations", locations).errors["items.2.name"], /already on the list/);

  const off = clone(DEFAULT_CONTENT.locations);
  off.items[0].active = false;
  assert.match(check("locations", off).errors.primary, /switched on/);
  off.primary = "laurel";
  assert.deepEqual(check("locations", off).errors, {});

  const closed = clone(DEFAULT_CONTENT.locations);
  for (const item of closed.items) item.active = false;
  const result = check("locations", closed, { places: editor.placesFor(closed) });
  assert.deepEqual(result.errors, {});
  assert.match(result.warnings.primary, /between studios/);
});

test("warned: a placeholder with nothing to fill it", () => {
  const solo = clone(DEFAULT_CONTENT.locations);
  solo.items = solo.items.filter((item) => item.id === "towson");
  const { warnings, errors } = check("header", clone(DEFAULT_CONTENT.header), { places: editor.placesFor(solo) });
  assert.deepEqual(errors, {});
  assert.match(warnings["closing.body"], /\{other locations\} would show nothing/);
});

test("reviews: the sample notice stays while the samples do", () => {
  const reviews = clone(DEFAULT_CONTENT.reviews);
  reviews.placeholder = false;
  assert.ok(hasSampleReviews(reviews.items));
  assert.match(check("reviews", reviews).errors.placeholder, /sample reviews/);
  reviews.items = [{ quote: "Best install I have had.", name: "Jasmine R.", role: "" }];
  assert.deepEqual(check("reviews", reviews).errors, {});
});

test("lists: limits and empty items", () => {
  const faq = clone(DEFAULT_CONTENT.faq);
  faq.items = [];
  assert.match(check("faq", faq).errors.items, /at least 1/);
  faq.items = [{ question: "", answer: "An answer." }];
  assert.match(check("faq", faq).errors["items.0.question"], /Fill this in/);
  const meet = clone(DEFAULT_CONTENT.meetNat);
  meet.credentials = ["", "Fine"];
  assert.match(check("meetNat", meet).errors["credentials.0"], /Fill this in/);
});

test("a field's error is attached to the control the form draws", () => {
  assert.equal(fieldId("services", "items.frontal-install.price"), "cms-services-items_frontal-install_price");
  assert.equal(fieldId("faq", "items.0.answer"), "cms-faq-items_0_answer");
});

// ------------------------------------------------------------ the review ---

test("the review lists what changed, in Nat's words", () => {
  const before = clone(DEFAULT_CONTENT.services);
  const after = clone(DEFAULT_CONTENT.services);
  after.items[0].price = 11000;
  after.items[6].active = false;
  after.items.reverse();
  after.intro = "New sentence.";
  const changes = diffSection(sectionSpec("services"), before, after);
  const find = (label) => changes.find((change) => change.label === label);

  assert.deepEqual(find("Frontal Install · Price"), { label: "Frontal Install · Price", before: "$100", after: "$110", square: true });
  assert.equal(find("Wig Touch Up · On the menu").after, "Not offered");
  assert.equal(find("Wig Touch Up · On the menu").square, true);
  assert.ok(find("Services · Order"));
  assert.equal(find("Menu introduction").after, "New sentence.");
  assert.equal(find("Menu introduction").square, undefined);

  const faqAfter = clone(DEFAULT_CONTENT.faq);
  faqAfter.items.push({ question: "New?", answer: "Yes." });
  faqAfter.draft = false;
  const faqChanges = diffSection(sectionSpec("faq"), DEFAULT_CONTENT.faq, faqAfter);
  assert.ok(faqChanges.some((change) => change.label === "Question 11 · Added" && change.after === "New?"));
  assert.ok(faqChanges.some((change) => change.label === "Show the draft notice" && change.after === "Answers confirmed"));

  assert.deepEqual(diffSection(sectionSpec("home"), DEFAULT_CONTENT.home, clone(DEFAULT_CONTENT.home)), []);
});

test("the review names the current location, not its id", () => {
  const after = clone(DEFAULT_CONTENT.locations);
  after.primary = "laurel";
  const changes = diffSection(sectionSpec("locations"), DEFAULT_CONTENT.locations, after);
  assert.deepEqual(changes, [{ label: "Current location", before: "Towson, MD", after: "Laurel, MD" }]);
});

// ------------------------------------------------------------- helpers ---

test("prices and lengths as typed", () => {
  assert.equal(editor.parseDollars("95"), 9500);
  assert.equal(editor.parseDollars("$1,200.50"), 120050);
  assert.equal(editor.parseDollars("95.5"), 9550);
  for (const bad of ["", "95.", "abc", "-5", "9.999", "1234567"]) assert.equal(editor.parseDollars(bad), null, bad);
  assert.equal(editor.dollarsText(9500), "95");
  assert.equal(editor.dollarsText(9550), "95.50");
  assert.equal(editor.parseMinutes("120"), 120);
  assert.equal(editor.parseMinutes("1.5"), null);
  assert.equal(editor.parseMinutes(""), null);
});

test("editor helpers", () => {
  assert.equal(editor.nextLocationId([{ id: "towson" }, { id: "location-3" }]), "location-4");
  assert.equal(editor.nextLocationId([{ id: "location-2" }]), "location-3");
  assert.deepEqual(editor.tidy({ a: " x \r\n", b: [" y "], c: 3, d: true }), { a: "x", b: ["y"], c: 3, d: true });
  assert.equal(editor.previewText("In {current location}, book {service}.", places), "In Towson, MD, book Frontal Install.");
  assert.ok(editor.same({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }));
  assert.ok(!editor.same({ a: 1 }, { a: 2 }));
  assert.equal(editor.studioTime("2026-10-09T19:04:00Z"), "Oct 9, 2026, 3:04 PM");
  // A section rebuilt from a draft that lacks newer fields still has them.
  assert.deepEqual(Object.keys(editor.sectionFrom("faq", { heading: "Q" })), Object.keys(DEFAULT_CONTENT.faq));
});

// --------------------------------------------------------- publish state ---

const status = (over = {}) => ({
  release: 5,
  published_at: "2026-10-09T18:00:00Z",
  drafts: 0,
  auto_publish: true,
  last_rebuild: { release: 5, requested_at: "2026-10-09T18:00:00Z", outcome: "requested", response: null },
  ...over,
});
const at = (minutes) => Date.parse("2026-10-09T18:00:00Z") + minutes * 60_000;
const live = (release) => ({ release, publishedAt: "", builtAt: "2026-10-09T18:04:00Z" });

test("what the Website card says", () => {
  assert.deepEqual(publishPhase(status({ release: null, last_rebuild: null }), null, at(1)), { kind: "never" });
  assert.equal(publishPhase(status(), live(5), at(4)).kind, "live");
  assert.equal(publishPhase(status(), live(4), at(3)).kind, "publishing");
  assert.equal(publishPhase(status(), null, at(3)).kind, "publishing");
  assert.equal(publishPhase(status(), live(4), at(REBUILD_PATIENCE_MS / 60_000 + 1)).kind, "failed");
  assert.equal(
    publishPhase(status({ last_rebuild: { release: 5, requested_at: "2026-10-09T18:00:00Z", outcome: "requested", response: { status_code: 404, timed_out: false, error: null } } }), live(4), at(1)).kind,
    "failed",
  );
  assert.equal(
    publishPhase(status({ last_rebuild: { release: 5, requested_at: "2026-10-09T18:00:00Z", outcome: "requested", response: { status_code: 200, timed_out: false, error: null } } }), live(4), at(1)).kind,
    "publishing",
  );
  assert.equal(publishPhase(status({ last_rebuild: { release: 5, requested_at: "x", outcome: "unavailable", response: null } }), live(4), at(1)).kind, "failed");
  assert.deepEqual(publishPhase(status({ auto_publish: false, last_rebuild: { release: 5, requested_at: "x", outcome: "not_configured", response: null } }), live(4), at(1)), {
    kind: "waiting",
    release: 5,
    canAsk: false,
  });
  // Published before automatic updates were switched on: the card offers to ask.
  assert.deepEqual(publishPhase(status({ last_rebuild: { release: 4, requested_at: "x", outcome: "requested", response: null } }), live(4), at(1)), {
    kind: "waiting",
    release: 5,
    canAsk: true,
  });
});
