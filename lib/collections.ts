/**
 * THE SIX STYLE COLLECTIONS - the single source of truth for the whole
 * /gallery branch of the site.
 *
 * Every collection card, every collection page, every gallery, the homepage
 * showcase, the related-collection rail and all six sets of page metadata are
 * generated from the array at the bottom of this file. Nothing about a
 * collection is typed twice, and adding a seventh is one entry here plus the
 * photographs.
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
 * WHERE THE FILES LIVE, AND HOW TO ADD MORE
 * ---------------------------------------------------------------------------
 * All of them sit flat in `public/images/work/`, not in a folder per
 * collection. Six of these photographs legitimately belong to two collections
 * at once (a copper body wave is both Body Wave Glam and Color & Custom), and
 * a folder per collection would mean committing the same JPEG twice and
 * editing its alt text in two places.
 *
 * Each photograph ships at three widths, all the same 3:4 crop:
 *
 *      name-1600.jpg   1600x2133   lightbox, and the hero on large screens
 *      name.jpg        1200x1600   collection heroes and gallery cells
 *      name-600.jpg     600x800    cards, thumbnails, and every phone
 *
 * To add a look: crop it to 3:4, export those three widths into
 * public/images/work/, add one `photo()` line to WORK below with real alt
 * text, then list it in whichever collections it belongs to. Nothing else in
 * the codebase needs touching.
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
  bodyWaveBlonde: photo(
    "body-wave-blonde",
    "A long platinum blonde body-wave install with a centre parting and wide, soft waves through the lengths",
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
 * The seven photographs the homepage hero rotates through.
 *
 * Named here rather than in lib/images.ts so the hero and the collections
 * cannot end up holding two different alt texts for the same file. See the
 * note on ordering in lib/images.ts for why these seven and why in this order.
 *
 * WHY THE LEAD FRAME CHANGED, TWICE
 * It used to be the middle-part deep wave, chosen because Nat's neon sign is
 * on the wall behind the client and that was the fastest way to say this is a
 * real room. The sign is now the nav bar's logo, sitting about 60px above the
 * top of the photograph, so a frame containing it printed the same mark twice
 * in one eyeful - most obviously on a phone, where the picture is full width.
 * The lead became the crimped deep wave instead: same collection, same
 * texture, shot against a plain door with no sign in it.
 *
 * `frontSwirl` leads now, sign back in frame. It was supplied directly as the
 * photograph the homepage should open on, so the double-mark tradeoff above
 * is accepted rather than solved a second time. The crimped deep wave is
 * still in the rotation, just no longer straight after the lead: both carry
 * the same label, and sitting them together would have repeated it on screen
 * two slides running. See the note beside HERO_SLIDES in lib/images.ts for
 * where it moved to.
 */
export const HERO_PHOTOS = {
  /** Slide one, and the og:image. Sign in frame; see above. */
  deepWaveSwirl: WORK.deepWaveFrontSwirl,
  deepWave: WORK.deepWaveCrimped,
  straight: WORK.straightGlassFinish,
  bob: WORK.bobBurgundyCurl,
  blonde: WORK.bodyWaveBlonde,
  pink: WORK.colourPinkStraight,
  /** The finish slide. A bob, because Natural Lace cuts across the styles. */
  lace: WORK.bobSoftLob,
} as const;

/* ==========================================================================
   THE TWO DIMENSIONS
   ==========================================================================
   A wig install is described by two independent things, and collapsing them
   into one list is the mistake this model exists to prevent.

   STYLE is what the hair looks like: the texture, the length, the cut, the
   colour. It is what a client pictures when she books.

   FINISH is how well the unit is attached: how flat the lace sits, how much
   of the hairline was rebuilt, whether the scalp reads as scalp. It is what
   separates a good install from a bad one wearing the same hair.

   The two are orthogonal. Every photograph on this site has exactly one
   primary style and any number of finish attributes, and "Natural Lace" is a
   FINISH - the quality of the melt - not a sixth hairstyle. A sleek straight
   install and a deep wave install can both be natural-lace installs, and both
   belong under it without either being reclassified.

   WHY MEMBERSHIP IS A TAG AND NOT A LIST
   Each collection used to hand-list its photographs, which meant a photograph
   in two collections was written down twice and could drift. Now every
   photograph is described once, in GALLERY_ITEMS, and the collections are
   derived from those tags. One row per photograph, and the same physical JPEG
   is referenced by each collection it belongs to rather than copied into it.
*/

/** What the hair is. Every item has exactly one primary and may carry more. */
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
  "body-wave-glam": "Body Wave Glam",
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
export type GalleryItem = {
  /** Stable id. Matches the image file stem, and would be the database key. */
  id: string;
  image: Photo;
  alt: string;
  /** Short display name, for the item label and the lightbox. */
  title: string;
  /** One sentence. What is actually in the frame, and nothing beyond it. */
  description: string;
  primaryStyle: StyleCategory;
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
  GalleryItem,
  "id" | "image" | "alt" | "styleCategories"
> & {
  photo: Photo;
  /** Any style beyond the primary. The primary is added automatically. */
  alsoStyles?: StyleCategory[];
};

function galleryItem(input: ItemInput): GalleryItem {
  const { photo, alsoStyles = [], ...rest } = input;
  return {
    ...rest,
    // The file stem is already unique and already the name a human would use,
    // so it is the id rather than a second invented key.
    id: photo.src.split("/").pop()!.replace(".jpg", ""),
    image: photo,
    alt: photo.alt,
    styleCategories: [rest.primaryStyle, ...alsoStyles],
  };
}

/**
 * EVERY PHOTOGRAPH, ONCE.
 *
 * The finish attributes are read off the frames - a parting sitting flat with
 * no visible lace edge, baby hairs laid along a rebuilt hairline - rather than
 * supplied by Nat. They describe what is visible in each picture and nothing
 * more; no specific lace product is claimed. Nat should correct any she
 * disagrees with, which is a one-line edit per photograph.
 */
export const GALLERY_ITEMS: GalleryItem[] = [
  galleryItem({
    photo: WORK.deepWaveMiddlePart,
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
    photo: WORK.bodyWaveBlonde,
    title: "Platinum Body Wave",
    description:
      "A long platinum body wave with a centre parting and wide, soft waves through the lengths.",
    primaryStyle: "body-wave-glam",
    alsoStyles: ["color-and-custom"],
    finishAttributes: ["natural-lace", "melted-hairline", "hd-lace"],
    featured: false,
    focalPosition: "center 43%",
  }),
  galleryItem({
    photo: WORK.bodyWaveCopper,
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
    title: "Warm Copper",
    description:
      "A warm copper install with a centre parting, worn straight through the lengths with a soft bend at the ends.",
    primaryStyle: "color-and-custom",
    alsoStyles: ["sleek-straight"],
    finishAttributes: ["melted-hairline"],
    featured: true,
    focalPosition: "center 85%",
  }),
];

/** Every item carrying a style, in GALLERY_ITEMS order. */
export function itemsInStyle(style: StyleCategory): GalleryItem[] {
  return GALLERY_ITEMS.filter((item) => item.styleCategories.includes(style));
}

/** Every item carrying a finish, in GALLERY_ITEMS order. */
export function itemsWithFinish(finish: FinishAttribute): GalleryItem[] {
  return GALLERY_ITEMS.filter((item) => item.finishAttributes.includes(finish));
}

/**
 * The measured `object-position` for a photograph, for the places that hold a
 * bare `Photo` rather than a whole item - a collection hero, a card. Falls
 * back to the middle of the measured set, which is where these frames sit.
 */
export function focalFor(photo: Photo): string {
  return (
    GALLERY_ITEMS.find((item) => item.image.src === photo.src)?.focalPosition ??
    "center 70%"
  );
}

/** The homepage rail. Deliberately not the hero six; see lib/images.ts. */
export function featuredItems(): GalleryItem[] {
  return GALLERY_ITEMS.filter((item) => item.featured);
}

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
  /** The card image, the collection hero, and the social share image. */
  hero: Photo;
  /**
   * The second card image. Cross-fades in on hover at desktop, which is how
   * each card shows two looks without becoming a collage. Never the only way
   * to see a photograph: everything here is in `gallery` as well.
   */
  hoverImage: Photo;
  /**
   * Which axis this collection cuts along. Five collections are STYLE (what
   * the hair is); Natural Lace is FINISH (how well it is attached), and the
   * page says so rather than letting it pass as a sixth hairstyle.
   */
  dimension: "style" | "finish";
  /**
   * Derived from the tags in GALLERY_ITEMS, never hand-listed, so a
   * photograph that belongs in two collections is written down once.
   */
  items: GalleryItem[];
  /** Ordering hook for a future admin screen. Lower sorts first. */
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
 */
/**
 * The metadata half of a collection: everything a human writes. The
 * photographs are joined on below, from the tags rather than by hand.
 */
type CollectionMeta = Omit<StyleCollection, "items"> &
  (
    | { dimension: "style"; style: StyleCategory }
    | { dimension: "finish"; finish: FinishAttribute }
  );

const COLLECTION_META: CollectionMeta[] = [
  {
    slug: "deep-wave-glam",
    dimension: "style",
    style: "deep-wave-glam",
    title: "Deep Wave Glam",
    tagline: "Texture. Movement. Glamour.",
    summary: "Long, textured, effortlessly glamorous.",
    description:
      "Deep wave is the one people bring a screenshot in for. Long lengths, a wave pattern that holds its definition from the root down, and enough weight through the ends to move when you do. Density is set before the lace goes down, so the shape is still there in week three.",
    metaDescription:
      "Long deep-wave lace installs by Crowned by Nat. Defined texture, glamorous volume, and a hairline cut to your face, in Towson, MD.",
    hero: WORK.deepWaveMiddlePart,
    hoverImage: WORK.deepWaveCrimped,
    order: 1,
  },
  {
    slug: "sleek-straight",
    dimension: "style",
    style: "sleek-straight",
    title: "Sleek Straight",
    tagline: "Smooth. Precise. Polished.",
    summary: "Pressed flat, parted clean, finished sharp.",
    description:
      "Straight hides nothing. Every lift at the parting and every uneven end is visible from across a room, which is what makes this collection the honest test of an install. Middle part or deep side part, pressed to a glass finish, cut to a baseline that stays level.",
    metaDescription:
      "Sleek straight lace installs by Crowned by Nat. Clean centre and side partings, a pressed glass finish, and a level baseline, in Towson, MD.",
    hero: WORK.straightGlassFinish,
    hoverImage: WORK.straightSideSwoop,
    order: 2,
  },
  {
    slug: "signature-bob",
    dimension: "style",
    style: "signature-bob",
    title: "Signature Bob",
    tagline: "Sharp. Modern. Considered.",
    summary: "The cut that has to be right the first time.",
    description:
      "Short units live or die on the perimeter, and a bob cannot be rescued by length the way long hair can. These are cut on the head rather than off the stand, so the baseline sits where your jaw actually is and the shape holds when you turn your head.",
    metaDescription:
      "Bob and lob lace installs by Crowned by Nat. Blunt baselines, soft curved ends, and a perimeter cut on the head, in Towson, MD.",
    hero: WORK.bobSoftLob,
    hoverImage: WORK.bobBluntSidePart,
    order: 3,
  },
  {
    slug: "body-wave-glam",
    dimension: "style",
    style: "body-wave-glam",
    title: "Body Wave Glam",
    tagline: "Soft. Full. Luminous.",
    summary: "Wide, glossy waves with weight behind them.",
    description:
      "Body wave is the softer register: a wider wave, more shine off the surface, and volume that reads as fullness rather than texture. It takes light better than any other pattern, which is why it is the one that photographs best in almost any room.",
    metaDescription:
      "Body-wave lace installs by Crowned by Nat. Soft volume, wide glossy waves, and elegant movement, in Towson, MD.",
    hero: WORK.bodyWaveBlonde,
    hoverImage: WORK.bodyWaveCopper,
    order: 4,
  },
  {
    slug: "color-and-custom",
    dimension: "style",
    style: "color-and-custom",
    title: "Color & Custom",
    tagline: "Blonde. Copper. Pink.",
    summary: "Explore custom colour inspiration.",
    description:
      "Colour inspiration from the chair: platinum, copper, burgundy and candy pink, all of it worked on the unit rather than on your own hair. Bring a reference to your consult and Nat will tell you straight what the unit you have can and cannot be taken to.",
    metaDescription:
      "Colour and custom wig inspiration from Crowned by Nat. Blonde, copper, burgundy, and pink lace installs, in Towson, MD.",
    hero: WORK.colourPinkStraight,
    hoverImage: WORK.bodyWaveCopper,
    order: 5,
  },
  {
    slug: "natural-lace",
    dimension: "finish",
    finish: "natural-lace",
    title: "Natural Lace",
    tagline: "Seamless. Quiet. Yours.",
    summary: "The install nobody can tell is an install.",
    description:
      "The quiet collection, and the one the others get judged against. Lace tinted to your skin, knots bleached down, the parting flat to the scalp, and the edges laid to follow your own hairline. Nothing here is trying to be noticed.",
    metaDescription:
      "Natural-looking lace installs by Crowned by Nat. Tinted lace, bleached knots, and a seamless hairline, in Towson, MD.",
    hero: WORK.deepWaveMeltedPart,
    hoverImage: WORK.straightGlassFinish,
    order: 6,
  },
];

/**
 * The six, with their photographs joined on.
 *
 * A style collection takes every item tagged with that style; Natural Lace
 * takes every item tagged with that finish, which is why a sleek straight
 * install and a deep wave install both appear there without either being
 * filed as the other.
 */
export const COLLECTIONS: StyleCollection[] = COLLECTION_META.map((meta) => ({
  ...meta,
  items:
    meta.dimension === "style"
      ? itemsInStyle(meta.style)
      : itemsWithFinish(meta.finish),
}));

/** Reading order, and the order every grid on the site renders in. */
export const COLLECTIONS_IN_ORDER = [...COLLECTIONS].sort(
  (a, b) => a.order - b.order,
);

export function getCollection(slug: string): StyleCollection | undefined {
  return COLLECTIONS.find((collection) => collection.slug === slug);
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

/** "6 looks" / "1 look". Used on the cards. */
export function lookCount(collection: StyleCollection): string {
  const n = collection.items.length;
  return `${n} ${n === 1 ? "look" : "looks"}`;
}
