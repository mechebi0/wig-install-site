// Run with: npm test
//
// How published content becomes the content the site is built with
// (lib/cms/model.ts): whatever a release holds, the result has the shape of
// DEFAULT_CONTENT, every value checked, and the locations written once.
import assert from "node:assert/strict";
import test from "node:test";
import "./helpers/alias.mjs";

const { CONTENT_RULES, DEFAULT_CONTENT } = await import("../lib/cms/defaults.ts");
const {
  fillPlaceholders,
  findPlaceholders,
  joinPlaces,
  mergeContent,
  normalizeLocations,
  normalizeText,
  readPublished,
  resolveContent,
} = await import("../lib/cms/model.ts");

const resolve = (raw) => resolveContent(raw, DEFAULT_CONTENT, CONTENT_RULES);

test("nothing published: the launch words, with the locations filled in", () => {
  const { content, places } = resolve(undefined);
  assert.equal(places.current, "Towson, MD");
  assert.equal(places.other, "Laurel, MD");
  assert.equal(places.all, "Towson and Laurel, MD");
  assert.equal(
    content.header.closing.body,
    "One client at a time, currently in Towson, MD, also serving Laurel, MD. Send a request and Nat comes back to you with two or three slots.",
  );
  assert.equal(content.seo.titleTagline, "Lace wig installs in Towson, MD");
  assert.equal(content.faq.items.length, DEFAULT_CONTENT.faq.items.length);
  // Everything that holds no placeholder is untouched.
  assert.equal(content.header.cta.book, DEFAULT_CONTENT.header.cta.book);
  assert.deepEqual(content.services, DEFAULT_CONTENT.services);
});

test("a value of the wrong type takes the default", () => {
  const { content } = resolve({ business: { name: 42, phone: null }, faq: { draft: "no" }, services: { heading: ["x"] } });
  assert.equal(content.business.name, "Crowned by Nat");
  assert.equal(content.business.phone, "");
  assert.equal(content.faq.draft, true);
  assert.equal(content.services.heading, DEFAULT_CONTENT.services.heading);
});

test("required text cannot be emptied; optional text can", () => {
  const { content } = resolve({ header: { cta: { book: "   " }, footer: { tagline: "" } }, book: { lede: "" } });
  assert.equal(content.header.cta.book, "Book Your Chair");
  assert.equal(content.header.footer.tagline, "");
  assert.equal(content.book.lede, "");
});

test("links: only https/http web addresses and the site's own pages survive", () => {
  for (const bad of ["javascript:alert(1)", "data:text/html,hi", "ftp://example.com/", "https://", "not a url"]) {
    assert.equal(resolve({ seo: { instagram: bad } }).content.seo.instagram, DEFAULT_CONTENT.seo.instagram, bad);
  }
  assert.equal(resolve({ seo: { instagram: "" } }).content.seo.instagram, "");
  assert.equal(
    resolve({ seo: { instagram: "https://www.instagram.com/someone/" } }).content.seo.instagram,
    "https://www.instagram.com/someone/",
  );
  assert.equal(resolve({ home: { installs: { linkTo: "/evil/" } } }).content.home.installs.linkTo, "/book/");
  assert.equal(resolve({ home: { installs: { linkTo: "https://evil.example/" } } }).content.home.installs.linkTo, "/book/");
  assert.equal(resolve({ home: { installs: { linkTo: "/gallery/" } } }).content.home.installs.linkTo, "/gallery/");
});

test("prices and lengths: in range, whole numbers", () => {
  const items = (patch) =>
    resolve({ services: { items: [{ id: "frontal-install", ...patch }] } }).content.services.items.find(
      (item) => item.id === "frontal-install",
    );
  assert.equal(items({ price: -5 }).price, 10000);
  assert.equal(items({ price: 1e9 }).price, 10000);
  assert.equal(items({ price: Number.NaN }).price, 10000);
  assert.equal(items({ price: 9550.4 }).price, 9550);
  assert.equal(items({ minutes: 601 }).minutes, 120);
  assert.equal(items({ minutes: 0 }).minutes, 0);
});

test("services: Nat's order, unknown and repeated ids dropped, missing ones put back", () => {
  const { content } = resolve({
    services: {
      items: [
        { id: "wig-touch-up", name: "Touch Up", price: 4000, minutes: 30, description: "x", active: false },
        { id: "made-up", name: "Invented", price: 1, minutes: 15, description: "", active: true },
        { id: "closure-install" },
        { id: "wig-touch-up", name: "Second copy" },
      ],
    },
  });
  const ids = content.services.items.map((item) => item.id);
  assert.deepEqual(ids, [
    "wig-touch-up",
    "closure-install",
    "frontal-install",
    "frontal-reinstall",
    "closure-reinstall",
    "color-frontal-install",
    "color-closure-install",
  ]);
  assert.equal(content.services.items[0].name, "Touch Up");
  assert.equal(content.services.items[0].active, false);
  // A partial entry keeps its defaults for what it does not say.
  assert.equal(content.services.items[1].name, "Closure Install");
});

test("free lists: incomplete items are dropped, the limit is kept, an empty list stays empty", () => {
  const faq = (items) => resolve({ faq: { items } }).content.faq.items;
  assert.deepEqual(faq([{ question: "Q?", answer: "" }, { question: "Real?", answer: "Yes." }, "junk"]), [
    { question: "Real?", answer: "Yes." },
  ]);
  assert.equal(faq(Array.from({ length: 40 }, (_, i) => ({ question: `Q${i}?`, answer: "A." }))).length, 30);
  assert.deepEqual(faq([]), []);
  assert.deepEqual(resolve({ meetNat: { credentials: ["One", "", 7, "Two"] } }).content.meetNat.credentials, ["One", "Two"]);
  assert.deepEqual(resolve({ reviews: { items: [] } }).content.reviews.items, []);
});

test("text is stored tidy: line breaks kept, the rest cleaned", () => {
  assert.equal(normalizeText("  One\r\nTwo  \r\n\r\n\r\n\r\nThree\u0007  "), "One\nTwo\n\nThree");
  assert.equal(normalizeText("x".repeat(6000)).length, 5000);
  const { content } = resolve({ faq: { items: [{ question: "Q?", answer: "Line one.\r\nLine two." }] } });
  assert.equal(content.faq.items[0].answer, "Line one.\nLine two.");
});

test("locations: the current one must be switched on", () => {
  const place = (id, name, active) => ({ id, name, region: "MD", description: "", notice: "", active });
  const towson = place("towson", "Towson", true);
  const laurel = place("laurel", "Laurel", true);

  let result = resolve({ locations: { primary: "laurel", items: [towson, laurel] } });
  assert.equal(result.places.current, "Laurel, MD");
  assert.equal(result.places.other, "Towson, MD");
  assert.equal(result.content.locations.primary, "laurel");

  // The chosen one is off: the first that is on stands in.
  result = resolve({ locations: { primary: "laurel", items: [towson, { ...laurel, active: false }] } });
  assert.equal(result.places.current, "Towson, MD");
  assert.equal(result.places.other, "");

  // Everything off: no current location, and copy that names one reads empty.
  result = resolve({ locations: { primary: "towson", items: [{ ...towson, active: false }] } });
  assert.equal(result.places.primary, null);
  assert.equal(result.places.current, "");
  assert.equal(result.content.locations.primary, "");
  assert.deepEqual(result.places.active, []);

  // Different states keep their own.
  result = resolve({
    locations: { primary: "towson", items: [towson, laurel, { ...place("alex", "Alexandria", true), region: "VA" }] },
  });
  assert.equal(result.places.other, "Laurel, MD and Alexandria, VA");
});

test("locations: ids are made unique and safe", () => {
  const normal = normalizeLocations({
    primary: "x",
    items: [
      { id: "Bad Id!", name: "Ellicott City", region: "MD", description: "", notice: "", active: true },
      { id: "", name: "Ellicott City", region: "MD", description: "", notice: "", active: true },
    ],
  });
  assert.deepEqual(
    normal.items.map((item) => item.id),
    ["ellicott-city", "ellicott-city-2"],
  );
  assert.equal(normal.primary, "ellicott-city");
});

test("joinPlaces says a shared state once", () => {
  assert.equal(joinPlaces([]), "");
  assert.equal(joinPlaces([{ name: "Towson", region: "MD" }]), "Towson, MD");
  assert.equal(
    joinPlaces([
      { name: "Towson", region: "MD" },
      { name: "Laurel", region: "MD" },
      { name: "Columbia", region: "MD" },
    ]),
    "Towson, Laurel and Columbia, MD",
  );
});

test("placeholders: any case and spacing, unknown ones left alone", () => {
  assert.deepEqual(findPlaceholders("In {current location} and { Other Locations }. {service}"), [
    "current location",
    "other locations",
    "service",
  ]);
  assert.equal(
    fillPlaceholders("In {Current Location}, not {nowhere}.", { "current location": "Towson, MD" }),
    "In Towson, MD, not {nowhere}.",
  );
});

test("location placeholders are filled everywhere except in the locations and the links", () => {
  const { content } = resolve({
    locations: {
      primary: "towson",
      items: [
        { id: "towson", name: "Towson", region: "MD", description: "Near {current location}", notice: "", active: true },
      ],
    },
    faq: { items: [{ question: "Where?", answer: "In {current location}." }] },
  });
  assert.equal(content.faq.items[0].answer, "In Towson, MD.");
  assert.equal(content.locations.items[0].description, "Near {current location}");
});

test("a release that is not a release is ignored", () => {
  assert.equal(readPublished(undefined), null);
  assert.equal(readPublished(""), null);
  assert.equal(readPublished("{not json"), null);
  assert.equal(readPublished(JSON.stringify({ release: "7", publishedAt: "x", content: {} })), null);
  assert.equal(readPublished(JSON.stringify({ release: 7, publishedAt: "x", content: [] })), null);
  assert.deepEqual(readPublished(JSON.stringify({ release: 7, publishedAt: "x", content: { a: 1 } })), {
    release: 7,
    publishedAt: "x",
    content: { a: 1 },
  });
});

test("whatever comes in, the shape of the defaults comes out", () => {
  // Every key and every type, with lists counted as lists (their length may change).
  const shape = (value) => {
    if (Array.isArray(value)) return "array";
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
    }
    return typeof value;
  };
  const junk = [null, 7, "x", [], { business: [] }, { header: { cta: null, nav: 3 } }, { home: { sections: "no" } }];
  for (const raw of junk) {
    assert.deepEqual(shape(mergeContent(DEFAULT_CONTENT, raw, CONTENT_RULES)), shape(DEFAULT_CONTENT), JSON.stringify(raw));
  }
  // And with junk inside the lists, each item still has its template's shape.
  const merged = mergeContent(DEFAULT_CONTENT, { home: { slides: [null, 3, { id: "bob", headline: 9 }] } }, CONTENT_RULES);
  assert.deepEqual(merged.home.slides.map(shape), DEFAULT_CONTENT.home.slides.map(shape));
  assert.equal(merged.home.slides.length, DEFAULT_CONTENT.home.slides.length);
});
