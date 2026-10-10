import { SITE } from "@/lib/cms/published";
import type { SlotId } from "@/lib/site-photos";
import type { InstallTypeId } from "@/lib/taxonomy";

/**
 * THE SIX STYLE COLLECTIONS, and the photographs the site launched with.
 *
 * These are STYLES (and one lace finish): what the hair looks like. They are
 * not services. The service classification, Frontal Install or Closure
 * Install, is a separate axis defined in lib/taxonomy.ts, and a photograph
 * below carries one of the two as `installType` only where the frame itself
 * shows which it is (see the note on that field).
 *
 * Every collection card, every collection page, the related-collection rail
 * and all six sets of page metadata take their words from the array at the
 * bottom of this file. Nothing about a collection is typed twice.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE PHOTOGRAPHS COME FROM NOW
 * ---------------------------------------------------------------------------
 * Not from here. Since migration 0007 the photographs are rows in Supabase,
 * managed by Nat from /admin/photos/: which ones exist, their words and tags,
 * their order, whether they are shown, and which one fills each place on the
 * site (a collection's cover, the homepage slideshow, an install page). The
 * site reads those rows when it is built and again in the visitor's browser
 * (lib/site-photos.ts, lib/gallery.ts).
 *
 * What is left in this file under THE LAUNCH SET is the eighteen photographs
 * as the site launched with them. Migration 0007 was generated from exactly
 * these entries, and the site falls back to them only where there is no
 * database to ask: a build with no Supabase project configured, or one whose
 * database does not have 0007 yet. Editing them changes neither the live
 * site nor the database; Nat's photo manager does that.
 *
 * ---------------------------------------------------------------------------
 * THE PHOTOGRAPHY IS REAL
 * ---------------------------------------------------------------------------
 * These are not stock. Every frame is Nat's own work, shot in her own studio,
 * with her neon sign on the wall behind the chair in a good half of them. That
 * is the reason this site can look like a beauty brand rather than a template:
 * no stock library has this room, this light, or this hairline in it.
 *
 * Two things follow from the photographs being real people:
 *
 *   1. CONSENT. Nat needs each client's permission to publish her face. That
 *      is a question for Nat rather than something this file can assert, and
 *      it is flagged as outstanding.
 *   2. ALT TEXT DESCRIBES THE HAIR, NOT THE PERSON. Every alt string below is
 *      about texture, length, colour, parting and finish, because that is what
 *      a visitor who cannot see the image came for, and because characterising
 *      a client is not this site's business.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE FILES LIVE
 * ---------------------------------------------------------------------------
 * The launch set's files sit flat in `public/images/work/`, and the database
 * rows 0007 created point straight at them, so they are still served from
 * there. Each ships at three widths, all the same 3:4 crop:
 *
 *      name-1600.jpg   1600x2133   lightbox, and the hero on large screens
 *      name.jpg        1200x1600   collection heroes and gallery cells
 *      name-600.jpg     600x800    cards, thumbnails, and every phone
 *
 * Photographs Nat uploads, including any she uses to replace one of these,
 * go to Supabase Storage at the same three widths (lib/photo-processing.ts).
 * Nothing new is ever added to public/images/work/.
 */

export type Photo = {
  /** 1200w. The default `src`, and what a card or gallery cell renders. */
  src: string;
  /** 600w, for the small end of every srcSet. */
  small: string;
  /** 1600w, for the lightbox and for heroes on large screens. */
  large: string;
  width: number;
  height: number;
  alt: string;
};

const RATIO = { width: 1200, height: 1600 } as const;

/** One photograph, three widths, from one file stem. */
function photo(name: string, alt: string): Photo {
  return {
    src: `/images/work/${name}.jpg`,
    small: `/images/work/${name}-600.jpg`,
    large: `/images/work/${name}-1600.jpg`,
    alt,
    ...RATIO,
  };
}

/**
 * Every photograph, defined once and referenced by the collections below.
 *
 * A look that belongs in two collections is ONE entry here, so its alt text
 * can never say two different things about the same image.
 */
const WORK = {
  deepWaveCrimped: photo(
    "deep-wave-crimped-lengths",
    "A long deep-wave install in natural black, parted down the middle and falling well past the shoulders in tight, defined crimp",
  ),
  deepWaveBraidedFront: photo(
    "deep-wave-braided-front",
    "A deep-wave install with the front section braided back off the face and the baby hairs laid in fine curves along the hairline",
  ),
  deepWaveMiddlePart: photo(
    "deep-wave-middle-part",
    "A waist-length deep-wave install parted in the centre, the lace melted flat at the parting and the edges laid in soft swirls",
  ),
  deepWaveShoulderSweep: photo(
    "deep-wave-shoulder-sweep",
    "A shoulder-length deep-wave install with a centre parting, the wave pattern loosening from the root down through the ends",
  ),
  deepWaveMeltedPart: photo(
    "deep-wave-melted-part",
    "A long deep-wave install seen straight on, the centre parting sitting flat to the scalp with no visible lace edge",
  ),
  deepWaveLongLayers: photo(
    "deep-wave-long-layers",
    "A long deep-wave install cut into soft layers, the texture falling forward over both shoulders",
  ),
  deepWaveFrontSwirl: photo(
    "deep-wave-front-swirl",
    "A long deep-wave install in natural black, centre parted, with the baby hairs swirled along a melted hairline",
  ),

  straightCentrePart: photo(
    "straight-centre-part",
    "A long sleek straight install in natural black, pressed smooth from a clean centre parting down to a blunt baseline",
  ),
  straightGlassFinish: photo(
    "straight-glass-finish",
    "A waist-length straight install with a glass-smooth finish, the centre parting laid flat and the ends kept blunt",
  ),
  straightSideSwoop: photo(
    "straight-side-swoop",
    "A straight install with a deep side parting, one moulded swoop set across the forehead and the edges laid along the hairline",
  ),

  bobBluntSidePart: photo(
    "bob-blunt-side-part",
    "A blunt shoulder-skimming bob in natural black, side parted, with a straight and sharply cut baseline",
  ),
  bobSoftLob: photo(
    "bob-soft-lob",
    "A soft lob curved under at the ends, parted at the side, with the baby hairs laid in fine waves",
  ),
  bobBurgundyCurl: photo(
    "bob-burgundy-curl",
    "A chin-length bob in a deep burgundy brown, set into a soft curl and swept away from the face",
  ),

  bodyWaveSideSweep: photo(
    "body-wave-side-sweep",
    "A body-wave install with a deep side parting, the front section moulded into an S-wave across the forehead",
  ),
  bodyWaveCopper: photo(
    "body-wave-copper",
    "A bright copper body-wave install with a deep side parting, set into large glossy waves",
  ),

  colourPinkStraight: photo(
    "colour-pink-straight",
    "A long straight install in candy pink with a deep side parting, cut to a blunt baseline",
  ),
  colourBlondeStraight: photo(
    "colour-blonde-straight",
    "A long platinum blonde straight install parted down the middle, the lace tinted to blend away at the parting",
  ),
  colourCopperCentrePart: photo(
    "colour-copper-centre-part",
    "A warm copper install with a centre parting, worn straight through the lengths with a soft bend at the ends",
  ),
} as const;

/**
 * Which launch photograph filled each fixed place on the site. Migration 0007
 * copied these into site_photo_slots; Nat can now change any of them from the
 * photo manager, so these are the starting point, not the rule.
 *
 * Why each was chosen, since the reasons still hold for whatever replaces it:
 *
 * THE SLIDESHOW (home-1 .. home-6). No two adjacent slides share a texture
 * and a colour family; see HERO_SLIDES in lib/images.ts, which owns the words
 * each slide shows. home-1 is the front swirl, sign in frame, supplied
 * directly as the photograph the homepage should open on. It is also the
 * picture in the site's link previews.
 *
 * THE INSTALL PAGES. FRONTAL is a photograph that proves it: a deep side part
 * with the hairline laid right across the forehead needs lace that runs ear
 * to ear. CLOSURE has no such photograph, because a finished closure shows
 * nothing a frontal cannot also show, so its photograph is an ILLUSTRATION of
 * the look a closure is built around and stays untagged below; the caption
 * beside it on the page (`imageCaption` in lib/taxonomy.ts) says what it
 * shows. REINSTALLS is the same situation: no photograph can prove a restyle
 * happened. When Nat has a real example of either, it belongs in that place
 * instead, and the photo manager can now put it there.
 *
 * THE FINISH SWATCHES. Both are named in their own descriptions below, so
 * neither is a new claim: the burgundy bob is "set into a soft curl", and the
 * crimped deep wave is titled "Crimped Lengths". Nothing in the set is
 * described as a wand curl, so Wand Curls starts with no photograph and
 * renders a plain swatch rather than borrowing one.
 *
 * THE /book MENU. It sits in the Frontal Install cell, so it is a frame
 * tagged frontal on visible evidence: the hair held back off the face and the
 * edges laid in swirls at both temples.
 *
 * THE SIGN-IN SCREENS. The sleek straight frame, the quietest in the set:
 * that screen is a door, not a shop window.
 */
export const LAUNCH_SLOTS: Partial<Record<SlotId, Photo>> = {
  "home-1": WORK.deepWaveFrontSwirl,
  "home-2": WORK.straightGlassFinish,
  "home-3": WORK.bobBurgundyCurl,
  "home-4": WORK.deepWaveCrimped,
  "home-5": WORK.colourPinkStraight,
  "home-6": WORK.bobSoftLob,
  "install-frontal": WORK.straightSideSwoop,
  "install-closure": WORK.deepWaveMeltedPart,
  "install-wig-touch-up": WORK.deepWaveLongLayers,
  "finish-curls": WORK.bobBurgundyCurl,
  "finish-crimps": WORK.deepWaveCrimped,
  book: WORK.bodyWaveSideSweep,
  "sign-in": WORK.straightGlassFinish,
};

/* ==========================================================================
   THE THREE DIMENSIONS
   ==========================================================================
   A wig install is described by three independent things, and collapsing them
   into one list is the mistake this model exists to prevent.

   INSTALL TYPE is how the unit is fitted: a frontal or a closure. It is the
   only one of the three that is a service, so it is the only one that decides
   what gets booked, and it lives in lib/taxonomy.ts. A photograph carries one
   where the frame shows it, and none where it cannot. It is independent of
   style: a body wave can be either.

   STYLE is what the hair looks like: the texture, the length, the cut, the
   colour. It is what a client pictures when she books. It is a description of
   the hair, never a service; "Body Wave" is a style, not an install.

   LACE FINISH is how well the unit is attached: how flat the lace sits, how
   much of the hairline was rebuilt, whether the scalp reads as scalp. It is
   what separates a good install from a bad one wearing the same hair.

   Not to be confused with the FINISH a client picks when she books - Curls,
   Wand Curls or Crimps, in lib/taxonomy.ts - which is how the install is
   styled on the day. That one is an add-on to the booking. This one is a
   quality visible in a photograph, and nobody books it.

   The three are orthogonal. Every photograph on this site has exactly one
   primary style, any number of lace-finish attributes and at most one
   established install type, and "Natural Lace" is a LACE FINISH - the quality
   of the melt - not a sixth hairstyle. A sleek straight install and a deep
   wave install can both be natural-lace installs, and both belong under it
   without either being reclassified.

   WHY MEMBERSHIP IS A TAG AND NOT A LIST
   Each collection used to hand-list its photographs, which meant a photograph
   in two collections was written down twice and could drift. Now every
   photograph is described once (in the database, and in LAUNCH_ITEMS below
   for the launch set), and the collections are derived from those tags. One
   row per photograph, and the same file is referenced by each collection it
   belongs to rather than copied into it.
*/

/**
 * What the hair is. Every item has exactly one primary and may carry more.
 *
 * The keys are stable identifiers and double as the /gallery/<slug>/ route,
 * so they are not renamed when a display label changes. "body-wave-glam" is
 * the URL and the key for the style now labelled "Body Wave"; changing it
 * would break every existing link to that page.
 */
export type StyleCategory =
  | "deep-wave-glam"
  | "sleek-straight"
  | "signature-bob"
  | "body-wave-glam"
  | "color-and-custom";

/** How the unit is attached. Independent of style; an item may have several. */
export type FinishAttribute =
  | "natural-lace"
  | "melted-hairline"
  | "hd-lace"
  | "custom-hairline";

export const STYLE_LABELS: Record<StyleCategory, string> = {
  "deep-wave-glam": "Deep Wave Glam",
  "sleek-straight": "Sleek Straight",
  "signature-bob": "Signature Bob",
  "body-wave-glam": "Body Wave",
  "color-and-custom": "Color & Custom",
};

export const FINISH_LABELS: Record<FinishAttribute, string> = {
  "natural-lace": "Natural Lace",
  "melted-hairline": "Melted Hairline",
  "hd-lace": "HD Lace",
  "custom-hairline": "Custom Hairline",
};

/**
 * One photograph of one finished install, described once.
 *
 * `focalPosition` is an `object-position` value, measured off the file rather
 * than guessed: for each frame the top of the hair and the centre of the face
 * were read off the picture and the value solved so that wherever the frame is
 * cropped - a card, a collection hero, the homepage carousel - the face lands
 * a little above the middle with the whole install still in shot. These are
 * phone photographs taken in a working salon, so how much room sits above the
 * client varies a lot between frames, and one shared value is wrong for most
 * of the set.
 */
export type LaunchItem = {
  /**
   * The image file stem. Only the launch set is keyed this way; a database
   * row is keyed by uuid and found by its `src` (0007 seeded one per file).
   */
  id: string;
  image: Photo;
  alt: string;
  /** Short display name, for the item label and the lightbox. */
  title: string;
  /** One sentence. What is actually in the frame, and nothing beyond it. */
  description: string;
  /**
   * How the unit was fitted, where the photograph itself establishes it, and
   * null where it does not. The service axis, independent of the style below.
   *
   * THE RULE. "frontal" is set only when the frame shows lace hairline past
   * the point where a closure's lace would stop: edges laid down at a temple,
   * a side part with the hairline laid across the forehead, or the hair taken
   * back off the face. Only lace that runs ear to ear can do any of those, so
   * the frame settles it. A centre part with the hair falling over both
   * temples looks the same on either install, so those frames are null.
   *
   * No frame is "closure", and that is not an oversight. A finished closure
   * shows nothing a frontal cannot also show, so a photograph can never prove
   * one; only Nat can. These used to be filled in for every frame, two of them
   * as closures, on a best guess from the picture. A guess shown on the site
   * as a label is a claim about what a real client booked, so the guesses
   * were taken out and only what the frame proves is left.
   *
   * null means "not established", never "neither". The photograph stays in
   * its collections and in the gallery; it just carries no install label and
   * is never used as an example on an install page. When Nat confirms one,
   * she sets it in the photo manager, and the gallery tag, the homepage
   * label and the examples on /installs/<type>/ all follow.
   */
  installType: InstallTypeId | null;
  /** Null only for the homepage opener, which is in no collection. */
  primaryStyle: StyleCategory | null;
  /** Includes `primaryStyle`. Drives which style collections show this item. */
  styleCategories: StyleCategory[];
  /** May be empty. Drives the Natural Lace collection and the item labels. */
  finishAttributes: FinishAttribute[];
  /** Shown in the featured rail on the homepage. */
  featured: boolean;
  /** `object-position`, measured. See the note on this type. */
  focalPosition: string;
};

type ItemInput = Omit<
  LaunchItem,
  "id" | "image" | "alt" | "styleCategories"
> & {
  photo: Photo;
  /** Any style beyond the primary. The primary is added automatically. */
  alsoStyles?: StyleCategory[];
};

function galleryItem(input: ItemInput): LaunchItem {
  const { photo, alsoStyles = [], ...rest } = input;
  return {
    ...rest,
    // The file stem is already unique and already the name a human would use,
    // so it is the id rather than a second invented key.
    id: photo.src.split("/").pop()!.replace(".jpg", ""),
    image: photo,
    alt: photo.alt,
    styleCategories: rest.primaryStyle ? [rest.primaryStyle, ...alsoStyles] : alsoStyles,
  };
}

/**
 * THE LAUNCH SET: every photograph the site launched with, once, in the
 * order the galleries showed them.
 *
 * The finish attributes are read off the frames - a parting sitting flat with
 * no visible lace edge, baby hairs laid along a rebuilt hairline - rather than
 * supplied by Nat. They describe what is visible in each picture and nothing
 * more; no specific lace product is claimed. Nat can correct any of them in
 * the photo manager.
 */
export const LAUNCH_ITEMS: LaunchItem[] = [
  galleryItem({
    photo: WORK.deepWaveMiddlePart,
    installType: "frontal",
    title: "Waist-Length Deep Wave",
    description:
      "A centre-parted deep wave taken to the waist, the lace melted flat at the parting and the edges laid in soft swirls.",
    primaryStyle: "deep-wave-glam",
    finishAttributes: ["natural-lace", "melted-hairline", "custom-hairline"],
    featured: false,
    focalPosition: "center 70%",
  }),
  galleryItem({
    photo: WORK.deepWaveMeltedPart,
    // Centre part, hair over both temples: either install looks like this.
    installType: null,
    title: "Melted Centre Part",
    description:
      "A long deep wave seen straight on, the parting sitting flat to the scalp with no visible lace edge.",
    primaryStyle: "deep-wave-glam",
    finishAttributes: ["natural-lace", "melted-hairline", "hd-lace"],
    featured: true,
    focalPosition: "center 90%",
  }),
  galleryItem({
    photo: WORK.deepWaveCrimped,
    installType: "frontal",
    title: "Crimped Lengths",
    description:
      "Natural black deep wave parted down the middle, falling well past the shoulders in a tight, defined crimp.",
    primaryStyle: "deep-wave-glam",
    finishAttributes: ["melted-hairline", "custom-hairline"],
    featured: true,
    focalPosition: "center 80%",
  }),
  galleryItem({
    photo: WORK.deepWaveBraidedFront,
    installType: "frontal",
    title: "Braided Front",
    description:
      "The front section braided back off the face, with the baby hairs laid in fine curves along the hairline.",
    primaryStyle: "deep-wave-glam",
    finishAttributes: ["natural-lace", "custom-hairline"],
    featured: false,
    focalPosition: "center 40%",
  }),
  galleryItem({
    photo: WORK.deepWaveLongLayers,
    // The temples are mostly under the hair; too close to call from the frame.
    installType: null,
    title: "Long Layers",
    description:
      "A long deep wave cut into soft layers, the texture falling forward over both shoulders.",
    primaryStyle: "deep-wave-glam",
    finishAttributes: ["melted-hairline"],
    featured: false,
    focalPosition: "center 75%",
  }),
  galleryItem({
    photo: WORK.deepWaveShoulderSweep,
    // Was "closure" on a guess. Nothing in the frame proves either install.
    installType: null,
    title: "Shoulder Sweep",
    description:
      "A shoulder-length deep wave with a centre parting, the wave pattern loosening from the root through the ends.",
    primaryStyle: "deep-wave-glam",
    finishAttributes: ["melted-hairline"],
    featured: false,
    focalPosition: "center 45%",
  }),

  galleryItem({
    photo: WORK.straightGlassFinish,
    // Centre part, hair over both temples: either install looks like this.
    installType: null,
    title: "Glass Finish",
    description:
      "A waist-length straight install pressed to a glass-smooth finish, the centre parting laid flat and the ends kept blunt.",
    primaryStyle: "sleek-straight",
    finishAttributes: ["natural-lace", "melted-hairline"],
    featured: false,
    focalPosition: "center 100%",
  }),
  galleryItem({
    photo: WORK.straightSideSwoop,
    installType: "frontal",
    title: "Side Swoop",
    description:
      "A deep side parting with one moulded swoop set across the forehead and the edges laid along the hairline.",
    primaryStyle: "sleek-straight",
    finishAttributes: ["natural-lace", "custom-hairline"],
    featured: true,
    focalPosition: "center 75%",
  }),
  galleryItem({
    photo: WORK.straightCentrePart,
    installType: "frontal",
    title: "Clean Centre Part",
    description:
      "Pressed smooth from a clean centre parting down to a blunt baseline.",
    primaryStyle: "sleek-straight",
    finishAttributes: ["melted-hairline", "custom-hairline"],
    featured: false,
    focalPosition: "center 70%",
  }),

  galleryItem({
    photo: WORK.bobSoftLob,
    installType: "frontal",
    title: "Soft Lob",
    description:
      "A soft lob curved under at the ends and parted at the side, with the baby hairs laid in fine waves.",
    primaryStyle: "signature-bob",
    finishAttributes: ["natural-lace", "custom-hairline"],
    featured: false,
    focalPosition: "center 70%",
  }),
  galleryItem({
    photo: WORK.bobBluntSidePart,
    installType: "frontal",
    title: "Blunt Bob",
    description:
      "A blunt shoulder-skimming bob, side parted, cut to a straight and sharply defined baseline.",
    primaryStyle: "signature-bob",
    finishAttributes: ["custom-hairline"],
    featured: false,
    focalPosition: "center 80%",
  }),
  galleryItem({
    photo: WORK.bobBurgundyCurl,
    installType: "frontal",
    title: "Burgundy Curl",
    description:
      "A chin-length bob in a deep burgundy brown, set into a soft curl and swept away from the face.",
    primaryStyle: "signature-bob",
    alsoStyles: ["color-and-custom"],
    finishAttributes: ["melted-hairline"],
    featured: true,
    focalPosition: "center 75%",
  }),

  galleryItem({
    photo: WORK.bodyWaveCopper,
    // Parting near the centre, both temples under the hair: not settled.
    installType: null,
    title: "Copper Body Wave",
    description:
      "A bright copper body wave with a deep side parting, set into large glossy waves.",
    primaryStyle: "body-wave-glam",
    alsoStyles: ["color-and-custom"],
    finishAttributes: ["melted-hairline"],
    featured: false,
    focalPosition: "center 55%",
  }),
  galleryItem({
    photo: WORK.bodyWaveSideSweep,
    installType: "frontal",
    title: "S-Wave Side Sweep",
    description:
      "A deep side parting with the front section moulded into an S-wave across the forehead.",
    primaryStyle: "body-wave-glam",
    finishAttributes: ["custom-hairline"],
    featured: true,
    focalPosition: "center 55%",
  }),

  galleryItem({
    photo: WORK.colourPinkStraight,
    installType: "frontal",
    title: "Candy Pink",
    description:
      "A long straight install in candy pink with a deep side parting, cut to a blunt baseline.",
    primaryStyle: "color-and-custom",
    alsoStyles: ["sleek-straight"],
    finishAttributes: ["melted-hairline"],
    featured: false,
    focalPosition: "center 100%",
  }),
  galleryItem({
    photo: WORK.colourBlondeStraight,
    installType: "frontal",
    title: "Platinum Straight",
    description:
      "A long platinum blonde straight install parted down the middle, the lace tinted to blend away at the parting.",
    primaryStyle: "color-and-custom",
    alsoStyles: ["sleek-straight"],
    finishAttributes: ["natural-lace", "melted-hairline", "hd-lace"],
    featured: false,
    focalPosition: "center 55%",
  }),
  galleryItem({
    photo: WORK.colourCopperCentrePart,
    // Was "closure" on a guess. Nothing in the frame proves either install.
    installType: null,
    title: "Warm Copper",
    description:
      "A warm copper install with a centre parting, worn straight through the lengths with a soft bend at the ends.",
    primaryStyle: "color-and-custom",
    alsoStyles: ["sleek-straight"],
    finishAttributes: ["melted-hairline"],
    featured: true,
    focalPosition: "center 85%",
  }),

  /*
    The homepage's opening photograph, which was never in a gallery: it
    exists for the slideshow and the link previews. Untagged for the same
    reason as any centre part (either install looks like this), and its
    crop is the slideshow's measured one: the crown at roughly a third of
    the file and the face around 55%.
  */
  galleryItem({
    photo: WORK.deepWaveFrontSwirl,
    installType: null,
    title: "Front Swirl",
    description: "",
    primaryStyle: null,
    finishAttributes: [],
    featured: false,
    focalPosition: "center 55%",
  }),
];

export type StyleCollection = {
  /** URL segment. /gallery/<slug>/ */
  slug: string;
  /** Display name. Also the <title> stem and the card heading. */
  title: string;
  /**
   * The three-beat editorial line under the title on the collection page.
   * "Texture. Movement. Glamour." Three words, full stops, no verbs.
   */
  tagline: string;
  /** One sentence, for the card. Under 90 characters or it wraps to four lines. */
  summary: string;
  /** Two or three sentences, for the collection page, under the title. */
  description: string;
  /** For the page description tag. Plain, accurate, no keyword stuffing. */
  metaDescription: string;
  /**
   * Which axis this collection cuts along. Five collections are STYLE (what
   * the hair is); Natural Lace is FINISH (how well it is attached), and the
   * page says so rather than letting it pass as a sixth hairstyle.
   *
   * The photographs are not part of this type. Which ones a collection holds,
   * its cover (the card image, the page photograph and the link preview) and
   * the second photograph its card fades to on hover all come from the
   * database; see ResolvedCollection in lib/gallery.ts.
   */
  dimension: "style" | "finish";
  /** Reading order. Lower sorts first. */
  order: number;
};

/**
 * THE SIX.
 *
 * Ordered by how a visitor most often arrives: the two textures that fill the
 * chair, then the cut, then the softer wave, then colour, then the quiet one.
 *
 * Natural Lace is deliberately last and deliberately understated. It is the
 * collection that proves the other five, so it reads better as the closing
 * note than as the opening claim.
 *
 * A photograph appearing in two collections is intentional and correct. A
 * copper body wave IS both a body wave and a colour transformation, and
 * pretending otherwise would hide the best example of one of them.
 *
 * The words for each (title, three-beat line, card sentence, page paragraph,
 * search description) are Nat's, from the dashboard (Website content,
 * Gallery); the slug, the axis and the order are structure and stay here.
 * The search descriptions name the towns with {all locations}, so they follow
 * the dashboard's Locations rather than going stale.
 */
const COLLECTION_COPY = SITE.gallery.collections;

export const COLLECTIONS: StyleCollection[] = [
  { slug: "deep-wave-glam", dimension: "style", ...COLLECTION_COPY["deep-wave-glam"], order: 1 },
  { slug: "sleek-straight", dimension: "style", ...COLLECTION_COPY["sleek-straight"], order: 2 },
  { slug: "signature-bob", dimension: "style", ...COLLECTION_COPY["signature-bob"], order: 3 },
  { slug: "body-wave-glam", dimension: "style", ...COLLECTION_COPY["body-wave-glam"], order: 4 },
  { slug: "color-and-custom", dimension: "style", ...COLLECTION_COPY["color-and-custom"], order: 5 },
  { slug: "natural-lace", dimension: "finish", ...COLLECTION_COPY["natural-lace"], order: 6 },
];

/**
 * Each collection's cover and second photograph in the launch set. 0007
 * copied these into gallery_categories.hero_item_id / hover_item_id.
 *
 * A collection holds every photograph tagged with it: a style collection the
 * photographs of that style, and Natural Lace every photograph whose lace is
 * natural, which is why a sleek straight install and a deep wave install both
 * appear there without either being filed as the other.
 */
export const LAUNCH_COVERS: Record<string, { cover: Photo; second: Photo }> = {
  "deep-wave-glam": { cover: WORK.deepWaveMiddlePart, second: WORK.deepWaveCrimped },
  "sleek-straight": { cover: WORK.straightGlassFinish, second: WORK.straightSideSwoop },
  "signature-bob": { cover: WORK.bobSoftLob, second: WORK.bobBluntSidePart },
  "body-wave-glam": { cover: WORK.bodyWaveCopper, second: WORK.bodyWaveSideSweep },
  "color-and-custom": { cover: WORK.colourPinkStraight, second: WORK.bodyWaveCopper },
  "natural-lace": { cover: WORK.deepWaveMeltedPart, second: WORK.straightGlassFinish },
};

/** Reading order, and the order every grid on the site renders in. */
export const COLLECTIONS_IN_ORDER = [...COLLECTIONS].sort(
  (a, b) => a.order - b.order,
);

export function getCollection(slug: string): StyleCollection | undefined {
  return COLLECTIONS.find((collection) => collection.slug === slug);
}

/** A collection's display name from its slug, or the slug if it is unknown. */
export function collectionTitle(slug: string): string {
  return getCollection(slug)?.title ?? slug;
}

/**
 * The rail at the foot of a collection page. Takes the next collections in
 * reading order and wraps around, so every collection suggests a different
 * set and no page is ever a dead end.
 */
export function relatedCollections(slug: string, count = 3): StyleCollection[] {
  const all = COLLECTIONS_IN_ORDER;
  const start = all.findIndex((collection) => collection.slug === slug);
  if (start < 0) return all.slice(0, count);
  return Array.from({ length: Math.min(count, all.length - 1) }, (_, i) => {
    return all[(start + 1 + i) % all.length];
  });
}
