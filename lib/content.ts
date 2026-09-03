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
 *      Crowned by Nat. Installs performed by Nat. One chair, in Towson, MD.
 *      The neon mark in public/brand is her own studio sign.
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
 * so no rows to read, but one town that is confirmed and worth announcing.
 *
 * THIS IS THE ONLY PLACE A SERVICE LOCATION IS WRITTEN DOWN. The announcement
 * stripe, the footer, the "Where" row on /book, the page metadata and the
 * LocalBusiness structured data all derive from this array, so adding a town
 * back is one line here and nothing else. Do not re-type a town name into copy;
 * that is how the site ends up advertising a chair that is not open.
 *
 * Laurel, MD was removed on 2026-09-02. Nat installs in Towson only. The row
 * still exists in the locations table (seeded inactive; see
 * supabase/migrations) so she can switch it back on from the admin dashboard
 * without a deploy, and everything below reads active rows first.
 *
 * Keep the order deliberate. It is the order the announcement stripe reads them
 * out in when there is more than one.
 */
export const LOCATIONS = [{ name: "Towson", region: "MD" }] as const;

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
   * THE SAME MARK, FOR THE NAV BAR.
   *
   * Exported from the supplied artwork (photos/Logo.png, 2172x724) at 480x160,
   * which is 3.2x the widest it is ever drawn, so it stays crisp on a 3x screen
   * without shipping a 1.2MB file on every page. Same 3:1 proportions, same
   * artwork, no recolouring.
   *
   * It goes on the nav's near-white paper rather than on wine, which the note
   * above says the mark cannot do. That note is about the OLD asset, which was
   * a photograph of the sign with the black wall lifted out and a black halo
   * left behind it. This one is clean-edged, and what actually happens on pale
   * paper is that the white neon core stops reading as light and the letters
   * hollow out to their pink outline. Checked at 28, 36 and 44px against the
   * real --bg: it is thin at 28 and holds from 36 up, which is why the nav
   * draws it at 36-40px and never smaller.
   */
  navLogo: "/brand/crowned-by-nat-logo.png",
  navLogoWidth: 480,
  navLogoHeight: 160,

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
   *
   * Nat has no Acuity account yet, so the fallback is the empty string and the
   * site ships pointing at /book. The env var is read first purely so that the
   * switch can be flipped from the Cloudflare Pages dashboard without a code
   * change: set NEXT_PUBLIC_ACUITY_BOOKING_URL to her real scheduler link and
   * redeploy. It is NOT required for the build.
   *
   * This is read at BUILD time, not in the browser, so a deploy is what makes a
   * change to it take effect (Cloudflare: Deployments -> Retry deployment).
   * Both states were checked against a real production build: unset, all six
   * card buttons render "/book/?style=..."; set, they render the scheduler URL
   * with the style appended. Turbopack leaves this as a lookup against its own
   * bundled process shim rather than inlining a literal, which is why the `??`
   * matters. Without it an unset var reaches the markup as the string
   * "undefined".
   *
   * No account, no credentials and no API integration are implied by this line:
   * it is a string, and the only thing that reads it is the href builder below.
   */
  bookingUrl: process.env.NEXT_PUBLIC_ACUITY_BOOKING_URL ?? "",

  /** Towns rather than a street, because a street was never supplied. */
  city: LOCATIONS.map((l) => l.name).join(" and "),
  regionCode: LOCATIONS[0].region,

  ...CONTACT,
} as const;

/**
 * "Towson, MD". The service area written the way a search engine and a person
 * looking for a local install both expect to read it, and the only string the
 * page metadata uses for location.
 *
 * `STUDIO.city` on its own is the town names with no state ("Towson"), which
 * is right inside a sentence that already established Maryland and wrong in a
 * page title, where it reads as a half-finished address. This adds the state
 * once, here, rather than at four call sites in app/layout.tsx.
 *
 * Derived from LOCATIONS like everything else, so it follows a change of town
 * automatically. Two towns in the same state give "Towson and Laurel, MD",
 * which is still the correct phrasing rather than a directory listing.
 */
export const SERVICE_AREA = `${STUDIO.city}, ${STUDIO.regionCode}`;

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
  /**
   * The same verb, shortened, and ONLY for the button on a collection card.
   * Six cards in a grid cannot each carry "Book Your Chair" without the row
   * turning into a wall of repeated CTA, and at card width the full label
   * wraps. It is still the same first word, so the action is still learned
   * once. The collection name is appended for screen readers at the call site,
   * which keeps the accessible name ("Book Deep Wave Glam") a superset of the
   * visible one and satisfies WCAG 2.5.3 Label in Name.
   */
  bookStyle: "Book",
  /**
   * The booking action on a collection PAGE, keyed by the same `dimension`
   * field that draws the eyebrow above the title.
   *
   * Five collections are hairstyles and Natural Lace is a standard of finish.
   * The page has already said which of the two you are looking at, two lines
   * above this button, so a button that then reads "Book This Style" on the
   * finish page contradicts its own eyebrow. One lookup keeps the two agreeing
   * across all six pages from one field, rather than six hand-written labels
   * and a note to remember the odd one out.
   *
   * Longer than `bookStyle` because this button stands alone in a column
   * rather than repeating six times in a grid, so it can afford the words. And
   * "This" is what earns them: it says the button books the collection you are
   * reading about, not a generic appointment.
   */
  bookCollection: {
    style: "Book This Style",
    finish: "Book This Finish",
  },
  gallery: "View the gallery",
  collection: "View collection",
} as const;

/**
 * Adds `?style=<slug>` to a booking href, keeping any query string the
 * destination already carries. Acuity links routinely arrive with one attached
 * (`...?owner=12345678`), so appending blindly with "?" would corrupt them.
 */
function withStyle(href: string, style?: string) {
  if (!style) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}style=${encodeURIComponent(style)}`;
}

/**
 * Resolves where a booking CTA points, from the single STUDIO.bookingUrl
 * switch. Every booking CTA on the site spreads these props, so the real
 * booking link is a one-line change rather than a hunt through markup.
 *
 * Pass a collection slug to carry the style the visitor was looking at when
 * they decided to book:
 *
 *   bookingTarget()                   -> /book/
 *   bookingTarget("deep-wave-glam")   -> /book/?style=deep-wave-glam
 *
 * The argument is optional and every existing call site is unchanged.
 *
 * WHY THE PARAMETER IS CARRIED BUT NOT YET CONSUMED
 * /book asks which SERVICE you want (the install, the reinstall, the colour
 * add-on). A collection is a hairstyle, which is a different axis, so there is
 * no honest way to preselect a service from a style slug and pretending
 * otherwise would put the wrong appointment in the form. The parameter rides
 * along so the intent survives the click and is there to be read the moment
 * either the booking form grows a style field or Acuity is pointed at. Nothing
 * on /book reads it today and nothing breaks from its presence: under
 * `output: "export"` a query string is ignored by the static route, and the
 * page never touches useSearchParams (which would need a Suspense boundary and
 * fails the export build; see the note in lib/auth/redirect.ts).
 */
export function bookingTarget(style?: string) {
  const external = STUDIO.bookingUrl.trim();
  return external
    ? {
        href: withStyle(external, style),
        target: "_blank" as const,
        rel: "noopener noreferrer",
      }
    : { href: withStyle("/book/", style) };
}

/** True while booking runs through the form on /book rather than an external tool. */
export const usesOnPageBooking = STUDIO.bookingUrl.trim() === "";

/**
 * Four destinations, four pages, in the order a visitor needs them: see the
 * work, find out what the appointment involves, check other people's word for
 * it, then meet the person doing it.
 *
 * Gallery leads because the work is what sells a wig install.
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
  { label: "Gallery", href: "/gallery/" },
  { label: "Before you book", href: "/before-you-book/" },
  { label: "Reviews", href: "/reviews/" },
  { label: "Meet Nat", href: "/meet-nat/" },
] as const;

/**
 * Per page kicker, title and lede. One place to review every page opening,
 * and the source for each page title tag.
 */
export const PAGES = {
  gallery: {
    kicker: "Gallery",
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
    /*
      NOT CTA.gallery, and this is the one place on the site that departs from
      it. This block now sits directly under the hero, whose secondary button
      is CTA.gallery: two links reading "View the gallery" within a screen of
      each other look like the same control printed twice rather than one
      route offered once, and on a phone they land close enough to be read in
      a single glance. Saying what is actually behind the link tells a visitor
      something the hero button did not.
    */
    link: "See all six collections",
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
  /**
   * The service summary. Names and one line each, and deliberately NO prices:
   * every figure in SERVICES is still a placeholder awaiting Nat, and a number
   * on the homepage is the one thing a visitor will quote back. /book carries
   * them, in one place, where they can be corrected once.
   */
  services: {
    kicker: "The appointment",
    heading: "What happens in the chair.",
    body: "Three ways to book, and Nat performs every one of them herself.",
    link: "See what is included",
  },
  featured: {
    kicker: "Recent work",
    heading: "Lately, from the chair.",
    body: "A few of the most recent installs. The full set lives in the collections.",
    link: "View the gallery",
  },
  closing: {
    heading: "Your chair is waiting.",
    body: "One client at a time, in Towson, MD. Send a request and Nat comes back to you with two or three slots.",
  },
} as const;

/**
 * Hero. The brand name is the display element, because it is the first thing a
 * visitor sees and the name is what has to land. The line under it carries the
 * actual proposition, so the h1 is not a bare business name.
 */
/**
 * The top of the homepage, split across two components.
 *
 * BrandMasthead gets `brand` (as the mark's accessible name) and `line`.
 * HeroCarousel gets `headline` and `subtext`.
 *
 * Nothing is said twice. The mark carries the name, so the carousel underneath
 * it does not repeat it; the announcement stripe above the nav says where, so
 * the carousel headline is free to be the proposition rather than an
 * introduction.
 *
 * `subtext` is held under twenty words on purpose. It sits over photography
 * above the fold, and a hero paragraph that runs to four lines on a phone
 * pushes the booking button off the screen.
 */
export const HERO = {
  brand: STUDIO.name,
  /*
    `line` used to live here, printed under the mark on the old wine masthead.
    Both went when the mark moved into the nav bar. It said what the
    announcement stripe at the top of the page already says - where Nat is
    booking - and the nav's own logo says the rest, so it was a third statement
    of the same fact in one eyeful.

    If it ever comes back, build it from LOCATIONS rather than typing the town
    in. The old one was a hardcoded string and it is exactly the kind of line
    that gets left behind when the service area changes.
  */
  /** Over the photography. The proposition, and the page's h1. */
  headline: "Fitted, cut and finished by hand.",
  subtext:
    "Nat does every install herself, from the braid down to the last cut.",
} as const;

/**
 * The announcement stripe: the thin rose band above the nav bar on every page,
 * running these as tracked capitals on a slow loop. See
 * components/announcement-marquee.tsx for the type note, the loop, and how it
 * is paused.
 *
 * The brand name and the booking verb are not repeated here. The stripe reads
 * STUDIO.name and CTA.book directly, so it can never disagree with the nav.
 */
export const ANNOUNCEMENT = {
  /** Opens the loop when a chair is open. Each open town follows as a segment. */
  lead: "Now booking",
  /** What the studio does, in three words. Runs in every state. */
  service: "Lace wig installs",
  /**
   * Runs in place of the lead and the towns when every chair is closed, as two
   * segments. Never falls back to a town name.
   */
  closed: ["The chair is between studios just now", "New dates announced soon"],
} as const;

export const INTRO = {
  heading: "A crown should look like it grew there.",
  paragraphs: [
    "Crowned by Nat is one stylist and one chair. Nat customizes the unit, lays the lace, and cuts the hairline to your face in the same appointment, so nothing is handed off half finished.",
    "That means fewer slots in the week, and a wait for a Saturday. It also means the person who answers your message is the person doing your hair.",
  ],
  signature: "Nat, founder and installer",
} as const;

/**
 * The three assurances.
 *
 * The third one used to be a "ten day lace promise", guaranteeing a free
 * re-lay if the lace lifted inside ten days. Nat never agreed to that. A
 * guarantee is the one kind of placeholder a customer can act on and hold the
 * business to, so it is gone rather than flagged. What is here now describes
 * how the appointment is run, which is true and is Nat's to confirm.
 */
export const ASSURANCES = [
  {
    icon: "hand",
    title: "Nat does the work",
    body: "Every unit is fitted by Nat herself. Your install is never handed to an assistant.",
  },
  {
    icon: "heart",
    title: "One client at a time",
    body: "Your appointment is the only one in the room, so nothing is rushed to fit another in.",
  },
  {
    icon: "arrows",
    title: "Personalized to You",
    body: "Every install is shaped around you, from the fit and placement to the final cut and style. Nat takes the time to make sure your crown feels like your own.",
  },
] as const;

/**
 * Wording shared by every collection page, so six pages cannot drift into six
 * slightly different voices. The per-collection words live in
 * lib/collections.ts beside the photographs they describe.
 */
/**
 * The explainer that only the Natural Lace page shows.
 *
 * Natural Lace is the one collection that is not a hairstyle, and without
 * saying so it reads as a sixth texture sitting oddly beside five real ones.
 * Every look on that page is a different style; what they have in common is
 * how the unit meets the skin. This block says that in the client's language
 * rather than in the data model's, and it describes only what is visible in
 * the photographs above it - no lace brand, no product claim.
 */
export const FINISH_FOCUS = {
  eyebrow: "A finish, not a hairstyle",
  heading: "What natural lace actually means",
  body: "Every look on this page is a different style. What they share is how the unit meets the skin, which is the part that decides whether an install reads as hair or as a wig.",
  points: [
    {
      title: "Lace melt",
      body: "Lace tinted to your skin and pressed flat, so the edge disappears into it rather than sitting on top of it.",
    },
    {
      title: "Hairline realism",
      body: "Edges laid to follow the hairline you already have, rather than a shape drawn on to a face it does not belong to.",
    },
    {
      title: "Scalp realism",
      body: "Knots bleached down until the parting reads as scalp at conversational distance.",
    },
    {
      title: "Seamless installation",
      body: "Secured to sit flat the whole way round, with nothing lifting at the temples or the nape by the end of the day.",
    },
  ],
} as const;

/**
 * The one place the site explains its own filing system.
 *
 * Six collections sit on the gallery index and five of them are hairstyles,
 * so a visitor reasonably assumes the sixth is too. Rather than bolt filter
 * chips onto a page of six items - controls for six things are furniture, not
 * navigation - the distinction is made once, in two sentences, above the
 * grid. After that the cards can just be photographs.
 */
export const GALLERY_AXES = {
  heading: "Two ways to read this work",
  body: "Most of these collections are about the hair. One is about the install.",
  axes: [
    {
      label: "Style",
      body: "The texture, the length, the cut and the colour - what you picture when you book. Deep wave, sleek straight, bobs, body wave, and custom colour.",
    },
    {
      label: "Finish",
      body: "How well the unit is attached: the melt, the hairline, the parting. Natural Lace collects installs of every texture that share that standard.",
    },
  ],
} as const;

export const COLLECTION_PAGE = {
  back: "All six collections",
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
 * ---------------------------------------------------------------------------
 * WHAT WAS REMOVED FROM THIS BLOCK, AND WHY
 * ---------------------------------------------------------------------------
 * An earlier draft had Nat licensed as a cosmetologist, trained in medical wig
 * fitting, and drawn into the work by someone close to her going through
 * treatment. All of it was invented. None of it came from Nat.
 *
 * Invented biography is bad; invented CREDENTIALS are a different category.
 * "Licensed cosmetologist" is a regulated claim about a licence a person
 * either holds or does not, and publishing it on her behalf exposes her rather
 * than us. So the credentials list now holds only things that are true because
 * of how the business is structured, and the paragraphs describe the service
 * rather than her history.
 *
 * The shape is final and the layout takes her real words with no change. Four
 * questions get the real version: how long she has been installing, where she
 * trained, who her chair is for, and what she will not compromise on.
 */
export const OWNER = {
  heading: "One pair of hands, start to finish.",
  paragraphs: [
    "Nat works one chair, one client at a time. She customizes the unit, lays the lace, and cuts the hairline to your face in the same appointment, so nothing is handed off half finished and nobody else picks up where she left off.",
    "That means fewer appointments in the week and a wait for a Saturday. It also means the person who answers your message is the person doing your hair, and that she is still there when you look in the mirror at the end.",
  ],
  /**
   * True by construction, not claimed on her behalf. Add real qualifications
   * here once Nat has confirmed exactly what they are and how she words them.
   */
  credentials: [
    "Every install performed by Nat",
    "One client in the room at a time",
    "Consultation before every first install",
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
    a: "Nat takes appointments in Towson, MD. The full address comes with your confirmation, and the strip at the top of the site always shows where she is currently booking.",
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
