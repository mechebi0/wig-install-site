import {
  FINISH_PHOTOS,
  INSTALL_PHOTOS,
  type Photo,
} from "@/lib/collections";

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
 *                  Install, a Closure Install, or a Wig Touch-up. This is the
 *                  booking / service classification, and it is defined HERE
 *                  and nowhere else. "What are we doing?"
 *
 *                  The name is inherited from when there were only two, both
 *                  fresh installs. A touch-up lays no lace; it restyles a unit
 *                  already installed, Nat's own work or someone else's. It
 *                  sits in this same type rather than a parallel one because
 *                  it shares the exact shape the other two do - one primary
 *                  service, one required finish, one optional style note -
 *                  and giving it a second axis would just be two lists for
 *                  one choice. "Install" here means "the three things you can
 *                  book", not "lace was laid".
 *
 *   FINISH         how the appointment is styled on the day. Curls, Wand
 *                  Curls or Crimps. An add-on to an install type, never a
 *                  service of its own: there is no "Frontal Curls" and no
 *                  "Wig Touch-up Curls" appointment, there is a Frontal
 *                  Install with Curls and a Wig Touch-up with Curls. Also
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
 * Every consumer that needs to say "frontal", "closure", "wig touch-up" or a
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
  styleDescription: string;
};

export type InstallType = {
  id: InstallTypeId;
  /** Display name, used verbatim on every surface. */
  label: string;
  /**
   * The same word without "Install", for a tag on a photograph where the
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
  /** Four short facts for the "how it works" band on the page. */
  highlights: readonly { title: string; body: string }[];
  /**
   * The photograph the page and the booking card lead with. See
   * INSTALL_PHOTOS in lib/collections.ts for why the two are chosen
   * differently, and why the closure one is an illustration of the look.
   */
  image: Photo;
  /**
   * `object-position` for that photograph wherever this install leads with
   * it: its page hero (5:6), its card on /book (square at desktop) and the
   * cross-link card. Its own value rather than the gallery's `focalPosition`,
   * which is tuned for a 3:4 cell and in these wider frames would slice
   * Nat's neon sign in half along the top edge.
   */
  imageFocal: string;
  /**
   * One line under that photograph, saying what is visible in it. Written as
   * a description of the frame, never as a claim about what the client in it
   * booked.
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
  /**
   * Nat's photograph of this finish, where the set has one. Optional on
   * purpose: an option without a real photograph renders a plain swatch
   * rather than a borrowed one. See FINISH_PHOTOS in lib/collections.ts.
   */
  image?: Photo;
  /** `object-position` for the swatch crop, measured off the file. */
  imageFocal?: string;
};

/** The display names, for the places that hold an id and need the words. */
export const INSTALL_TYPE_LABELS: Record<InstallTypeId, string> = {
  frontal: "Frontal Install",
  closure: "Closure Install",
  "wig-touch-up": "Wig Touch-up",
};

/** Every finish can be added to any of the three. */
const ALL_FINISHES: readonly FinishId[] = ["curls", "wand-curls", "crimps"];

/** The three, in the order every surface shows them. */
export const INSTALL_TYPES: readonly InstallType[] = [
  {
    id: "frontal",
    label: INSTALL_TYPE_LABELS.frontal,
    shortLabel: "Frontal",
    summary: "Professional frontal wig installation performed by Nat.",
    href: "/installs/frontal/",
    tagline: "Ear to ear. Any parting. Every edge laid.",
    description:
      "A frontal is a band of lace that runs across the whole front of the hairline, from one ear to the other. Nat tints it to your skin and lays every edge, so the parting can sit anywhere and the hair can be worn back off your face.",
    metaDescription:
      "Lace from ear to ear, tinted to your skin, with every edge laid and the parting wherever you want it.",
    highlights: [
      {
        title: "Lace ear to ear",
        body: "The lace runs the full width of the hairline, so there is no track at the front to hide.",
      },
      {
        title: "Any parting",
        body: "Middle, side or a deep side part. The parting is not fixed to one spot.",
      },
      {
        title: "Worn back",
        body: "Slick-backs, half-up styles and braided fronts, with the hairline on show.",
      },
      {
        title: "More upkeep",
        body: "More lace at the hairline to look after between appointments than a closure has.",
      },
    ],
    image: INSTALL_PHOTOS.frontal,
    // Keeps the sign whole at the top and the swooped hairline mid-frame.
    imageFocal: "center 30%",
    imageCaption:
      "A deep side part with the hairline laid right across. Only ear-to-ear lace does that.",
    examplesNote:
      "Every look here shows lace laid past the parting, which only a frontal allows.",
    finishes: ALL_FINISHES,
    bookingUrl: process.env.NEXT_PUBLIC_ACUITY_FRONTAL_URL ?? "",
  },
  {
    id: "closure",
    label: INSTALL_TYPE_LABELS.closure,
    shortLabel: "Closure",
    summary: "Professional closure wig installation performed by Nat.",
    href: "/installs/closure/",
    tagline: "One parting. Less lace. Lower upkeep.",
    description:
      "A closure is a smaller piece of lace set where the hair parts, with the rest of the unit built on wefts. Nat tints it and lays it flat, so the parting reads as scalp while the hair frames your face.",
    metaDescription:
      "A lace closure at the parting, tinted and laid flat, with less lace to manage and lower upkeep than a frontal.",
    highlights: [
      {
        title: "Lace at the parting",
        body: "A smaller square of lace where the hair parts. The rest of the unit is built on wefts.",
      },
      {
        title: "A set parting",
        body: "Made for a middle or slight side part that sits inside the lace.",
      },
      {
        title: "Less to manage",
        body: "Less lace to lay and less adhesive at the hairline, so upkeep between visits is lower.",
      },
      {
        title: "Gentle on edges",
        body: "Less of the hairline is glued down, which is gentler on a tender scalp.",
      },
    ],
    image: INSTALL_PHOTOS.closure,
    // Higher than the frontal's: this sign hangs closer to the top of the
    // file, and in the square card on /book 30% grazed its glow.
    imageFocal: "center 15%",
    imageCaption:
      "A centre part laid flat, the hair falling over the temples: the look a closure is built around.",
    examplesNote: "",
    finishes: ALL_FINISHES,
    bookingUrl: process.env.NEXT_PUBLIC_ACUITY_CLOSURE_URL ?? "",
  },
  {
    id: "wig-touch-up",
    label: INSTALL_TYPE_LABELS["wig-touch-up"],
    shortLabel: "Touch-up",
    summary: "Professional wig touch-up and restyle performed by Nat.",
    href: "/installs/wig-touch-up/",
    tagline: "Same unit. Fresh finish. Ready again.",
    description:
      "A touch-up is for the style, not the install: Nat resets the pattern you already have, whether that means fresh curls, a new part, or bringing shape back to hair that has gone flat. Tell her the look you want and she will tell you straight whether the unit can get there.",
    metaDescription:
      "A style reset on a wig you already have, in the finish and look you choose, checked first by Nat.",
    highlights: [
      {
        title: "A style reset",
        body: "Curls dropped, waves gone soft, or a parting that has stopped sitting right: this appointment brings the shape back.",
      },
      {
        title: "Your call on the look",
        body: "Curls, Wand Curls or Crimps, plus anything else you describe when you book.",
      },
      {
        title: "Nat does it herself",
        body: "Same one pair of hands as every other appointment. No second chair, no assistant.",
      },
      {
        title: "An honest check first",
        body: "If the unit needs more than a restyle, Nat says so before she starts rather than after.",
      },
    ],
    /*
      No photograph of a touch-up exists yet, the same gap Closure had at
      launch (see the note on INSTALL_PHOTOS in lib/collections.ts). This
      borrows an existing look rather than inventing one: an illustration of
      the kind of finish a touch-up brings back, captioned as exactly that,
      not as a record of what this client booked.
    */
    image: INSTALL_PHOTOS["wig-touch-up"],
    imageFocal: "center 43%",
    imageCaption:
      "A finished look: the kind of shape and shine a touch-up brings back.",
    examplesNote: "",
    finishes: ALL_FINISHES,
    bookingUrl: process.env.NEXT_PUBLIC_ACUITY_TOUCHUP_URL ?? "",
  },
];

/**
 * The three finishes, in the order every surface shows them.
 *
 * The swatch crops are chosen per photograph. A bob's curl sits around the
 * face, so that crop keeps the head in; the crimp runs down the lengths, so
 * that crop drops to them.
 */
export const FINISHES: readonly Finish[] = [
  {
    id: "curls",
    label: "Curls",
    description: "Soft, full curls set through the lengths for movement and volume.",
    image: FINISH_PHOTOS.curls,
    imageFocal: "center 55%",
  },
  {
    id: "wand-curls",
    label: "Wand Curls",
    description:
      "Defined spiral curls wrapped around a wand, from the mid-lengths to the ends.",
    image: FINISH_PHOTOS["wand-curls"],
  },
  {
    id: "crimps",
    label: "Crimps",
    description: "A tight, crimped texture pressed through the lengths.",
    image: FINISH_PHOTOS.crimps,
    imageFocal: "center 90%",
  },
];

/**
 * An install type from untrusted text, such as a query-string value, or null.
 * The one place an arbitrary string is checked against the two ids, so a typo
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
