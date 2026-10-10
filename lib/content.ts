/**
 * Every visible string on the site, so copy can be reviewed in one pass and
 * swapped without touching layout.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE WORDS COME FROM NOW
 * ---------------------------------------------------------------------------
 * Nat edits them herself, in the dashboard at /admin/. What she publishes is
 * read once when the site is built (lib/cms/published.ts) and laid over the
 * words the site shipped with (lib/cms/defaults.ts). The exports below are the
 * same names the pages have always read, now filled from that: a page reads
 * `CTA.book` exactly as before, and gets whatever Nat last published.
 *
 * So to change wording, change it in the dashboard. Change a default in
 * lib/cms/defaults.ts only for a field Nat has never published, or for a new
 * field. Wording that is still fixed here is interface plumbing (screen
 * reader phrases, the dormant account and booking-flow screens), listed in
 * docs/content-manager.md.
 *
 * Copy rules, for the defaults and for anything added here:
 *  - zero em-dashes and en-dashes anywhere, quotes and attribution included
 *  - no filler verbs (elevate / seamless / unleash / next-gen)
 *  - prices are plausible service prices, not invented engineering precision
 *
 * ---------------------------------------------------------------------------
 * WHAT IS CONFIRMED AND WHAT IS STILL MISSING
 * ---------------------------------------------------------------------------
 * Confirmed, and safe to present as fact: Crowned by Nat. Installs performed
 * by Nat. The crest in public/brand is the studio's official logo. Where she
 * works is whatever the dashboard's Locations say.
 *
 * NOT supplied yet, and therefore deliberately EMPTY rather than invented: the
 * studio street address and phone number. Every component reads these through
 * the helpers below and renders nothing at all when a value is missing, which
 * is the only honest option. A made-up phone number on a live site is a real
 * stranger's phone.
 */

import { SERVICE_CATEGORY_OF, type HomeSectionId } from "@/lib/cms/defaults";
import { fillPlaceholders, splitParagraphs, type Place } from "@/lib/cms/model";
import { PLACES, SITE } from "@/lib/cms/published";
import {
  getFinish,
  getInstallType,
  type FinishId,
  type InstallTypeId,
} from "@/lib/taxonomy";

/**
 * WHERE NAT WORKS: the active locations from the dashboard, the current one
 * first. The announcement stripe, the footer, the "Where" rows on /book, the
 * page metadata and the LocalBusiness structured data all derive from these,
 * and copy names a town only through the {current location} placeholders
 * (lib/cms/defaults.ts). Do not re-type a town name into copy; that is how
 * the site ends up advertising a chair that is not open.
 *
 * Empty when Nat has switched every location off: the stripe then says the
 * chair is between studios, and nothing names a town.
 */
export const LOCATIONS: readonly Place[] = PLACES.active;

/** The current location, or null while every chair is closed. */
export const PRIMARY_LOCATION: Place | null = PLACES.primary;
export const ADDITIONAL_LOCATIONS: readonly Place[] = PLACES.others;

/** "Towson, MD", or "" with nothing open. */
export const PRIMARY_LOCATION_LABEL = PLACES.current;
export const ADDITIONAL_LOCATION_LABELS = ADDITIONAL_LOCATIONS.map((location) => location.label);

export const STUDIO = {
  /** The brand name. Used verbatim everywhere it appears. */
  name: SITE.business.name,
  /** Nat performs every install personally. */
  owner: SITE.business.owner,
  ownerShort: SITE.business.owner,

  /**
   * BRAND MARK, and it is the real, official one (supplied 2026-09-22 as
   * Natlogo.png, replacing both assets that used to live here).
   *
   * A rose-gold crest: a crowned "CN" monogram over the full "Crowned by Nat"
   * wordmark, on a genuinely transparent field, 800x800 (resized down from a
   * supplied 1254x1254 and re-compressed; see "The brand mark" in README.md
   * for the source). Unlike the neon-sign photo this replaced, it is NOT
   * restricted to dark surfaces: it carries its own
   * shadow and outline, so it reads cleanly on wine and on near-white paper
   * alike, which is why one file now serves the hero plate, the footer AND
   * the nav bar, and why the nav's mobile sheet draws it too instead of
   * falling back to the typographic Wordmark the way it used to.
   *
   * Same file for every size: `logoWidth`/`logoHeight` below are its real
   * pixel dimensions, used as the `<img>` intrinsic size wherever it is
   * drawn large (the hero plate, the footer); components that draw it small
   * (the nav) size it by height in their own className rather than reading a
   * second small export, since a square crest does not need cropping to
   * scale down the way the old wide lockup did.
   *
   * Set to "" to fall back to the typographic wordmark everywhere it was
   * used before this mark existed (still the admin dashboard and the
   * login/signup shell's mobile back-link; see components/wordmark.tsx).
   */
  logo: "/brand/crowned-by-nat-mark.png",
  logoWidth: 800,
  logoHeight: 800,

  /**
   * THE SAME MARK, FOR THE NAV BAR.
   *
   * One crest, one file: `navLogo` used to be a separately-exported wide crop
   * of different source artwork, because the old neon mark could not survive
   * on the nav's pale background at all. This mark can, so `navLogo` is now
   * just `logo` again, and these two width/height pairs stay identical
   * on purpose - keeping them as two constants (rather than collapsing to
   * one) is what let the nav bar's own sizing classes stay untouched by a
   * future change to the hero/footer size, and vice versa.
   */
  navLogo: "/brand/crowned-by-nat-mark.png",
  navLogoWidth: 800,
  navLogoHeight: 800,

  /**
   * THE BOOKING DESTINATION. One switch for the whole site.
   *
   * Empty string  -> every booking CTA goes to the /book page, which carries
   *                  the services and the Square scheduler. This is the
   *                  current behaviour.
   * A URL         -> every CTA instead opens that URL in a new tab.
   *
   * Nothing else needs editing; see bookingTarget() below.
   *
   * The env var is read first purely so that the switch can be flipped from
   * the Cloudflare Pages dashboard without a code change: set
   * NEXT_PUBLIC_ACUITY_BOOKING_URL and redeploy. It is NOT required for the
   * build, and it is deliberately not a dashboard field: where the booking
   * buttons go is the booking integration, and Square is its source of truth.
   *
   * This is read at BUILD time, not in the browser, so a deploy is what makes a
   * change to it take effect (Cloudflare: Deployments -> Retry deployment).
   * Turbopack leaves this as a lookup against its own bundled process shim
   * rather than inlining a literal, which is why the `??` matters. Without it
   * an unset var reaches the markup as the string "undefined".
   */
  bookingUrl: process.env.NEXT_PUBLIC_ACUITY_BOOKING_URL ?? "",

  /** Towns rather than a street, unless a street has been supplied. */
  city: LOCATIONS.map((location) => location.name).join(" and "),
  regionCode: LOCATIONS[0]?.region ?? "",

  /** No studio number supplied by default. Every "or call" fallback switches to email. */
  phone: SITE.business.phone,
  email: SITE.business.email,
  /**
   * The official profile. Every Instagram link on the site reads this: the
   * nav icon, the mobile menu, the footer, and the homepage "sameAs" data.
   * Empty switches all of them off.
   */
  instagram: SITE.seo.instagram,
  street: SITE.business.street,
  /** The booking window the studio advertises; the "Booking hours" row on /book. */
  hours: SITE.business.hours,
} as const;

/**
 * "Towson and Laurel, MD". The service area written the way a search engine
 * and a person looking for a local install both expect to read it, used in
 * the install and booking pages' descriptions. "" while nothing is open.
 */
export const SERVICE_AREA = PLACES.all;

/**
 * "call 410 555 0134" or "email crownedbynattt@gmail.com", as one fragment.
 *
 * A dozen places on this site offer a way to reach a person when a form is not
 * the right tool. Routing them all through one derived fragment means the day a
 * real studio number is added in the dashboard, every one of those sentences
 * starts saying "call" instead of "email", and until that day none of them
 * prints a number nobody owns.
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
   * used, top to bottom, so a visitor learns the button once.
   */
  book: SITE.header.cta.book,
  /**
   * The same verb, shortened, and ONLY for the button on a collection card.
   * Six cards in a grid cannot each carry the full label without the row
   * turning into a wall of repeated CTA. The collection name is appended for
   * screen readers at the call site, which keeps the accessible name ("Book
   * Deep Wave Glam") a superset of the visible one (WCAG 2.5.3).
   */
  bookStyle: SITE.header.cta.bookStyle,
  /**
   * The booking verb before a service's name ("Book Frontal Install", "Book
   * Reinstall"), so the visible label already says which appointment it
   * opens and needs no screen-reader suffix.
   */
  bookInstall: SITE.header.cta.bookService,
  /** The way into an install type's own page: "View Frontal Install". */
  viewInstall: SITE.header.cta.view,
  /**
   * The booking action on a collection PAGE, keyed by the collection's
   * `dimension`: five collections are hairstyles and Natural Lace is a
   * standard of finish, so its button must not say "Book This Style".
   */
  bookCollection: {
    style: SITE.header.cta.bookThisStyle,
    finish: SITE.header.cta.bookThisFinish,
  },
  gallery: SITE.header.cta.gallery,
  collection: SITE.header.cta.collection,
} as const;

/**
 * Appends `key=value` pairs to a booking href, keeping any query string the
 * destination already carries. Acuity links routinely arrive with one attached
 * (`...?owner=12345678`), so appending blindly with "?" would corrupt them.
 * Empty values are skipped, so an absent intent adds nothing.
 */
function withParams(href: string, params: Record<string, string | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value!)}`)
    .join("&");
  if (!query) return href;
  return `${href}${href.includes("?") ? "&" : "?"}${query}`;
}

/**
 * What the visitor chose, or was looking at, when she decided to book. All
 * optional. The two selection fields also take null, so a BookingSelection
 * from lib/taxonomy.ts can be passed straight through.
 */
export type BookingIntent = {
  /** The service axis. Frontal or closure; see lib/taxonomy.ts. */
  install?: InstallTypeId | null;
  /** The add-on axis. Curls, Wand Curls or Crimps; see lib/taxonomy.ts. */
  finish?: FinishId | null;
  /** The style axis. A collection slug, e.g. "deep-wave-glam". */
  style?: string;
};

/**
 * THE FINISH, ON ITS WAY OUT TO A SCHEDULER. A configuration seam, not a
 * guess.
 *
 * On /book the finish travels as `?finish=<id>` and lib/booking-selection.ts
 * reads it back. An external scheduler does not know that key: for the
 * finish to reach the appointment Nat receives it has to name one of her
 * intake-form questions, set as NEXT_PUBLIC_ACUITY_FINISH_FIELD (build time,
 * like the booking links). No field id is written down in this repo until
 * then.
 *
 * External links carry the finish's display name ("Wand Curls") rather than
 * its id, because an intake answer is read by a person and a dropdown option
 * matches on its visible text.
 */
const EXTERNAL_FINISH_PARAM =
  (process.env.NEXT_PUBLIC_ACUITY_FINISH_FIELD ?? "").trim() || "finish";

/**
 * The id every booking panel on /book carries: the request form, the live
 * flow and the external hand-off all render as `#request`.
 */
export const BOOKING_ANCHOR = "request";

/**
 * Resolves where a booking CTA points. Every booking CTA on the site spreads
 * these props, so the real booking link is a config change rather than a hunt
 * through markup.
 *
 * The destination is the first of these that is set:
 *
 *   1. the install type's own link   NEXT_PUBLIC_ACUITY_FRONTAL_URL / _CLOSURE_URL
 *   2. the studio-wide link          STUDIO.bookingUrl
 *   3. the on-page booking page      /book/
 *
 *   bookingTarget()                            -> /book/
 *   bookingTarget({ install: "frontal" })      -> /book/?install=frontal
 *   bookingTarget({ install: "frontal", finish: "curls" })
 *                                              -> /book/?install=frontal&finish=curls
 *   bookingTarget({ style: "deep-wave-glam" }) -> /book/?style=deep-wave-glam
 *
 * A finish never picks the destination. It is an add-on to an install type,
 * not an appointment type of its own, so it only ever rides along on the
 * install's link (under EXTERNAL_FINISH_PARAM once that link is external).
 * Under `output: "export"` an unread query string is ignored by the static
 * route, so nothing breaks from the parameters' presence.
 */
export function bookingTarget({ install, finish, style }: BookingIntent = {}) {
  const external =
    (install ? getInstallType(install).bookingUrl.trim() : "") ||
    STUDIO.bookingUrl.trim();

  if (external) {
    return {
      href: withParams(external, {
        install: install ?? undefined,
        [EXTERNAL_FINISH_PARAM]: finish ? getFinish(finish).label : undefined,
        style,
      }),
      target: "_blank" as const,
      rel: "noopener noreferrer",
    };
  }

  return {
    href: withParams("/book/", {
      install: install ?? undefined,
      finish: finish ?? undefined,
      style,
    }),
  };
}

/**
 * Where a button that names ONE service points: that service's own booking
 * page, which shows its photographs and the scheduler and nothing else
 * (components/service-booking.tsx). Every individual "Book Frontal Install"
 * or "Book Reinstall" button spreads this.
 *
 * "Book Your Chair" does not, on purpose. It is the general way in, so it
 * keeps bookingTarget() above and lands on the whole menu at /book.
 *
 *   serviceBookingTarget("closure-install")
 *     -> /book/closure-install/
 *   serviceBookingTarget("closure-install", { finish: "curls" })
 *     -> /book/closure-install/?finish=curls
 */
export function serviceBookingTarget(
  id: ServiceId,
  { finish = null }: { finish?: FinishId | null } = {},
) {
  const { installType } = getService(id);
  const intent = { install: installType, finish: installType ? finish : null };
  const target = bookingTarget(intent);
  if ("target" in target) return target;
  return {
    href: withParams(serviceBookingPath(id), { finish: intent.finish ?? undefined }),
  };
}

/** True while booking runs through the form on /book rather than an external tool. */
export const usesOnPageBooking = STUDIO.bookingUrl.trim() === "";

/**
 * Four destinations, four pages, in the order a visitor needs them: see the
 * work, find out what the appointment involves, check other people's word for
 * it, then meet the person doing it. The addresses are fixed; the labels are
 * Nat's (dashboard, Website content).
 *
 * The booking CTA is deliberately NOT in this list. It is the site's single
 * primary action and it renders as a filled pill beside the links.
 *
 * There is no Admin entry here and there will not be one. Nat reaches her
 * dashboard by bookmarking /admin/login/.
 */
export const NAV_LINKS = [
  { label: SITE.header.nav.gallery, href: "/gallery/" },
  { label: SITE.header.nav.beforeYouBook, href: "/before-you-book/" },
  { label: SITE.header.nav.reviews, href: "/reviews/" },
  { label: SITE.header.nav.meetNat, href: "/meet-nat/" },
] as const;

/** "Home", first in the mobile menu and the footer's page list. */
export const NAV_HOME = SITE.header.nav.home;

/**
 * Per page kicker, title and lede. One place to review every page opening.
 */
export const PAGES = {
  gallery: { kicker: SITE.gallery.kicker, title: SITE.gallery.title, lede: SITE.gallery.lede },
  book: { kicker: SITE.book.kicker, title: SITE.book.title, lede: SITE.book.lede },
  beforeYouBook: {
    kicker: SITE.beforeYouBook.kicker,
    title: SITE.beforeYouBook.title,
    lede: SITE.beforeYouBook.lede,
  },
  reviews: { kicker: SITE.reviews.kicker, title: SITE.reviews.title, lede: SITE.reviews.lede },
  meetNat: { kicker: SITE.meetNat.kicker, title: SITE.meetNat.title, lede: SITE.meetNat.lede },
  /** app/not-found.tsx: an old link, a mistyped address, a removed page. */
  notFound: SITE.notFound,
} as const;

/**
 * Titles and descriptions for search results and link previews. The page
 * titles are followed by "| Crowned by Nat" by the root layout's template.
 */
export const SEO = SITE.seo;

/**
 * HOMEPAGE ONLY.
 *
 * The homepage carries the slideshow, then the blocks below in the order Nat
 * set (HOME_SECTIONS). Anything that needs a paragraph to explain belongs on
 * its own page. `closing` is the wine band that ends the inner pages.
 */
export const HOME = {
  /** The three install types. Their names and lines come from lib/taxonomy.ts. */
  installs: SITE.home.installs,
  /** The STYLE axis: the hair being browsed, not a service. */
  collections: SITE.home.collections,
  featured: SITE.home.featured,
  closing: SITE.header.closing,
} as const;

/** The homepage blocks under the slideshow that are switched on, in Nat's order. */
export const HOME_SECTIONS: readonly HomeSectionId[] = SITE.home.sections
  .filter((section) => section.visible)
  .map((section) => section.id as HomeSectionId);

/**
 * The top of the homepage. The slideshow's words are per slide (HERO_SLIDES
 * in lib/images.ts); `brand` is the carousel's accessible name.
 */
export const HERO = {
  brand: STUDIO.name,
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
  lead: SITE.header.announcement.lead,
  /** What the studio does, in three words. Runs in every state. */
  service: SITE.header.announcement.service,
  /**
   * Runs in place of the lead and the towns when every chair is closed, as two
   * segments. Never falls back to a town name.
   */
  closed: [SITE.header.announcement.closedFirst, SITE.header.announcement.closedSecond],
} as const;

/** The footer's own words. The towns, links and contact details are read elsewhere. */
export const FOOTER = SITE.header.footer;

/**
 * The three assurances on /meet-nat. The icons are fixed by position; the
 * words are Nat's. None of them is a guarantee a customer could hold the
 * business to: what is here describes how the appointment is run.
 */
const ASSURANCE_ICONS = ["hand", "heart", "arrows"] as const;

export const ASSURANCES = SITE.meetNat.assurances.map((item, index) => ({
  icon: ASSURANCE_ICONS[index] ?? "hand",
  title: item.title,
  body: item.body,
}));

/**
 * The explainer that only the Natural Lace page shows. Natural Lace is the one
 * collection that is not a hairstyle; this block says so in the client's
 * language and describes only what is visible in the photographs above it.
 */
export const FINISH_FOCUS = SITE.gallery.finishFocus;

/**
 * The one place the site explains its own filing system, above the six
 * collection cards on /gallery.
 */
export const GALLERY_AXES = {
  heading: SITE.gallery.axesHeading,
  body: SITE.gallery.axesBody,
  axes: SITE.gallery.axes,
} as const;

/** Wording shared by every collection page, so six pages cannot drift into six voices. */
export const COLLECTION_PAGE = {
  back: SITE.gallery.back,
  gallery: SITE.gallery.galleryHeading,
  galleryHint: SITE.gallery.galleryHint,
  related: SITE.gallery.related,
  cta: {
    heading: SITE.gallery.ctaHeading,
    body: SITE.gallery.ctaBody,
  },
  /** The eyebrow over a collection's name, and the badge on the finish collection's card. */
  styleLabel: SITE.gallery.styleLabel,
  laceFinishLabel: SITE.gallery.laceFinishLabel,
} as const;

/**
 * The words around the booking selection: install, then finish, then the
 * button. Used on each install page, where the first step is a switch between
 * the three install pages rather than a question
 * (components/install-selector.tsx). The install and finish names come from
 * lib/taxonomy.ts; these are only the words that frame them.
 *
 * Install and finish are both required to book, and neither says
 * "(Required)": an unmarked step is required, and Style, the one that is not,
 * is the only one marked "(Optional)".
 *
 * The finish's `optional`/`none`, `addOns` and `book.style` belong to the
 * dormant request form and booking flow (components/booking.tsx,
 * components/booking/), which no page links to, so they are not in the
 * dashboard.
 */
const SELECTION_COPY = SITE.installs.selection;

export const SELECTION = {
  install: {
    heading: SELECTION_COPY.installHeading,
    body: SELECTION_COPY.installBody,
  },
  finish: {
    heading: SELECTION_COPY.finishHeading,
    body: SELECTION_COPY.finishBody,
    optional: "Optional",
    /** The empty choice in the request form's finish menu. */
    none: "No finish",
  },
  addOns: {
    heading: "Anything to add?",
    body: "Optional extras for your appointment. Pick as many as you like, or skip this step.",
    optional: "Optional",
  },
  /**
   * The free-text step between the finish and the booking panel: a specific
   * cut, length, colour or reference look, in the visitor's own words. Always
   * optional, and never a service of its own.
   */
  style: {
    heading: SELECTION_COPY.styleHeading,
    body: SELECTION_COPY.styleBody,
    optional: SELECTION_COPY.styleOptional,
    placeholder: SELECTION_COPY.stylePlaceholder,
    /** Shown only once the textarea is close to maxStyleLength; see there. */
    charsLeft: (n: number) => `${n} character${n === 1 ? "" : "s"} left`,
  },
  book: {
    heading: SELECTION_COPY.bookHeading,
    install: SELECTION_COPY.bookInstall,
    finish: SELECTION_COPY.bookFinish,
    /** Shared with the notes line sent to Nat and the confirm-step summary. */
    style: "Style",
    noInstall: SELECTION_COPY.noInstall,
    noFinish: SELECTION_COPY.noFinish,
    needInstall: SELECTION_COPY.needInstall,
    needFinish: SELECTION_COPY.needFinish,
    needBoth: SELECTION_COPY.needBoth,
  },
  stepOf: (step: number, total: number) => `Step ${step} of ${total}: `,
} as const;

/**
 * The style description's ceiling: long enough for a genuine "12-inch layered
 * bob with a middle part, soft waves, no bangs" description, short enough
 * that the request stays something Nat can read at a glance. Enforced natively
 * via the textarea's `maxLength`, and surfaced to the visitor only once she is
 * close to it (see SELECTION.style.charsLeft).
 */
export const MAX_STYLE_DESCRIPTION_LENGTH = 500;

/**
 * The three install pages. Everything specific to one install lives on its
 * entry in lib/taxonomy.ts (its "how it works" and examples headings among
 * it); this is the wording all three share, so they cannot drift into three
 * voices.
 */
export const INSTALL_PAGE = {
  eyebrow: SITE.installs.eyebrow,
  toFinish: SITE.installs.toFinish,
  /** Heading over the remaining install types. Reads fine whether one or two remain. */
  other: SITE.installs.otherHeading,
  gallery: SITE.installs.galleryLink,
} as const;

/**
 * THE SERVICE MENU, AND THE ONE PLACE A PRICE IS WRITTEN DOWN.
 *
 * Seven services, filed under four headings the customer sees them in. Nat
 * sets their names, prices, descriptions, order and whether each is offered
 * from the dashboard (Services & pricing); this is that, in the shape every
 * page reads: the services menu on /book, each service's own booking page and
 * the LocalBusiness structured data.
 *
 *   Wig Installs     Frontal Install, Closure Install
 *   Reinstalls       Frontal Reinstall, Closure Reinstall
 *   Color Services   Color Frontal Install, Color Closure Install
 *   Services         Wig Touch Up
 *
 * "Reinstalls" is a public category name. Wig Touch Up is a separate service
 * and is NOT a reinstall: the two are different appointments and the site must
 * never file one under the other. Which heading a service is under, and which
 * finishes it takes, is structure and stays in code (SERVICE_CATEGORY_OF in
 * lib/cms/defaults.ts, SERVICE_INSTALL_TYPE below); Nat renames the headings.
 *
 * SQUARE TAKES THE BOOKING. Its own menu, prices and lengths are what a client
 * actually books and pays; nothing here changes them. The dashboard says so
 * beside every price, and lists what to change in Square when a published
 * price or name differs.
 *
 * Money is held in CENTS and time in MINUTES, rendered by formatPrice and
 * formatDuration in lib/format.ts. A service with no length set carries null.
 *
 * `installType` is the finish axis (lib/taxonomy.ts) this service belongs to,
 * or null when it has no finish to choose: the six installs have one, Wig
 * Touch Up does not.
 */

/**
 * The seven services, by the slug each one shares with its row in the
 * `services` table. Square's own menu lists them under the same names, so a
 * service named here is the one a visitor taps in the scheduler. Also the
 * values a photograph's "booking pages" can hold (`booking_services`,
 * migration 0010) and the segment of each service's own booking page,
 * /book/<id>/.
 */
export type ServiceId =
  | "frontal-install"
  | "closure-install"
  | "frontal-reinstall"
  | "closure-reinstall"
  | "color-frontal-install"
  | "color-closure-install"
  | "wig-touch-up";

export type ServiceEntry = {
  id: ServiceId;
  name: string;
  /** The heading it is filed under, as Nat names it. */
  category: string;
  priceCents: number;
  durationMinutes: number | null;
  body: string;
  installType: InstallTypeId | null;
  /** False when Nat has taken it off the menu. Its booking page still exists, and says so. */
  active: boolean;
};

const SERVICE_INSTALL_TYPE: Record<ServiceId, InstallTypeId | null> = {
  "frontal-install": "frontal",
  "closure-install": "closure",
  "frontal-reinstall": "wig-touch-up",
  "closure-reinstall": "wig-touch-up",
  "color-frontal-install": "frontal",
  "color-closure-install": "closure",
  "wig-touch-up": null,
};

const SERVICE_IDS = Object.keys(SERVICE_INSTALL_TYPE) as ServiceId[];

/** Every service, offered or not, in Nat's menu order. */
export const SERVICES: readonly ServiceEntry[] = SITE.services.items.flatMap((item) => {
  const id = SERVICE_IDS.find((candidate) => candidate === item.id);
  if (!id) return [];
  return [
    {
      id,
      name: item.name,
      category: SITE.services.categories[SERVICE_CATEGORY_OF[id]],
      priceCents: item.price,
      durationMinutes: item.minutes > 0 ? item.minutes : null,
      body: item.description,
      installType: SERVICE_INSTALL_TYPE[id],
      active: item.active,
    },
  ];
});

/** The services on the menu now. */
export const ACTIVE_SERVICES: readonly ServiceEntry[] = SERVICES.filter((service) => service.active);

/** The heading and sentence over the menu on /book. */
export const SERVICES_MENU = {
  heading: SITE.services.heading,
  intro: SITE.services.intro,
} as const;

/**
 * The categories, in the order the customer sees them: the order their first
 * service comes in.
 */
export const SERVICE_CATEGORIES: readonly string[] = [
  ...new Set(SERVICES.map((service) => service.category)),
];

/** Services grouped under their headings, in menu order. */
export function servicesByCategory(
  services: readonly ServiceEntry[],
): { category: string; items: ServiceEntry[] }[] {
  return [...new Set(services.map((service) => service.category))].map((category) => ({
    category,
    items: services.filter((service) => service.category === category),
  }));
}

/**
 * The service an install type books by default: the plain frontal, the plain
 * closure and the frontal reinstall. Fixed rather than "the first in the
 * menu", so reordering the menu never sends "Book Frontal Install" to the
 * colour service. The customer can switch to the colour or the closure
 * variant on the booking page itself.
 */
const BASE_SERVICE: Record<InstallTypeId, ServiceId> = {
  frontal: "frontal-install",
  closure: "closure-install",
  "wig-touch-up": "frontal-reinstall",
};

export function baseServiceForInstallType(installType: InstallTypeId): ServiceId {
  return BASE_SERVICE[installType];
}

/**
 * A service from untrusted text, such as a URL segment or a value read back
 * from the database, or null. The one place an arbitrary string becomes a
 * service, the same job parseInstallType does for an install type.
 */
export function parseServiceId(value: unknown): ServiceId | null {
  return SERVICES.find((service) => service.id === value)?.id ?? null;
}

export function getService(id: ServiceId): ServiceEntry {
  // SERVICES carries every ServiceId (lib/cms/model.ts puts back any missing), so this cannot miss.
  return SERVICES.find((service) => service.id === id)!;
}

/** The services filed under one heading, in menu order. */
export function servicesInCategory(category: string): readonly ServiceEntry[] {
  return SERVICES.filter((service) => service.category === category);
}

/** A service's own booking page, /book/<id>/ (see app/book/[service]/page.tsx). */
export function serviceBookingPath(id: ServiceId): string {
  return `/book/${id}/`;
}

/**
 * The service whose booking page a path is, or null on any other page.
 * Either spelling of the trailing slash, as installTypeForPath accepts.
 */
export function serviceForPath(pathname: string): ServiceId | null {
  const match = /^\/book\/([^/]+)\/?$/.exec(pathname);
  return match ? parseServiceId(match[1]) : null;
}

/** Verb labels, never "Step 1 / Stage 1". The appointment, on /before-you-book. */
export const PROCESS = SITE.beforeYouBook.process;
export const PROCESS_HEADING = SITE.beforeYouBook.processHeading;

/**
 * ABOUT NAT, in her own words. The credentials are only things that are true
 * because of how the business is structured; a regulated claim (a licence, a
 * training) belongs here only in Nat's own wording.
 */
export const OWNER = {
  paragraphs: splitParagraphs(SITE.meetNat.bio),
  credentials: SITE.meetNat.credentials,
  /** "Reach Nat:", before the contact link under the biography. */
  reach: SITE.meetNat.reachLabel,
} as const;

/**
 * THE REVIEWS, AND THE NOTICE BESIDE THEM.
 *
 * The site launched with written stand-ins, not real client feedback, and the
 * page shows a visible "sample wording" notice while testimonialsArePlaceholder
 * is true. Presenting invented quotes as real reviews is deceptive, and in the
 * US it is squarely what the FTC endorsement rules prohibit, so the dashboard
 * refuses to switch the notice off while the three stand-ins are still there.
 */
export const testimonialsArePlaceholder = SITE.reviews.placeholder;
export const TESTIMONIALS = SITE.reviews.items;
export const REVIEWS_NOTICE = SITE.reviews.placeholderNotice;

/**
 * THE QUESTIONS, AND THE POLICIES IN THEIR ANSWERS.
 *
 * The answers describe how an appointment runs, how long an install lasts, and
 * what happens when someone cancels. While policiesAreDraft is true,
 * /before-you-book carries a visible notice saying they are not confirmed:
 * a policy a customer relies on and the business has never agreed to is worse
 * than no policy at all. Nat switches it off in the dashboard once she has
 * read every answer and said yes to it.
 */
export const policiesAreDraft = SITE.faq.draft;
export const FAQ = {
  heading: SITE.faq.heading,
  draftNotice: SITE.faq.draftNotice,
} as const;

export const QUESTIONS = SITE.faq.items.map((item) => ({ q: item.question, a: item.answer }));

/** The scheduler panel on /book, and the studio details beside it. */
export const BOOKING = {
  heading: SITE.book.heading,
  body: SITE.book.body,
  labels: {
    currentLocation: SITE.book.currentLocationLabel,
    alsoServing: SITE.book.alsoServingLabel,
    hours: SITE.book.hoursLabel,
    reach: SITE.book.reachLabel,
  },
} as const;

/** What the Square scheduler's frame says while it loads, or if it cannot. */
export const SCHEDULER = {
  loading: SITE.book.schedulerLoading,
  error: SITE.book.schedulerError,
  errorContact: SITE.book.schedulerErrorContact,
} as const;

/**
 * A service's own booking page, /book/<service>/: the one service the visitor
 * chose, photographs of it, and the scheduler (components/service-booking.tsx).
 * The service's name, category, price and description are its entry in
 * SERVICES; these are only the words around them. `{service}`, `{finish}` and
 * `{install type}` in Nat's wording are filled in per page.
 *
 * THE SCHEDULER CANNOT BE TOLD WHICH SERVICE. Square's embed opens on Nat's
 * whole menu whatever page it sits on, so the steps say which line to tap
 * rather than pretending it is already chosen. They name things the way her
 * live Square menu does: the seven services under the same names as SERVICES,
 * and the finishes under one add-on, "Styling", filed under "Add ons".
 */
const SERVICE_PAGE = SITE.serviceBooking;

export const SERVICE_BOOKING = {
  back: SERVICE_PAGE.back,
  /** Skips down the page to the scheduler. */
  toScheduler: SERVICE_PAGE.toScheduler,
  price: SERVICE_PAGE.price,
  /** For screen readers: names the switch between the services in one category. */
  switchLabel: (category: string) => `Services in ${category}`,
  /** Read out after the switch changes the service without reloading the page. */
  switched: (name: string) => `Now showing ${name}.`,
  photos: {
    heading: (name: string) => fillPlaceholders(SERVICE_PAGE.photosHeading, { service: name }),
    hint: SERVICE_PAGE.photosHint,
    /**
     * Over the photographs a reinstall page borrows from the broader
     * Reinstalls install type, when none is tagged with the service itself.
     * Says so, so a closure reinstall is never passed off as a frontal one.
     */
    borrowed: (name: string, label: string) =>
      fillPlaceholders(SERVICE_PAGE.photosBorrowed, {
        service: name,
        "install type": label.toLowerCase(),
      }),
    emptyHeading: SERVICE_PAGE.photosEmptyHeading,
    empty: (name: string) => fillPlaceholders(SERVICE_PAGE.photosEmpty, { service: name }),
    gallery: SERVICE_PAGE.photosGallery,
  },
  scheduler: {
    heading: SERVICE_PAGE.schedulerHeading,
    finish: SERVICE_PAGE.finishLabel,
    style: SERVICE_PAGE.styleNotesLabel,
    step1: (name: string) => fillPlaceholders(SERVICE_PAGE.step1, { service: name }),
    step2: (finish: string) => fillPlaceholders(SERVICE_PAGE.step2, { finish }),
    step3: SERVICE_PAGE.step3,
  },
  /** When this service is off the menu. */
  unavailable: SERVICE_PAGE.unavailable,
} as const;

/**
 * ---------------------------------------------------------------------------
 * ACCOUNTS, BOOKING AND ADMIN
 * ---------------------------------------------------------------------------
 * Added with the booking system. Customer accounts are switched off
 * (customerAccountsLinked in lib/supabase/client.ts) and the booking flow is
 * not linked from any page since Square took over, so these screens are
 * dormant and their words are not in the dashboard.
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
 * The booking flow, step by step. Dormant since Square took over (see above).
 */
export const BOOKING_FLOW = {
  title: "Book your chair.",
  steps: [
    { id: "service", label: "Service", heading: "What are we doing?" },
    { id: "add-ons", label: "Add-ons", heading: "Anything to add?" },
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
