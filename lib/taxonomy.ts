import { type AddOnId } from "@/lib/booking/add-ons";
import { SITE } from "@/lib/cms/published";

/**
 * WHAT A CLIENT BOOKS: the primary service, and the finish she adds to it.
 *
 * ---------------------------------------------------------------------------
 * THE AXES, KEPT APART
 * ---------------------------------------------------------------------------
 * This site describes a wig appointment along independent axes, and the whole
 * point of this file is that they never share a list.
 *
 *   INSTALL TYPE   which of the three primary services this is: a Frontal
 *                  Install, a Closure Install, or Reinstalls. This is the
 *                  booking / service classification, and it is defined HERE
 *                  and nowhere else. "What are we doing?"
 *
 *                  The word "Install" is inherited from when there were only
 *                  two, both fresh installs. The third lays no lace; it
 *                  restyles a unit already installed, Nat's own work or
 *                  someone else's. It sits in this same type rather than a
 *                  parallel one because it shares the exact shape the other
 *                  two do - one primary service, one required finish, one
 *                  optional style note - and giving it a second axis would
 *                  just be two lists for one choice. "Install" here means
 *                  "the three things you can book", not "lace was laid".
 *
 *   FINISH         how the appointment is styled on the day. Curls, Wand
 *                  Curls or Crimps. An add-on to an install type, never a
 *                  service of its own: there is no "Frontal Curls" and no
 *                  "Reinstall Curls" appointment, there is a Frontal
 *                  Install with Curls and a Reinstall with Curls. Also
 *                  defined HERE. "How would you like it styled?" Required
 *                  whenever one of the three is being booked; the two
 *                  services outside this type (Customization only, Reinstall
 *                  and refresh) have no finish to require.
 *
 *   STYLE / LOOK   what the hair looks like: deep wave, sleek straight, bob,
 *                  body wave, colour. That lives in lib/collections.ts beside
 *                  the photographs, and it is inspiration rather than a
 *                  service. A body wave is a style; a frontal is an install
 *                  type; a body-wave frontal is both.
 *
 * A FINISH here is not the LACE FINISH in lib/collections.ts (Natural Lace,
 * Melted Hairline and the rest). That one is a quality you can see in a
 * photograph; this one is something you ask for when you book.
 *
 * Every consumer that needs to say "frontal", "closure", "reinstalls" or a
 * finish name reads it from here: the homepage install panel, the three
 * install pages, the booking flow on /book, the booking service names in
 * lib/content.ts, the install label on a gallery photograph, and the booking
 * link builder. Nothing else types the words, so the taxonomy cannot drift.
 *
 * The install ids are the same words the `services` table and SERVICES in
 * lib/content.ts already use as slugs, so a booking row and an install type
 * are the same key with no translation layer between them.
 *
 * ---------------------------------------------------------------------------
 * WHERE ACUITY PLUGS IN, LATER
 * ---------------------------------------------------------------------------
 * Nat has no Acuity account yet, so `bookingUrl` is "" on all three types and
 * no scheduler address is written down anywhere in this repo. When the
 * account exists, each install type becomes its own Acuity appointment type
 * and its scheduling link is supplied as a build-time environment variable
 * (named at each entry below). The finishes do NOT become appointment types
 * of their own: the chosen one travels with the install type's link as a
 * query parameter, and bookingTarget() in lib/content.ts is where that
 * parameter is named. Until then bookingTarget() sends every button to
 * /book, which is today's behaviour.
 */

export type InstallTypeId = "frontal" | "closure" | "wig-touch-up";

export type FinishId = "curls" | "wand-curls" | "crimps";

/**
 * What the booking layer is handed: one install type, one finish, and any
 * free-text style request the visitor typed in her own words.
 *
 * `installType` and `finish` are both nullable, and both nulls are
 * TRANSIENT rather than valid end states: a visitor can arrive at the
 * booking flow having chosen neither yet, but the flow will not hand over a
 * Book link, and the plain request form will not send, while either is
 * still null and the service in question is actually an install (see
 * `isInstallService` at each booking surface: an install's finish is
 * required, a non-install service like Customization only has no finish to
 * require). `styleDescription` defaults to "" rather than null: an empty
 * textarea and "nothing typed yet" are the same state, and it stays optional
 * all the way to submission, unlike the two enums above.
 *
 * `styleDescription` is NOT sent to Acuity today (see the note on
 * EXTERNAL_FINISH_PARAM in lib/content.ts) - it travels only as far as the
 * two booking paths that exist right now, folded into their notes. It sits
 * on this same selection anyway, alongside installType and finish, so a
 * future Acuity integration reads one shape for "what did she choose" rather
 * than hunting across several. See lib/booking-selection.ts for where it is
 * kept and why it never reaches the URL the other two fields do.
 */
export type BookingSelection = {
  installType: InstallTypeId | null;
  finish: FinishId | null;
  /**
   * The optional extras chosen for this appointment (After Hours, Early Bird,
   * Same-Day Customization, Styling). Empty when none are selected. Carried
   * alongside the other two so the booking flow's confirm step can price and
   * time the whole appointment, and so the notes Nat receives name them.
   *
   * The two time-window add-ons are mutually exclusive; the booking flow
   * enforces that, and parseAddOn is the one place an id is checked against
   * the four, so a stale or hand-edited value can never select something that
   * does not exist.
   */
  addOns: AddOnId[];
  styleDescription: string;
};

export type InstallType = {
  id: InstallTypeId;
  /**
   * Display name, used verbatim wherever the category itself is named: the
   * homepage card, the install's own page title and h1, the booking choice,
   * the footer link. Plural for Reinstalls, which is how the three are listed.
   */
  label: string;
  /**
   * The words that follow "Book" on a booking button: "Book Frontal
   * Install", "Book Reinstall". Identical to `label` except where the
   * category name is plural - a button cannot say "Book Reinstalls" - so the
   * singular lives here as a field on the type rather than as a special case
   * at every call site that composes a booking label.
   */
  bookLabel: string;
  /**
   * The short form of `label`, for a tag on a photograph or a pill where the
   * full name will not fit at phone width. It is only ever used next to
   * something that has already established the context is installs.
   */
  shortLabel: string;
  /** One sentence, for the homepage panel. What it is, and who does it. */
  summary: string;
  /** Its own page. Generated by app/installs/[type]/page.tsx. */
  href: string;
  /**
   * Three short beats, full stops: the italic line under the page title and
   * on its card in the booking flow. Same device as a collection tagline.
   */
  tagline: string;
  /** Two sentences for the page: what the install is, and what Nat does. */
  description: string;
  /**
   * The page's description tag, without the brand or the town. The route
   * adds both from lib/content.ts, so neither is typed twice.
   */
  metaDescription: string;
  /** The heading over `highlights`: "How a frontal works". */
  howHeading: string;
  /** Four short facts for the "how it works" band on the page. */
  highlights: readonly { title: string; body: string }[];
  /** The heading over the page's own photographs: "Frontal looks from the chair". */
  examplesHeading: string;
  /*
    The photograph the page and the booking card lead with is not here: it
    is the `install-<id>` place in the photo manager (lib/gallery.ts), so Nat
    can change it. LAUNCH_SLOTS in lib/collections.ts says why each install
    launched with the photograph it did. The two values below were written
    for that launch photograph, and are only used while it is still the one
    showing.
  */
  /**
   * `object-position` for the launch photograph wherever this install leads
   * with it: its page hero (5:6), its card on /book (square at desktop) and
   * the cross-link card. Its own value rather than the gallery's
   * `focalPosition`, which is tuned for a 3:4 cell and in these wider frames
   * would slice Nat's neon sign in half along the top edge.
   */
  imageFocal: string;
  /**
   * One line under the launch photograph, saying what is visible in it.
   * Written as a description of the frame, never as a claim about what the
   * client in it booked, which is also why it is dropped once Nat puts a
   * different photograph there: it would describe a picture nobody can see.
   */
  imageCaption: string;
  /**
   * One line over the gallery of this install on its page: why these
   * photographs count as examples. Empty while there are none.
   */
  examplesNote: string;
  /** The finishes that can be added to this install. All three today. */
  finishes: readonly FinishId[];
  /**
   * This install type's own scheduler link, or "" while none is connected.
   * Read from the environment at BUILD time, like STUDIO.bookingUrl. The `??`
   * matters: without it an unset variable reaches the markup as "undefined".
   */
  bookingUrl: string;
};

export type Finish = {
  id: FinishId;
  /** Display name, used verbatim on every surface. */
  label: string;
  /** One sentence. What it looks like, not how long it lasts. */
  description: string;
  /*
    The swatch photograph is the `finish-<id>` place in the photo manager,
    and may be empty: an option without a real photograph renders a plain
    swatch rather than a borrowed one. See LAUNCH_SLOTS in lib/collections.ts.
  */
  /** `object-position` for the launch photograph's swatch crop, measured off the file. */
  imageFocal?: string;
};

/**
 * The words for each install type: Nat's, from the dashboard (Website
 * content, Install pages), over the ones the site shipped with
 * (lib/cms/defaults.ts). Everything below that is not a word is structure
 * and stays here.
 */
const INSTALL_COPY = SITE.installs.types;

/** The display names, for the places that hold an id and need the words. */
export const INSTALL_TYPE_LABELS: Record<InstallTypeId, string> = {
  frontal: INSTALL_COPY.frontal.label,
  closure: INSTALL_COPY.closure.label,
  "wig-touch-up": INSTALL_COPY["wig-touch-up"].label,
};

/** Every finish can be added to any of the three. */
const ALL_FINISHES: readonly FinishId[] = ["curls", "wand-curls", "crimps"];

/** The three, in the order every surface shows them. */
export const INSTALL_TYPES: readonly InstallType[] = [
  {
    id: "frontal",
    ...INSTALL_COPY.frontal,
    href: "/installs/frontal/",
    // Keeps the sign whole at the top and the swooped hairline mid-frame.
    imageFocal: "center 30%",
    finishes: ALL_FINISHES,
    bookingUrl: process.env.NEXT_PUBLIC_ACUITY_FRONTAL_URL ?? "",
  },
  {
    id: "closure",
    ...INSTALL_COPY.closure,
    href: "/installs/closure/",
    // Higher than the frontal's: this sign hangs closer to the top of the
    // file, and in the square card on /book 30% grazed its glow.
    imageFocal: "center 15%",
    finishes: ALL_FINISHES,
    bookingUrl: process.env.NEXT_PUBLIC_ACUITY_CLOSURE_URL ?? "",
  },
  {
    id: "wig-touch-up",
    ...INSTALL_COPY["wig-touch-up"],
    href: "/installs/wig-touch-up/",
    /*
      No photograph of a reinstall existed at launch, the same gap Closure
      had (see LAUNCH_SLOTS in lib/collections.ts). The launch photograph
      borrows an existing look rather than inventing one: an illustration of
      the kind of finish a reinstall brings back, captioned as exactly that,
      not as a record of what this client booked.
    */
    imageFocal: "center 25%",
    finishes: ALL_FINISHES,
    bookingUrl: process.env.NEXT_PUBLIC_ACUITY_TOUCHUP_URL ?? "",
  },
];

/**
 * The three finishes, in the order every surface shows them. Their names and
 * descriptions are Nat's (dashboard, Services & pricing).
 *
 * The swatch crops are chosen per photograph. A bob's curl sits around the
 * face, so that crop keeps the head in; the crimp runs down the lengths, so
 * that crop drops to them.
 */
const FINISH_COPY = SITE.services.finishes;

export const FINISHES: readonly Finish[] = [
  { id: "curls", ...FINISH_COPY.curls, imageFocal: "center 55%" },
  { id: "wand-curls", ...FINISH_COPY["wand-curls"] },
  { id: "crimps", ...FINISH_COPY.crimps, imageFocal: "center 90%" },
];

/**
 * An install type from untrusted text, such as a query-string value, or null.
 * The one place an arbitrary string is checked against the three ids, so a typo
 * or a hand-edited URL can never select something that does not exist.
 */
export function parseInstallType(
  value: string | null | undefined,
): InstallTypeId | null {
  return INSTALL_TYPES.find((type) => type.id === value)?.id ?? null;
}

/** parseInstallType's twin for the finish. Same job, same guarantee. */
export function parseFinish(value: string | null | undefined): FinishId | null {
  return FINISHES.find((finish) => finish.id === value)?.id ?? null;
}

export function getInstallType(id: InstallTypeId): InstallType {
  // INSTALL_TYPES is keyed by the union above, so this cannot miss.
  return INSTALL_TYPES.find((type) => type.id === id)!;
}

export function getFinish(id: FinishId): Finish {
  // Same guarantee as getInstallType.
  return FINISHES.find((finish) => finish.id === id)!;
}

/**
 * The install type whose own page this is, or null on any other page.
 *
 * `trailingSlash: true` means the browser reports "/installs/frontal/" while
 * a pathname hook can hand back either spelling, so both are normalised to
 * the trailing-slash form `href` is written in before comparing.
 */
export function installTypeForPath(pathname: string): InstallTypeId | null {
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return INSTALL_TYPES.find((type) => type.href === path)?.id ?? null;
}
