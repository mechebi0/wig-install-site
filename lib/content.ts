/**
 * Every visible string on the site, so copy can be reviewed in one pass and
 * swapped without touching layout.
 *
 * Copy rules enforced here:
 *  - zero em-dashes and en-dashes anywhere, quotes and attribution included
 *  - no filler verbs (elevate / seamless / unleash / next-gen)
 *  - prices are plausible service prices, not invented engineering precision
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDER BUSINESS DETAILS - REPLACE BEFORE LAUNCH
 * ---------------------------------------------------------------------------
 * The brand name and the owner name are real and confirmed:
 *
 *      Crown by Nat, installs performed by Nat.
 *
 * Everything in the PLACEHOLDER block below is INVENTED and must be replaced
 * with real details before this goes live. They are grouped together so there
 * is exactly one place to edit and nothing gets missed:
 *
 *      address, city, region, postcode, phone, email, Instagram, opening
 *      hours. Service prices, durations and credentials are stand-ins too and
 *      are marked where they are defined.
 *
 * Testimonials are stand-ins as well and carry a visible on-page notice while
 * testimonialsArePlaceholder is true. See the note above that flag.
 */

/** Invented stand-ins. Every one of these needs a real value from Nat. */
const PLACEHOLDER = {
  city: "Baltimore",
  street: "1411 Fleet Street, Studio 4",
  region: "Baltimore, MD 21231",
  regionCode: "MD",
  postalCode: "21231",
  phone: "+1 (410) 662-3184",
  email: "hello@crownbynat.com",
  instagram: "https://instagram.com/crownbynat",
  hours: [
    { days: "Tuesday to Friday", time: "9:00am to 7:00pm" },
    { days: "Saturday", time: "8:00am to 4:00pm" },
    { days: "Sunday and Monday", time: "Closed" },
  ],
} as const;

export const STUDIO = {
  /** Confirmed brand name. Used verbatim everywhere it appears. */
  name: "Crown by Nat",
  /** Confirmed. Nat performs every install personally. */
  owner: "Nat",
  ownerShort: "Nat",

  /**
   * BRAND MARK. A restrained crown and wordmark lockup drawn for Crown by Nat
   * as a temporary identity, not a supplied logo. Replace
   * public/brand/crown-by-nat.svg with the real file (keep the filename, or
   * point this at a new path) and the footer mark updates with it. Set to ""
   * to fall back to the typographic wordmark alone.
   */
  logo: "/brand/crown-by-nat.svg",

  /**
   * THE BOOKING DESTINATION. One switch for the whole site.
   *
   * Empty string  -> every booking CTA goes to the /book page, which carries
   *                  the services, the studio details and the request form.
   *                  This is the current behaviour.
   * A URL         -> every CTA instead opens that URL in a new tab. Paste the
   *                  real Square / Fresha / Calendly / Acuity link here and
   *                  the on-page form section hides itself automatically.
   *
   * Nothing else needs editing; see bookingTarget() below.
   */
  bookingUrl: "",

  ...PLACEHOLDER,
} as const;

/** One label per intent, reused everywhere. */
export const CTA = {
  book: "Book Your Chair",
  work: "See the work",
} as const;

/**
 * Resolves where a booking CTA points, from the single STUDIO.bookingUrl
 * switch. Every booking CTA on the site spreads these props, so the real
 * booking link is a one-line change rather than a hunt through markup.
 */
export function bookingTarget() {
  const external = STUDIO.bookingUrl.trim();
  return external
    ? { href: external, target: "_blank" as const, rel: "noopener noreferrer" }
    : { href: "/book/" };
}

/** True while booking runs through the form on /book rather than an external tool. */
export const usesOnPageBooking = STUDIO.bookingUrl.trim() === "";

/**
 * Four destinations, four pages. The homepage is a landing experience rather
 * than a table of contents, so everything detailed lives behind one of these
 * and the booking CTA is kept separate from them as the single primary action.
 */
export const NAV_LINKS = [
  { label: "Work", href: "/work/" },
  { label: "Meet Nat", href: "/meet-nat/" },
  { label: "Reviews", href: "/reviews/" },
  { label: "Before you book", href: "/before-you-book/" },
] as const;

/**
 * Per page kicker, title and lede. One place to review every page opening,
 * and the source for each page title tag.
 */
export const PAGES = {
  work: {
    kicker: "The work",
    title: "Finished, and still holding.",
    lede: "Recent installs, grouped by the look people actually ask for. Bring a screenshot to your consult and Nat will work from it.",
  },
  book: {
    kicker: "Book",
    title: "Book your chair.",
    lede: "Pick a service, send the form, and Nat will text back with two or three slots. Usually the same day.",
  },
  beforeYouBook: {
    kicker: "Before you book",
    title: "Everything worth knowing first.",
    lede: "What the appointment involves, how long an install lasts, and what happens if the lace lifts early.",
  },
  reviews: {
    kicker: "Reviews",
    title: "What people say on week three.",
    lede: "Not on the day, when everything looks good. Three weeks in, which is when an install has to prove itself.",
  },
  meetNat: {
    kicker: "Meet Nat",
    title: "One pair of hands, start to finish.",
    lede: "One stylist, one chair, and one client in the room at a time.",
  },
} as const;

/**
 * HOMEPAGE ONLY.
 *
 * The homepage carries a preview of two things and a closing CTA, and nothing
 * else. Anything that needs a paragraph to explain belongs on its own page.
 */
export const HOME = {
  featured: {
    heading: "Recent work.",
    body: "Three from the last few weeks.",
    link: "See all the work",
  },
  services: {
    heading: "What you can book.",
    body: "Prices are for the service. You bring the unit.",
    link: "See every service",
  },
  closing: {
    heading: "Your chair is waiting.",
    body: "Tuesday through Saturday, one client at a time. Send the form and Nat will text you back with two or three slots.",
  },
} as const;

/**
 * Hero. The brand name is the display element, because it is the first thing a
 * visitor sees and the name is what has to land. The line under it carries the
 * actual proposition, so the h1 is not a bare business name.
 */
export const HERO = {
  kicker: "Lace wig installs",
  brand: STUDIO.name,
  line: "Fitted, cut and finished by hand.",
  subtext:
    "Nat does every install herself, from the braid down to the last cut. One chair, one client, one appointment.",
} as const;

export const INTRO = {
  heading: "A crown should look like it grew there.",
  paragraphs: [
    "Crown by Nat is one stylist and one chair. Nat customizes the unit, lays the lace, and cuts the hairline to your face in the same appointment, so nothing is handed off half finished.",
    "That means fewer slots in the week, and a wait for a Saturday. It also means the person who answers your message is the person doing your hair.",
  ],
  signature: "Nat, founder and installer",
} as const;

export const ASSURANCES = [
  {
    icon: "hand",
    title: "Nat does the work",
    body: "Every unit is fitted by Nat herself. Your install is never handed to an assistant.",
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
  heading: "Recent installs.",
  body: "A slow look through recent work. Pause it, or step through at your own pace.",
} as const;

export const STYLES_SECTION = {
  heading: "Browse by the look you want.",
  body: "Pick a style and swipe through it. Bring a screenshot to your consult and Nat will work from that.",
} as const;

/** PLACEHOLDER PRICES AND DURATIONS. Confirm both with Nat before launch. */
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
    body: "Nat looks at your unit, your hairline, and what your scalp can take that week.",
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

/**
 * ABOUT NAT.
 *
 * The shape of this section is final; the words are a professional stand-in
 * written to be replaced. Four questions get you the real version: how long
 * she has been installing, where she trained, who her chair is for, and what
 * she will not compromise on. Credentials below are unverified stand-ins.
 */
export const OWNER = {
  heading: "One pair of hands, start to finish.",
  paragraphs: [
    "Nat has been installing lace for years, first out of a shared suite and now out of a private studio where one client is in the room at a time. She has never taken on a second stylist, and she does not intend to.",
    "She trained in medical wig fitting after watching someone close to her go through treatment and struggle to find anyone who would take the time. A steady share of the chair is now alopecia, postpartum, and treatment clients.",
  ],
  credentials: [
    "Licensed cosmetologist",
    "Trained in medical wig fitting",
    "Every install performed by Nat",
  ],
} as const;

/**
 * PLACEHOLDER TESTIMONIALS.
 *
 * These are written stand-ins, not real client feedback, and the section
 * renders a visible "sample wording" notice while testimonialsArePlaceholder
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
      "First install after chemo. Nat explained every step and never once rushed me.",
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
    a: "Nat does, every time. There is no second chair and no assistant finishing the work. If she is booked out, you wait for her rather than being passed along.",
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
  heading: "Send a request.",
  body: "Send the form and Nat will text back with two or three slots, usually the same day. Tuesday through Saturday.",
} as const;
