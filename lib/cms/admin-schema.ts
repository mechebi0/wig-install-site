import type { SectionKey } from "@/lib/cms/defaults";

/**
 * THE DASHBOARD'S MAP OF THE WEBSITE: every field Nat can edit, what it is
 * called, where it shows, and what it may hold.
 *
 * One SectionSpec per top-level key of DEFAULT_CONTENT (lib/cms/defaults.ts),
 * whose shape it follows field for field; tests/cms-schema.test.mjs checks the
 * two agree, so a field cannot exist on one side only. The dashboard renders
 * every form from this file (components/admin/cms/fields.tsx), validates with
 * it (lib/cms/validate.ts), and labels the review of changes with it.
 *
 * Only the dashboard imports this file, so none of these labels reach a
 * visitor's browser.
 *
 * Wording rules for labels and help: Nat's words, not a developer's. Say
 * where a thing shows on the site. Never mention JSON, keys or databases.
 */

/** Placeholders some texts fill in per page, beyond the location ones every text may use. */
export type Placeholder = "service" | "finish" | "install type";

type Base = {
  key: string;
  label: string;
  help?: string;
};

export type TextSpec = Base & {
  kind: "text" | "textarea";
  max: number;
  required?: boolean;
  rows?: number;
  /** Per-page placeholders this text may use, e.g. {service}. */
  placeholders?: Placeholder[];
};

export type FieldSpec =
  | TextSpec
  | (Base & { kind: "email"; required?: boolean })
  | (Base & { kind: "phone" })
  | (Base & { kind: "url"; host?: string })
  | (Base & { kind: "page" })
  | (Base & { kind: "toggle"; on: string; off: string })
  | (Base & { kind: "price" })
  | (Base & { kind: "minutes" })
  | (Base & { kind: "primaryLocation" })
  | (Base & { kind: "group"; fields: FieldSpec[] })
  | (Base & {
      kind: "record";
      /** Fixed keys, each an object with the same fields. */
      entries: { key: string; title: string; fields: FieldSpec[] }[];
    })
  | (Base & {
      kind: "fixed";
      /** A fixed number of items, edited in place. */
      itemTitles: string[];
      fields: FieldSpec[];
    })
  | (Base & {
      kind: "keyed";
      /** Fixed ids that Nat may reorder. */
      fields: FieldSpec[];
      titleOf: (item: Record<string, unknown>) => string;
      reorder: boolean;
    })
  | (Base & {
      kind: "list";
      /** Nat adds, removes and reorders. `fields` empty: each item is one line of text. */
      fields: FieldSpec[];
      itemName: string;
      addLabel: string;
      min: number;
      max: number;
      itemMax?: number;
      titleOf: (item: unknown, index: number) => string;
    });

export type SectionGroup = { title: string; help?: string; fields: FieldSpec[] };

export type SectionSpec = {
  key: SectionKey;
  title: string;
  /** One or two sentences: what this section changes on the site. */
  intro: string;
  groups: SectionGroup[];
};

// ------------------------------------------------------------- shorthands ---

const text = (key: string, label: string, max: number, extra: Partial<TextSpec> = {}): TextSpec => ({
  kind: "text",
  key,
  label,
  max,
  required: true,
  ...extra,
});

const area = (key: string, label: string, max: number, extra: Partial<TextSpec> = {}): TextSpec => ({
  kind: "textarea",
  key,
  label,
  max,
  required: true,
  rows: 3,
  ...extra,
});

/** Kicker, title and lede: the opening of an inner page. */
const pageOpening = (where: string): FieldSpec[] => [
  text("kicker", "Small label above the title", 40, { help: `The short word over the page title on ${where}.` }),
  text("title", "Page title", 90, { help: "The large heading at the top of the page." }),
  area("lede", "Introduction", 400, { help: "The sentence under the title.", required: false }),
];

const SQUARE_NOTE =
  "Square Appointments takes the actual booking and shows its own price and length. Changing it here does not change Square: update the service in Square too, so they match.";

// --------------------------------------------------------------- sections ---

export const SECTION_SPECS: SectionSpec[] = [
  {
    key: "business",
    title: "Business information",
    intro: "Your studio's name and how clients reach you. Used in the footer, the booking page, search results and link previews.",
    groups: [
      {
        title: "Your business",
        fields: [
          text("name", "Business name", 60, { help: "Shown in page titles, the footer and link previews." }),
          text("owner", "Your name", 40, { help: "Used in search results and link previews, for example \"performed personally by Nat\"." }),
        ],
      },
      {
        title: "Contact",
        help: "Every \"Reach Nat\" link uses the phone number if there is one, and the email if not.",
        fields: [
          {
            kind: "email",
            key: "email",
            label: "Contact email",
            required: true,
            help: "Where clients' emails go. This does not change the email you sign in with.",
          },
          { kind: "phone", key: "phone", label: "Phone number", help: "Optional. Leave empty to show the email instead." },
          {
            kind: "textarea",
            key: "street",
            label: "Studio address",
            max: 200,
            rows: 2,
            help: "Optional. Shown in the footer above your locations. Leave empty to name the towns only.",
          },
        ],
      },
      {
        title: "Booking hours",
        help: "Shown as \"Booking hours\" beside the scheduler on the booking page. Square decides which times can actually be booked.",
        fields: [
          {
            kind: "list",
            key: "hours",
            label: "Hours",
            itemName: "line",
            addLabel: "Add a line of hours",
            min: 0,
            max: 7,
            fields: [
              text("days", "Days", 60, { help: "For example \"Tuesday to Saturday\"." }),
              text("time", "Hours", 60, { required: false, help: "For example \"10:00 AM – 9:00 PM\"." }),
            ],
            titleOf: (item) => ((item as { days?: string }).days || "New line of hours"),
          },
        ],
      },
    ],
  },

  {
    key: "locations",
    title: "Locations",
    intro: "Where you take appointments. Your current location is named first everywhere: the announcement bar, the footer, the booking page, search results and any text that uses {current location}.",
    groups: [
      {
        title: "Current location",
        help: "Only a location that is switched on can be the current one. Adding a location does not make it current.",
        fields: [{ kind: "primaryLocation", key: "primary", label: "Current location" }],
      },
      {
        title: "All locations",
        help: "Switch a location off to stop the website mentioning it without deleting it. The order here is the order the website lists them in after the current one.",
        fields: [
          {
            kind: "list",
            key: "items",
            label: "Locations",
            itemName: "location",
            addLabel: "Add a location",
            min: 0,
            max: 12,
            fields: [
              text("name", "Town or area", 60, { help: "For example \"Towson\"." }),
              text("region", "State", 30, { help: "For example \"MD\"." }),
              { kind: "toggle", key: "active", label: "Taking appointments here", on: "Shown on the website", off: "Hidden" },
              area("description", "Short description", 200, {
                required: false,
                rows: 2,
                help: "Optional. Shown under the town on the booking page, for example \"Private suite near Towson Town Center\".",
              }),
              area("notice", "Instructions or notice", 300, {
                required: false,
                rows: 2,
                help: "Optional. Shown under the town on the booking page, for example parking or arrival instructions.",
              }),
            ],
            titleOf: (item) => {
              const place = item as { name?: string; region?: string };
              return place.name ? `${place.name}${place.region ? `, ${place.region}` : ""}` : "New location";
            },
          },
        ],
      },
    ],
  },

  {
    key: "services",
    title: "Services & pricing",
    intro: "The service menu on the booking page and each service's own booking page. Square Appointments takes the booking itself: price or name changes here must be made in Square too.",
    groups: [
      {
        title: "The menu",
        fields: [
          text("heading", "Menu heading", 90, { help: "The heading over the services on the booking page." }),
          area("intro", "Menu introduction", 300, { required: false, help: "The sentence under that heading. Optional." }),
        ],
      },
      {
        title: "Services",
        help: `Drag order with the arrows. Switch a service off to take it off the menu; its booking page stays and says it is not on the menu. ${SQUARE_NOTE}`,
        fields: [
          {
            kind: "keyed",
            key: "items",
            label: "Services",
            reorder: true,
            titleOf: (item) => String(item.name ?? ""),
            fields: [
              text("name", "Service name", 60, { help: "Use the same name as in Square, so clients can find it in the scheduler." }),
              { kind: "price", key: "price", label: "Price", help: "In dollars, for example 100 or 95.50." },
              {
                kind: "minutes",
                key: "minutes",
                label: "Length shown on the menu",
                help: "In minutes, for example 120 for 2 hours. 0 shows no length. Square sets the real appointment length.",
              },
              area("description", "Description", 400),
              { kind: "toggle", key: "active", label: "On the menu", on: "Offered", off: "Not offered" },
            ],
          },
        ],
      },
      {
        title: "Menu headings",
        help: "The four headings the services are grouped under. Which service sits under which heading is fixed.",
        fields: [
          {
            kind: "group",
            key: "categories",
            label: "Headings",
            fields: [
              text("wig-installs", "Frontal Install and Closure Install", 40),
              text("reinstalls", "Frontal Reinstall and Closure Reinstall", 40),
              text("color-services", "Color Frontal Install and Color Closure Install", 40),
              text("services", "Wig Touch Up", 40),
            ],
          },
        ],
      },
      {
        title: "Finishes (styling add-ons)",
        help: "The finishes offered on each install page. In Square they are booked as the \"Styling\" add-on.",
        fields: [
          {
            kind: "record",
            key: "finishes",
            label: "Finishes",
            entries: (["curls", "wand-curls", "crimps"] as const).map((id, index) => ({
              key: id,
              title: ["Curls", "Wand Curls", "Crimps"][index],
              fields: [text("label", "Name", 30), area("description", "Description", 200, { rows: 2 })],
            })),
          },
        ],
      },
    ],
  },

  {
    key: "home",
    title: "Homepage",
    intro: "The slideshow's words, and the blocks under it. The slideshow photos are chosen in the photo manager.",
    groups: [
      {
        title: "Blocks under the slideshow",
        help: "Change their order with the arrows, or hide one. The slideshow always comes first.",
        fields: [
          {
            kind: "keyed",
            key: "sections",
            label: "Blocks",
            reorder: true,
            titleOf: (item) =>
              ({ installs: "Choose your install", collections: "The looks (collections)", featured: "Recent work" })[
                String(item.id)
              ] ?? String(item.id),
            fields: [{ kind: "toggle", key: "visible", label: "Shown on the homepage", on: "Shown", off: "Hidden" }],
          },
        ],
      },
      {
        title: "Slideshow",
        help: "Each slide's small label, headline and sentence. Headlines read best under about 40 characters, sentences under 90.",
        fields: [
          {
            kind: "keyed",
            key: "slides",
            label: "Slides",
            reorder: false,
            titleOf: (item) => String(item.label ?? ""),
            fields: [
              text("label", "Small label", 40),
              text("headline", "Headline", 80),
              area("description", "Sentence", 160, { rows: 2 }),
            ],
          },
        ],
      },
      ...(["installs", "collections", "featured"] as const).map((key) => ({
        title: { installs: "\"Choose your install\" block", collections: "\"The looks\" block", featured: "\"Recent work\" block" }[key],
        fields: [
          {
            kind: "group" as const,
            key,
            label: "",
            fields: [
              text("kicker", "Small label", 40),
              text("heading", "Heading", 90),
              area("body", "Sentence", 300, { required: false }),
              text("link", "Link text", 40),
              { kind: "page" as const, key: "linkTo", label: "Link goes to" },
            ],
          },
        ],
      })),
    ],
  },

  {
    key: "header",
    title: "Header, footer & buttons",
    intro: "Words on every page: the announcement bar, the menu, the buttons, the footer and the closing band.",
    groups: [
      {
        title: "Announcement bar",
        help: "The rose band at the very top. Your locations are added automatically after the first phrase.",
        fields: [
          {
            kind: "group",
            key: "announcement",
            label: "",
            fields: [
              text("lead", "Opening phrase", 40, { help: "Before your locations, for example \"Now booking\"." }),
              text("service", "What you do", 40, { help: "For example \"Lace wig installs\"." }),
              text("closedFirst", "When every location is off: first phrase", 80),
              text("closedSecond", "When every location is off: second phrase", 80),
            ],
          },
        ],
      },
      {
        title: "Menu",
        fields: [
          {
            kind: "group",
            key: "nav",
            label: "",
            fields: [
              text("home", "Home", 24),
              text("gallery", "Gallery", 24),
              text("beforeYouBook", "Before you book", 24),
              text("reviews", "Reviews", 24),
              text("meetNat", "Meet Nat", 24),
            ],
          },
        ],
      },
      {
        title: "Buttons",
        help: "Short is best: buttons do not wrap, so keep them to three words or so.",
        fields: [
          {
            kind: "group",
            key: "cta",
            label: "",
            fields: [
              text("book", "Main booking button", 30, { help: "In the menu, the slideshow, the footer and the closing band. It always opens the full booking page." }),
              text("bookService", "Word before a service's name", 16, { help: "On buttons such as \"Book Frontal Install\"." }),
              text("bookStyle", "Booking button on collection cards", 16),
              text("view", "Word before an install page's name", 16, { help: "On links such as \"View Frontal Install\"." }),
              text("bookThisStyle", "Booking button on a style collection's page", 30),
              text("bookThisFinish", "Booking button on the Natural Lace page", 30),
              text("gallery", "Gallery button in the slideshow", 30),
              text("collection", "Link on collection cards", 30),
            ],
          },
        ],
      },
      {
        title: "Footer",
        fields: [
          {
            kind: "group",
            key: "footer",
            label: "",
            fields: [
              text("bookingLead", "Before your locations", 40, { help: "For example \"Now booking in\"." }),
              text("pagesHeading", "Heading over the page links", 30),
              text("contactHeading", "Heading over the contact links", 30),
              text("tagline", "Line after the copyright", 120, { required: false }),
            ],
          },
        ],
      },
      {
        title: "Closing band",
        help: "The wine band at the foot of the gallery, Before you book and Meet Nat pages.",
        fields: [
          {
            kind: "group",
            key: "closing",
            label: "",
            fields: [text("heading", "Heading", 60), area("body", "Sentence", 300, { required: false })],
          },
        ],
      },
    ],
  },

  {
    key: "book",
    title: "Booking page",
    intro: "The booking page (/book/): its opening, the scheduler panel and the studio details beside it. The services themselves are under Services & pricing.",
    groups: [
      { title: "Opening", fields: pageOpening("the booking page") },
      {
        title: "Scheduler panel",
        fields: [
          text("heading", "Heading", 60),
          area("body", "Sentence", 300, { required: false }),
          text("currentLocationLabel", "Label for your current location", 40),
          text("alsoServingLabel", "Label for your other locations", 40),
          text("hoursLabel", "Label for your hours", 40),
          text("reachLabel", "Label for your contact link", 40),
        ],
      },
      {
        title: "While the scheduler loads",
        fields: [
          text("schedulerLoading", "While it loads", 80),
          text("schedulerError", "If it cannot load", 160),
          text("schedulerErrorContact", "Before your contact link, if it cannot load", 80),
        ],
      },
    ],
  },

  {
    key: "serviceBooking",
    title: "Service booking pages",
    intro: "The page each \"Book Frontal Install\" style button opens: the service, its photos and the scheduler. Use {service} for the service's name and {finish} for the chosen finish.",
    groups: [
      {
        title: "Top of the page",
        fields: [
          text("back", "Link back to every service", 40),
          text("price", "Label beside the price", 30),
          text("toScheduler", "Button down to the scheduler", 30),
        ],
      },
      {
        title: "Photos",
        fields: [
          text("photosHeading", "Heading over the photos", 80, { placeholders: ["service"] }),
          text("photosHint", "Hint under that heading", 120),
          area("photosBorrowed", "When a reinstall page borrows Reinstalls photos", 240, {
            placeholders: ["service", "install type"],
            help: "{install type} is \"reinstalls\".",
          }),
          text("photosEmptyHeading", "Heading when there are no photos", 60),
          area("photosEmpty", "Sentence when there are no photos", 240, { placeholders: ["service"] }),
          text("photosGallery", "Link to the gallery", 40),
        ],
      },
      {
        title: "Scheduler",
        help: "Square's scheduler always opens on your whole menu, so these steps tell the client which line to tap.",
        fields: [
          text("schedulerHeading", "Heading", 60),
          text("step1", "Step 1", 160, { placeholders: ["service"] }),
          text("step2", "Step 2 (when a finish was chosen)", 160, {
            placeholders: ["finish"],
            help: "Name the add-on exactly as Square does. \"Styling\" is shown in bold.",
          }),
          text("step3", "Last step", 160),
          text("finishLabel", "Label for the chosen finish", 30),
          text("styleNotesLabel", "Label for the client's style notes", 40),
          area("unavailable", "When a service is not on the menu", 240),
        ],
      },
    ],
  },

  {
    key: "installs",
    title: "Install pages",
    intro: "The three install pages (Frontal Install, Closure Install, Reinstalls): what each is, how it works, and the steps to book it.",
    groups: [
      {
        title: "Shared wording",
        fields: [
          text("eyebrow", "Small label above each install's name", 40),
          text("toFinish", "Button down to the finishes", 40),
          text("otherHeading", "Heading over the other installs", 60),
          text("galleryLink", "Link to the gallery", 60),
        ],
      },
      {
        title: "Each install",
        fields: [
          {
            kind: "record",
            key: "types",
            label: "Installs",
            entries: (["frontal", "closure", "wig-touch-up"] as const).map((id, index) => ({
              key: id,
              title: ["Frontal Install", "Closure Install", "Reinstalls"][index],
              fields: [
                text("label", "Name", 40, { help: "Its page title, and its name on the homepage, the footer and photo labels." }),
                text("bookLabel", "Name on its booking button", 40, { help: "After \"Book\", so singular: \"Reinstall\", not \"Reinstalls\"." }),
                text("shortLabel", "Short name", 24, { help: "Where space is tight, such as the switch between install pages." }),
                text("tagline", "Three-beat line", 90, { help: "The italic line under the name." }),
                area("summary", "Homepage sentence", 200),
                area("description", "Page introduction", 600),
                area("metaDescription", "Search result description", 240, { help: "Your business name and locations are added in front automatically." }),
                text("howHeading", "\"How it works\" heading", 80),
                {
                  kind: "fixed",
                  key: "highlights",
                  label: "How it works",
                  itemTitles: ["First point", "Second point", "Third point", "Fourth point"],
                  fields: [text("title", "Title", 60), area("body", "Sentence", 240, { rows: 2 })],
                },
                text("examplesHeading", "Heading over its photos", 80),
                area("examplesNote", "Note over its photos", 240, { required: false }),
                area("imageCaption", "Caption under the launch photo", 240, {
                  required: false,
                  help: "Only shown while the original launch photo is the one on the page.",
                }),
              ],
            })),
          },
        ],
      },
      {
        title: "Booking steps on the install pages",
        fields: [
          {
            kind: "group",
            key: "selection",
            label: "",
            fields: [
              text("installHeading", "Step 1 heading", 60),
              area("installBody", "Step 1 sentence", 240, { rows: 2 }),
              text("finishHeading", "Step 2 heading", 60),
              area("finishBody", "Step 2 sentence", 240, { rows: 2 }),
              text("styleHeading", "Step 3 heading", 60),
              area("styleBody", "Step 3 sentence", 240, { rows: 2 }),
              text("styleOptional", "\"Optional\" label", 20),
              text("stylePlaceholder", "Hint inside the style box", 80),
              text("bookHeading", "Step 4 heading", 60),
              text("bookInstall", "Label for the chosen install", 30),
              text("bookFinish", "Label for the chosen finish", 30),
              text("noInstall", "When no install is chosen", 40),
              text("noFinish", "When no finish is chosen", 40),
              text("needInstall", "Prompt: choose an install first", 80),
              text("needFinish", "Prompt: choose a finish first", 80),
              text("needBoth", "Prompt: choose both first", 80),
            ],
          },
        ],
      },
    ],
  },

  {
    key: "gallery",
    title: "Gallery & collections",
    intro: "The gallery page and the six collection pages. The photos are chosen in the photo manager.",
    groups: [
      { title: "Gallery page opening", fields: pageOpening("the gallery") },
      {
        title: "How the gallery is organised",
        fields: [
          text("axesHeading", "Heading", 80),
          area("axesBody", "Sentence", 300, { required: false }),
          {
            kind: "fixed",
            key: "axes",
            label: "The three ways",
            itemTitles: ["First", "Second", "Third"],
            fields: [text("label", "Label", 30), area("body", "Sentence", 300, { rows: 2 })],
          },
        ],
      },
      {
        title: "The six collections",
        fields: [
          {
            kind: "record",
            key: "collections",
            label: "Collections",
            entries: (
              [
                ["deep-wave-glam", "Deep Wave Glam"],
                ["sleek-straight", "Sleek Straight"],
                ["signature-bob", "Signature Bob"],
                ["body-wave-glam", "Body Wave"],
                ["color-and-custom", "Color & Custom"],
                ["natural-lace", "Natural Lace"],
              ] as const
            ).map(([slug, title]) => ({
              key: slug,
              title,
              fields: [
                text("title", "Name", 40, { help: "Its page title, card heading and photo-manager name." }),
                text("tagline", "Three-beat line", 80),
                text("summary", "Card sentence", 120, { help: "On its card on the homepage. Under 90 characters reads best." }),
                area("description", "Page introduction", 600),
                area("metaDescription", "Search result description", 240, { help: "Tip: {all locations} names every location you are taking appointments in." }),
              ],
            })),
          },
        ],
      },
      {
        title: "Shared collection-page wording",
        fields: [
          text("back", "Link back to the gallery", 40),
          text("galleryHeading", "Heading over the photos", 60),
          text("galleryHint", "Hint under that heading", 120),
          text("related", "Heading over other collections", 60),
          text("ctaHeading", "Closing band heading", 60),
          area("ctaBody", "Closing band sentence", 300, { required: false }),
          text("styleLabel", "Label over a style collection's name", 24),
          text("laceFinishLabel", "Label over Natural Lace's name, and its card badge", 24),
        ],
      },
      {
        title: "Natural Lace explainer",
        help: "Only shown on the Natural Lace page.",
        fields: [
          {
            kind: "group",
            key: "finishFocus",
            label: "",
            fields: [
              text("eyebrow", "Small label", 60),
              text("heading", "Heading", 80),
              area("body", "Sentence", 400, { required: false }),
              {
                kind: "fixed",
                key: "points",
                label: "Points",
                itemTitles: ["First point", "Second point", "Third point", "Fourth point"],
                fields: [text("title", "Title", 60), area("body", "Sentence", 240, { rows: 2 })],
              },
            ],
          },
        ],
      },
    ],
  },

  {
    key: "beforeYouBook",
    title: "Before you book",
    intro: "The Before you book page: its opening and the four steps of an appointment. The questions are under FAQs & policies.",
    groups: [
      { title: "Opening", fields: pageOpening("Before you book") },
      {
        title: "The appointment",
        fields: [
          text("processHeading", "Heading", 80),
          {
            kind: "fixed",
            key: "process",
            label: "Steps",
            itemTitles: ["Step 1", "Step 2", "Step 3", "Step 4"],
            fields: [text("label", "Name", 30), area("body", "Sentence", 240, { rows: 2 })],
          },
        ],
      },
    ],
  },

  {
    key: "faq",
    title: "FAQs & policies",
    intro: "The questions on the Before you book page, including your policies. They also feed search results.",
    groups: [
      {
        title: "Questions",
        fields: [
          text("heading", "Heading", 60),
          {
            kind: "list",
            key: "items",
            label: "Questions",
            itemName: "question",
            addLabel: "Add a question",
            min: 1,
            max: 30,
            fields: [text("question", "Question", 160), area("answer", "Answer", 1200, { rows: 4 })],
            titleOf: (item) => (item as { question?: string }).question || "New question",
          },
        ],
      },
      {
        title: "Draft notice",
        help: "While this is on, a note beside the questions says the answers are not confirmed yet. Switch it off once every answer is a policy you stand by.",
        fields: [
          { kind: "toggle", key: "draft", label: "Show the draft notice", on: "Notice shown", off: "Answers confirmed" },
          area("draftNotice", "Notice wording", 300, { required: false, rows: 2 }),
        ],
      },
    ],
  },

  {
    key: "meetNat",
    title: "Meet Nat",
    intro: "Your page: the biography, the points under it, and the three promises.",
    groups: [
      { title: "Opening", fields: pageOpening("Meet Nat") },
      {
        title: "Biography",
        fields: [
          area("bio", "Biography", 3000, { rows: 10, help: "Leave an empty line between paragraphs." }),
          {
            kind: "list",
            key: "credentials",
            label: "Points under the biography",
            itemName: "point",
            addLabel: "Add a point",
            min: 0,
            max: 8,
            itemMax: 120,
            fields: [],
            titleOf: (item, index) => (item as string) || `Point ${index + 1}`,
          },
          text("reachLabel", "Before your contact link", 40),
        ],
      },
      {
        title: "The three promises",
        fields: [
          {
            kind: "fixed",
            key: "assurances",
            label: "Promises",
            itemTitles: ["First promise", "Second promise", "Third promise"],
            fields: [text("title", "Title", 60), area("body", "Sentence", 300, { rows: 2 })],
          },
        ],
      },
    ],
  },

  {
    key: "reviews",
    title: "Reviews",
    intro: "The Reviews page. Use real clients' words only, with their permission.",
    groups: [
      { title: "Opening", fields: pageOpening("the Reviews page") },
      {
        title: "Reviews",
        fields: [
          {
            kind: "list",
            key: "items",
            label: "Reviews",
            itemName: "review",
            addLabel: "Add a review",
            min: 0,
            max: 12,
            fields: [
              area("quote", "What they said", 400, { rows: 3 }),
              text("name", "Their name", 60, { help: "As they agreed to be named, for example \"Jasmine R.\"." }),
              text("role", "About them", 60, { required: false, help: "Optional, for example \"Client since 2024\"." }),
            ],
            titleOf: (item) => (item as { name?: string }).name || "New review",
          },
        ],
      },
      {
        title: "Sample notice",
        help: "The site launched with written sample reviews, and shows a notice saying so. It can only be switched off once those samples are replaced with real reviews.",
        fields: [
          { kind: "toggle", key: "placeholder", label: "Show the sample notice", on: "Notice shown", off: "Real reviews" },
          area("placeholderNotice", "Notice wording", 200, { required: false, rows: 2 }),
        ],
      },
    ],
  },

  {
    key: "notFound",
    title: "Page not found",
    intro: "The page shown for an old or mistyped link.",
    groups: [{ title: "Wording", fields: pageOpening("the page-not-found page") }],
  },

  {
    key: "seo",
    title: "SEO & social links",
    intro: "How the site appears in search results and when a link is shared, and your Instagram.",
    groups: [
      {
        title: "Social",
        fields: [
          {
            kind: "url",
            key: "instagram",
            label: "Instagram profile",
            host: "instagram.com",
            help: "The full address, for example https://www.instagram.com/crownedbynattt/. Used by every Instagram link on the site. Leave empty to remove them.",
          },
        ],
      },
      {
        title: "Search results and link previews",
        help: "Search engines usually show about 160 characters of a description. Changes show in search results once they re-read the site, which can take days.",
        fields: [
          text("titleTagline", "Homepage title, after your business name", 70),
          area("description", "Homepage description", 300),
          area("shareDescription", "Description when the site is shared", 200),
          text("galleryTitle", "Gallery page title", 50),
          area("galleryDescription", "Gallery page description", 300),
          text("bookTitle", "Booking page title", 50),
          text("beforeYouBookTitle", "Before you book page title", 50),
          text("reviewsTitle", "Reviews page title", 50),
          text("meetNatTitle", "Meet Nat page title", 50),
        ],
      },
    ],
  },
];

export function sectionSpec(key: SectionKey): SectionSpec {
  // SECTION_SPECS covers every section; tests/cms-schema.test.mjs checks it.
  return SECTION_SPECS.find((spec) => spec.key === key)!;
}

/**
 * The dashboard's menu. Website content gathers the pages' own wording under
 * one entry, as tabs, so the menu stays short.
 */
export type PanelId =
  | "overview"
  | "business"
  | "locations"
  | "services"
  | "home"
  | "content"
  | "faq"
  | "reviews"
  | "photos"
  | "seo"
  | "history";

export const CONTENT_TABS: SectionKey[] = [
  "header",
  "book",
  "serviceBooking",
  "installs",
  "gallery",
  "beforeYouBook",
  "meetNat",
  "notFound",
];

/** Which sections each menu entry edits. */
export const PANEL_SECTIONS: Record<PanelId, SectionKey[]> = {
  overview: [],
  business: ["business"],
  locations: ["locations"],
  services: ["services"],
  home: ["home"],
  content: CONTENT_TABS,
  faq: ["faq"],
  reviews: ["reviews"],
  photos: [],
  seo: ["seo"],
  history: [],
};
