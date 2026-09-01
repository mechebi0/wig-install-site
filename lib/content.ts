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
 * WHAT IS CONFIRMED AND WHAT IS STILL MISSING
 * ---------------------------------------------------------------------------
 * Confirmed, and safe to present as fact:
 *
 *      Crowned by Nat. Installs performed by Nat. Chairs in Towson, MD and
 *      Laurel, MD. The neon mark in public/brand is her own studio sign.
 *
 * NOT supplied yet, and therefore deliberately EMPTY rather than invented. An
 * empty string here is not an oversight: every component reads these through
 * the helpers below and renders nothing at all when a value is missing, which
 * is the only honest option. A made-up phone number on a live site is a real
 * stranger's phone, and a made-up Instagram handle is a real stranger's
 * account.
 *
 *      studio street address, phone number, opening hours, Instagram
 *
 * Service prices, durations and credentials are stand-ins too, and are marked
 * where they are defined. Testimonials are stand-ins and carry a visible
 * on-page notice while testimonialsArePlaceholder is true.
 */

/**
 * Contact details. Fill any of these in and the site starts showing it; leave
 * it empty and the site simply does not mention it.
 *
 * The email is Nat's own business address, and is also the account the admin
 * dashboard is granted to in supabase/migrations. If she would rather the
 * public contact went somewhere else, this is the line to change.
 */
const CONTACT = {
  /*
    The three empty ones are annotated `as string` rather than left to infer.
    Without it `as const` gives them the literal type "", TypeScript proves
    every `STUDIO.phone ? ...` branch below is dead, and narrows the truthy arm
    to `never` so `.replace` on it fails to compile. Widening to `string` is
    what tells the compiler these are values waiting to be filled in rather
    than constants that are permanently empty.
  */

  /** No studio number supplied. Every "or call" fallback switches to email. */
  phone: "" as string,
  email: "crownedbynattt@gmail.com",
  /** No handle confirmed. The footer omits the social row while this is "". */
  instagram: "" as string,
  /** Not supplied. Chairs are described by town instead; see LOCATIONS. */
  street: "" as string,
  /** Not supplied. The studio panel on /book omits the row while this is []. */
  hours: [] as ReadonlyArray<{ days: string; time: string }>,
} as const;

/**
 * WHERE NAT WORKS.
 *
 * The database in supabase/migrations owns this once a project is connected,
 * and lib/catalog.ts reads it from there. This constant is the compiled-in
 * fallback for the state the site is actually in today: no Supabase project,
 * so no rows to read, but two towns that are confirmed and worth announcing.
 *
 * Keep the order deliberate. It is the order the announcement strip reads them
 * out in.
 */
export const LOCATIONS = [
  { name: "Towson", region: "MD" },
  { name: "Laurel", region: "MD" },
] as const;

export const STUDIO = {
  /** Confirmed brand name. Used verbatim everywhere it appears. */
  name: "Crowned by Nat",
  /** Confirmed. Nat performs every install personally. */
  owner: "Nat",
  ownerShort: "Nat",

  /**
   * BRAND MARK, and it is the real one.
   *
   * This is Nat's own neon studio sign, the same one hanging behind the client
   * in half the photographs on this site. It was supplied as a photograph on a
   * black wall; the black has been lifted out so the glow composites over any
   * dark field rather than sitting in a black box. It therefore belongs on
   * WINE OR DARKER SURFACES ONLY. On blush paper it would be invisible, which
   * is why the nav and the mobile sheet use the typographic wordmark instead
   * and the mark itself appears on the hero and in the footer band.
   *
   * Set to "" to fall back to the typographic wordmark everywhere.
   */
  logo: "/brand/crowned-by-nat-neon.webp",
  logoWidth: 900,
  logoHeight: 294,

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

  /** Towns rather than a street, because a street was never supplied. */
  city: LOCATIONS.map((l) => l.name).join(" and "),
  regionCode: LOCATIONS[0].region,

  ...CONTACT,
} as const;

/**
 * "call 410 555 0134" or "email crownedbynattt@gmail.com", as one fragment.
 *
 * A dozen places on this site offer a way to reach a person when a form is not
 * the right tool. Each of them used to hardcode the phone. Routing them all
 * through one derived fragment means the day a real studio number arrives,
 * every one of those sentences starts saying "call" instead of "email" from a
 * single edit, and until that day none of them prints a number nobody owns.
 */
export const REACH = {
  /** Sentence fragment: "call ..." or "email ...". Never capitalised here. */
  phrase: STUDIO.phone ? `call ${STUDIO.phone}` : `email ${STUDIO.email}`,
  /** The address itself, for use as a link label. */
  label: STUDIO.phone || STUDIO.email,
  href: STUDIO.phone
    ? `tel:${STUDIO.phone.replace(/[^+\d]/g, "")}`
    : `mailto:${STUDIO.email}`,
} as const;

/** "Or call ..." / "Or email ...". The standing secondary action. */
export const REACH_SECONDARY = `Or ${REACH.phrase}`;

/** One label per intent, reused everywhere. */
export const CTA = {
  /**
   * ONE booking verb for the whole site. "Book Your Chair" is the only wording
   * used, top to bottom, so a visitor learns the button once. Variants like
   * "Reserve your chair" were considered and dropped: a second phrase for the
   * same action reads as a second action.
   */
  book: "Book Your Chair",
  styles: "Explore the styles",
  collection: "View collection",
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
 * Four destinations, four pages, in the order a visitor needs them: see the
 * work, find out what the appointment involves, check other people's word for
 * it, then meet the person doing it.
 *
 * Styles leads because the work is what sells a wig install.
 *
 * The booking CTA is deliberately NOT in this list. It is the site's single
 * primary action and it renders as a filled pill beside the links, so putting
 * it in the row as well would make it the fifth-most-important thing on a bar
 * where it is the first.
 *
 * There is no Admin entry here and there will not be one. Nat reaches her
 * dashboard by bookmarking /admin.
 */
export const NAV_LINKS = [
  { label: "Styles", href: "/styles/" },
  { label: "Before you book", href: "/before-you-book/" },
  { label: "Reviews", href: "/reviews/" },
  { label: "Meet Nat", href: "/meet-nat/" },
] as const;

/**
 * Per page kicker, title and lede. One place to review every page opening,
 * and the source for each page title tag.
 */
export const PAGES = {
  styles: {
    kicker: "Styles",
    title: "Explore the collection.",
    lede: "Six ways to wear a Crowned by Nat install, each one a room full of finished work. Find the one you keep coming back to and bring it to your consult.",
  },
  book: {
    kicker: "Book",
    title: "Book your chair.",
    lede: "Pick your service, take a time that suits you, and Nat will text back to confirm. Usually the same day.",
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
  collections: {
    kicker: "The collection",
    heading: "Explore the Crowned by Nat collection.",
    body: "Six ways to wear an install. Open the one you keep coming back to.",
    link: "See every style",
  },
  meetNat: {
    kicker: "Meet Nat",
    heading: "The hands behind the crown.",
    body: "One stylist, one chair, one client in the room. Nat customizes the unit, lays the lace and cuts the hairline to your face in the same appointment.",
    link: "Meet Nat",
  },
  reviews: {
    kicker: "The Crowned experience",
    heading: "In her clients' words.",
    /** Rendered only while testimonialsArePlaceholder is false. */
    body: "Three weeks in, which is when an install has to prove itself.",
    /** Rendered instead while the quotes on /reviews are still stand-ins. */
    bodyPending:
      "Nat's clients say it better than a homepage can. Real reviews are being collected now and go up here as they land.",
    link: "Read the reviews",
  },
  closing: {
    heading: "Your chair is waiting.",
    body: "One client at a time, in Towson and in Laurel. Send a request and Nat comes back to you with two or three slots.",
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

/**
 * The announcement strip, above the hero.
 *
 * `lead` is Playfair italic and `places` is tracked Playfair caps; see the type
 * note in components/location-strip.tsx for why it is set that way rather than
 * in the site's `.label` style.
 */
export const ANNOUNCEMENT = {
  lead: "Now booking in",
  /** Shown when every chair is closed. Never falls back to a town name. */
  closed: "The chair is between studios just now. New dates announced soon.",
} as const;

export const INTRO = {
  heading: "A crown should look like it grew there.",
  paragraphs: [
    "Crowned by Nat is one stylist and one chair. Nat customizes the unit, lays the lace, and cuts the hairline to your face in the same appointment, so nothing is handed off half finished.",
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

/**
 * Wording shared by every collection page, so six pages cannot drift into six
 * slightly different voices. The per-collection words live in
 * lib/collections.ts beside the photographs they describe.
 */
export const COLLECTION_PAGE = {
  back: "All styles",
  gallery: "Explore the collection",
  galleryHint: "Select any photograph to see it larger.",
  related: "More from the collection",
  cta: {
    heading: "Ready for your crown?",
    body: "Bring this page to your consult. Nat will tell you straight whether the unit you have will get you there.",
  },
} as const;

/**
 * PLACEHOLDER PRICES AND DURATIONS. Confirm both with Nat before launch.
 *
 * These four are also the seed rows in
 * supabase/migrations/0001_crown_by_nat_foundation.sql, matched by `id` to the
 * `slug` column there, and they are what the site shows in the moment before
 * the live rows arrive from the database. Keeping the two in step is the whole
 * reason the ids are stable words rather than numbers.
 *
 * Money is held in CENTS and time in MINUTES rather than as the display
 * strings this file used to carry. The strings were fine while nothing but a
 * price list read them; they stopped being fine the moment a booking had to do
 * arithmetic on a duration to find out whether a slot was free. `formatPrice`
 * and `formatDuration` in lib/format.ts render them, so "$180" and "2 hours"
 * still appear on the page and are now derived rather than typed twice.
 *
 * They are seeded with pricing_confirmed = false, which is what makes the
 * admin dashboard badge them as placeholders. Do not present them as Nat's
 * real prices until she has said so.
 */
export const SERVICES = [
  {
    id: "frontal",
    name: "Full frontal install",
    priceCents: 18000,
    durationMinutes: 120,
    body: "Lace tinted to your skin, knots bleached, hairline plucked and cut. Includes the style you leave in.",
  },
  {
    id: "closure",
    name: "Closure install",
    priceCents: 14000,
    durationMinutes: 90,
    body: "Less lace to manage, lower upkeep, and gentler on a tender scalp.",
  },
  {
    id: "custom",
    name: "Customization only",
    priceCents: 9500,
    durationMinutes: 75,
    body: "Plucking, tinting, and bleaching on a unit you already own. Drop it off or wait for it.",
  },
  {
    id: "refresh",
    name: "Reinstall and refresh",
    priceCents: 7000,
    durationMinutes: 60,
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

/**
 * PLACEHOLDER POLICIES.
 *
 * The answers below describe how an appointment runs, how long an install
 * lasts, and what happens when someone cancels. They are professionally
 * written stand-ins, NOT policies Nat has confirmed, and /before-you-book
 * carries a visible notice saying so while this flag is true.
 *
 * The same rule as the testimonials applies, for the same reason: a policy a
 * customer relies on and the business has never agreed to is worse than no
 * policy at all. Flip this to false only once Nat has read every answer below
 * and said yes to it.
 */
export const policiesAreDraft = true;

export const QUESTIONS = [
  {
    q: "Where does the appointment happen?",
    a: "Nat takes appointments in Towson, MD and in Laurel, MD. Which chair is open depends on the week, so the location is confirmed when your appointment is, and the strip at the top of the site always shows where she is currently booking.",
  },
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
    a: "Get in touch as early as you can. Moving an appointment more than 24 hours out costs nothing. Inside 24 hours, half the service price holds your next slot rather than being lost.",
  },
  {
    q: "What should I bring, and how should I turn up?",
    a: "Your unit, and a screenshot of the look you are after. Come with your own hair washed, fully dried and detangled, and with no heavy oil or grease on your scalp, because adhesive will not hold on a conditioned hairline. If you are between installs, leave the takedown to Nat rather than pulling it out the night before.",
  },
] as const;

export const BOOKING = {
  heading: "Send a request.",
  body: "Send the form and Nat will text back with two or three slots, usually the same day. Tuesday through Saturday.",
} as const;

/**
 * ---------------------------------------------------------------------------
 * ACCOUNTS, BOOKING AND ADMIN
 * ---------------------------------------------------------------------------
 * Added with the booking system. Same rule as everything above: if a visitor
 * can read it, it is defined here, so the whole voice of the site can be
 * reviewed in one file rather than hunted through twelve components.
 *
 * Voice notes for anything added later:
 *   - the customer is spoken to warmly and directly, never as "the user"
 *   - Nat is named. "The studio will confirm" is a call centre; "Nat will text
 *     you back" is a person
 *   - no em-dashes or en-dashes, same as the rest of this file
 *   - no SaaS vocabulary. Nobody signs up for a platform, gets onboarded, or
 *     manages their account. They make an account and they book a chair
 */
export const ACCOUNT = {
  login: {
    kicker: "Your account",
    title: "Welcome back.",
    lede: "Sign in to see your appointments, or to book your next one in a few taps.",
    submit: "Log in",
    alternate: "First time here?",
    alternateLink: "Make an account",
  },
  signup: {
    kicker: "Your account",
    title: "Your chair is waiting.",
    lede: "An account keeps your appointments in one place and fills the booking form in for you next time. You never need one to book.",
    submit: "Make my account",
    alternate: "Already have an account?",
    alternateLink: "Log in",
  },
  forgot: {
    kicker: "Your account",
    title: "Let's get you back in.",
    lede: "Put in the email you booked with and a reset link is on its way.",
    submit: "Send the reset link",
    sent: "Check your inbox. If there is an account with that email, a reset link is on its way. The link is good for one hour.",
  },
  reset: {
    kicker: "Your account",
    title: "Pick a new password.",
    lede: "Eight characters or more. Long beats complicated: a phrase you will remember is stronger than a symbol you will not.",
    submit: "Save it and sign me in",
  },
  dashboard: {
    kicker: "My Crowned by Nat",
    upcoming: "Upcoming appointment",
    upcomingPlural: "Upcoming appointments",
    past: "Past appointments",
    details: "Your details",
    empty: "Nothing in the diary yet.",
    emptyBody:
      "Book a chair and it will show up here, along with everything you have had done before.",
    bookAnother: "Book another appointment",
    bookFirst: "Book your chair",
  },
  /** Guest booking confirmation. Kept apart because it has a job to do. */
  confirmation: {
    title: "That is in the diary.",
    body: "Nat will text you to confirm, usually the same day. Nothing is charged now and nothing is held on a card.",
    referenceLabel: "Your reference",
    referenceHelp:
      "Quote this if you call or text the studio. Keep it somewhere you can find it.",
  },
} as const;

/**
 * The booking flow, step by step.
 *
 * Five steps, and each one asks for exactly one kind of thing. That is the
 * difference between a premium appointment and an enterprise scheduling form:
 * a form asks for everything at once because it is easier to build, and a
 * concierge asks one question at a time because it is easier to answer.
 */
export const BOOKING_FLOW = {
  title: "Book your chair.",
  steps: [
    { id: "service", label: "Service", heading: "What are we doing?" },
    { id: "location", label: "Location", heading: "Where are we meeting?" },
    { id: "when", label: "Date and time", heading: "When suits you?" },
    { id: "details", label: "Your details", heading: "How do we reach you?" },
    { id: "confirm", label: "Confirm", heading: "Does this look right?" },
  ],
  guestPrompt: "Booking as a guest",
  guestBody:
    "No account, no password, nothing to remember. You will get a reference and a text from Nat.",
  accountPrompt: "Make an account instead",
  accountBody:
    "Keeps every appointment in one place and fills this in for you next time.",
  closed: {
    title: "Not taking bookings just now.",
    body: "Nat is between studios. New dates go up here first, and the fastest way to hear about them is to text the studio.",
  },
} as const;
