/**
 * Every visible string on the page, so copy can be reviewed in one pass and
 * swapped without touching layout.
 *
 * Copy rules enforced here:
 *  - zero em-dashes and en-dashes anywhere, quotes and attribution included
 *  - no filler verbs (elevate / seamless / unleash / next-gen)
 *  - prices are plausible service prices, not invented engineering precision
 *
 * PLACEHOLDER BUSINESS DETAILS. Studio name, owner, address, phone, licence
 * number and prices are all invented. Replace before launch.
 */

export const STUDIO = {
  name: "Maison Lacé",
  owner: "Imani Ferreira",
  ownerShort: "Imani",

  /**
   * TEMPORARY BRAND PLACEHOLDER, not the client's logo.
   * Replace public/brand/logo-placeholder.svg with the real file (or point
   * this at a new path) and the nav, carousel brand slide, and footer all
   * update together. Set to "" to fall back to the typographic wordmark.
   */
  logo: "/brand/logo-placeholder.svg",

  /**
   * THE BOOKING DESTINATION. One switch for the whole site.
   *
   * Empty string  -> every "Book an install" CTA scrolls to the on-page
   *                  booking form at #book. This is the current behaviour.
   * A URL         -> every CTA instead opens that URL in a new tab. Paste the
   *                  client's Square / Fresha / Calendly / Acuity link here
   *                  and the on-page form section hides itself automatically.
   *
   * Nothing else needs editing; see bookingTarget() below.
   */
  bookingUrl: "",

  city: "Baltimore",
  street: "1411 Fleet Street, Studio 4",
  region: "Baltimore, MD 21231",
  phone: "+1 (410) 662-3184",
  email: "book@maisonlace.studio",
  instagram: "https://instagram.com/maisonlace.studio",
  hours: [
    { days: "Tuesday to Friday", time: "9:00am to 7:00pm" },
    { days: "Saturday", time: "8:00am to 4:00pm" },
    { days: "Sunday and Monday", time: "Closed" },
  ],
} as const;

/** One label per intent, reused everywhere. */
export const CTA = {
  book: "Book an install",
  work: "See the work",
} as const;

/**
 * Resolves where a booking CTA points, from the single STUDIO.bookingUrl
 * switch. Every booking CTA on the site spreads these props, so the client's
 * real booking link is a one-line change rather than a hunt through markup.
 */
export function bookingTarget() {
  const external = STUDIO.bookingUrl.trim();
  return external
    ? { href: external, target: "_blank" as const, rel: "noopener noreferrer" }
    : { href: "#book" };
}

/** True while booking runs through the on-page form rather than an external tool. */
export const usesOnPageBooking = STUDIO.bookingUrl.trim() === "";

export const NAV_LINKS = [
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Styles", href: "#styles" },
  { label: "Questions", href: "#questions" },
] as const;

export const HERO = {
  headline: "Every install is mine,",
  headlineAccent: "start to finish.",
  subtext:
    "No assistants, no double booking. One chair, one client, and a hairline cut to your face.",
} as const;

export const ASSURANCES = [
  {
    icon: "hand",
    title: "The owner does the work",
    body: "Imani fits every unit herself. Your install is never handed to an assistant.",
  },
  {
    icon: "heart",
    title: "Sensitive scalps welcome",
    body: "Alopecia, postpartum, and treatment clients are booked with extra time.",
  },
  {
    icon: "arrows",
    title: "Ten day lace promise",
    body: "If the lace lifts inside ten days, laying it again is free.",
  },
] as const;

export const CAROUSEL_SECTION = {
  heading: "Finished, and still holding.",
  body: "A slow look through recent work. Pause it, or step through at your own pace.",
} as const;

export const STYLES_SECTION = {
  heading: "Browse by the look you want.",
  body: "Pick a style and swipe through it. Bring a screenshot to your consult and we will work from that.",
} as const;

export const SERVICES = [
  {
    id: "frontal",
    name: "Full frontal install",
    price: "$180",
    duration: "2 hours",
    body: "Lace tinted to your skin, knots bleached, hairline plucked and cut. Includes the style you leave in.",
  },
  {
    id: "closure",
    name: "Closure install",
    price: "$140",
    duration: "90 minutes",
    body: "Less lace to manage, lower upkeep, and gentler on a tender scalp.",
  },
  {
    id: "custom",
    name: "Customization only",
    price: "$95",
    duration: "75 minutes",
    body: "Plucking, tinting, and bleaching on a unit you already own. Drop it off or wait for it.",
  },
  {
    id: "refresh",
    name: "Reinstall and refresh",
    price: "$70",
    duration: "60 minutes",
    body: "Full takedown, scalp cleanse, and a fresh lay on the same unit.",
  },
] as const;

/** Verb labels, never "Step 1 / Stage 1". */
export const PROCESS = [
  {
    label: "Consult",
    body: "We look at your unit, your hairline, and what your scalp can take that week.",
  },
  {
    label: "Prep",
    body: "Cleanse, braid down, and build a flat base. The install is won or lost here.",
  },
  {
    label: "Install",
    body: "Lace tinted, knots bleached, adhesive laid in thin passes and cured between each one.",
  },
  {
    label: "Style",
    body: "Cut, shape, and a finish you can put back yourself on day nine.",
  },
] as const;

export const OWNER = {
  heading: "One pair of hands, nine years in.",
  paragraphs: [
    "Imani Ferreira has been installing lace since 2017, first out of a shared suite on Eastern Avenue and since 2021 out of a private studio in Fells Point. She has never taken on a second stylist, and she does not intend to. One client is in the room at a time.",
    "She trained in medical wig fitting in 2020 after her aunt started chemotherapy and could not find anyone who would take the time. Roughly a third of the chair is now alopecia, postpartum, and treatment clients.",
  ],
  credentials: [
    "Maryland cosmetology license 04-118273",
    "Certified in medical wig fitting, 2020",
    "Every install performed by the owner",
  ],
} as const;

/**
 * PLACEHOLDER TESTIMONIALS.
 *
 * These are written stand-ins, not real client feedback, and the section
 * renders a visible "sample wording" notice while `testimonialsArePlaceholder`
 * is true. Replace the entries with real quotes and flip the flag to false to
 * drop the notice. Do not ship the flag as false while these words are still
 * here: presenting invented quotes as real reviews is deceptive, and in the US
 * it is squarely what the FTC endorsement rules prohibit.
 */
export const testimonialsArePlaceholder = true;

export const TESTIMONIALS = [
  {
    quote: "I swim four mornings a week and the lace has not lifted once.",
    name: "Adaeze Nwankwo",
    role: "Secondary school teacher",
  },
  {
    quote:
      "First install after chemo. She explained every step and never once rushed me.",
    name: "Rosalind Peirce",
    role: "Ceramicist",
  },
  {
    quote:
      "I brought in a unit I had already ruined. It came back better than I bought it.",
    name: "Camille Ashworth",
    role: "Event producer",
  },
] as const;

export const QUESTIONS = [
  {
    q: "Who actually does my install?",
    a: "Imani does, every time. There is no second chair and no assistant finishing the work. If she is booked out, you wait for her rather than being passed along.",
  },
  {
    q: "How long does an install last?",
    a: "Three to four weeks for a frontal, and closer to five for a closure. Sweat, heat, and how often you lift the lace at home all move that number. A refresh appointment resets it.",
  },
  {
    q: "Do I need to bring my own wig?",
    a: "Yes. The chair time covers customization and install, not the unit itself. If you are buying for the first time, send a link before you order and you will get a straight answer on whether the cap and density are worth it.",
  },
  {
    q: "Will this damage my natural hair?",
    a: "Not when it is braided down properly and taken down properly. The base braids are kept loose at the perimeter, and takedown uses a solvent rather than pulling. Leaving an install in past six weeks is what causes damage.",
  },
  {
    q: "Can you work with a sensitive or healing scalp?",
    a: "Yes, and those appointments are booked with extra time built in. Bring anything your dermatologist or oncology team has told you about adhesives. There are non-adhesive options that hold well if glue is off the table.",
  },
  {
    q: "What happens if the lace lifts before my refresh?",
    a: "Come back in. If it lifts inside ten days of the install, laying it again is free and you do not need to explain yourself.",
  },
  {
    q: "How do I move or cancel an appointment?",
    a: "Text the studio line. Moving it more than 24 hours out costs nothing. Inside 24 hours, half the service price holds your next slot rather than being lost.",
  },
] as const;

export const BOOKING = {
  heading: "Book your chair.",
  body: "Send the form and you will get a text back with two or three slots, usually the same day. Tuesday through Saturday.",
} as const;
