/**
 * THE SIX STYLE COLLECTIONS - the single source of truth for the whole
 * /styles branch of the site.
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
 * The six photographs the homepage hero rotates through.
 *
 * Named here rather than in lib/images.ts so the hero and the collections
 * cannot end up holding two different alt texts for the same file. See the
 * note on ordering in lib/images.ts for why these six and why in this order.
 */
export const HERO_PHOTOS = {
  deepWave: WORK.deepWaveMiddlePart,
  pink: WORK.colourPinkStraight,
  straight: WORK.straightGlassFinish,
  blonde: WORK.bodyWaveBlonde,
  bob: WORK.bobSoftLob,
  copper: WORK.bodyWaveCopper,
} as const;

export type StyleCollection = {
  /** URL segment. /styles/<slug>/ */
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
  /** The full gallery, hero included, in the order it should be read. */
  gallery: Photo[];
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
export const COLLECTIONS: StyleCollection[] = [
  {
    slug: "deep-wave-glam",
    title: "Deep Wave Glam",
    tagline: "Texture. Movement. Glamour.",
    summary: "Long, textured, effortlessly glamorous.",
    description:
      "Deep wave is the one people bring a screenshot in for. Long lengths, a wave pattern that holds its definition from the root down, and enough weight through the ends to move when you do. Density is set before the lace goes down, so the shape is still there in week three.",
    metaDescription:
      "Long deep-wave lace installs by Crowned by Nat. Defined texture, glamorous volume, and a hairline cut to your face, in Towson and Laurel, MD.",
    hero: WORK.deepWaveMiddlePart,
    hoverImage: WORK.deepWaveCrimped,
    gallery: [
      WORK.deepWaveMiddlePart,
      WORK.deepWaveCrimped,
      WORK.deepWaveMeltedPart,
      WORK.deepWaveBraidedFront,
      WORK.deepWaveLongLayers,
      WORK.deepWaveShoulderSweep,
    ],
    order: 1,
  },
  {
    slug: "sleek-straight",
    title: "Sleek Straight",
    tagline: "Smooth. Precise. Polished.",
    summary: "Pressed flat, parted clean, finished sharp.",
    description:
      "Straight hides nothing. Every lift at the parting and every uneven end is visible from across a room, which is what makes this collection the honest test of an install. Middle part or deep side part, pressed to a glass finish, cut to a baseline that stays level.",
    metaDescription:
      "Sleek straight lace installs by Crowned by Nat. Clean centre and side partings, a pressed glass finish, and a level baseline, in Towson and Laurel, MD.",
    hero: WORK.straightGlassFinish,
    hoverImage: WORK.straightSideSwoop,
    gallery: [
      WORK.straightGlassFinish,
      WORK.straightCentrePart,
      WORK.straightSideSwoop,
      WORK.colourBlondeStraight,
      WORK.colourPinkStraight,
    ],
    order: 2,
  },
  {
    slug: "signature-bob",
    title: "Signature Bob",
    tagline: "Sharp. Modern. Considered.",
    summary: "The cut that has to be right the first time.",
    description:
      "Short units live or die on the perimeter, and a bob cannot be rescued by length the way long hair can. These are cut on the head rather than off the stand, so the baseline sits where your jaw actually is and the shape holds when you turn your head.",
    metaDescription:
      "Bob and lob lace installs by Crowned by Nat. Blunt baselines, soft curved ends, and a perimeter cut on the head, in Towson and Laurel, MD.",
    hero: WORK.bobSoftLob,
    hoverImage: WORK.bobBluntSidePart,
    gallery: [WORK.bobSoftLob, WORK.bobBluntSidePart, WORK.bobBurgundyCurl],
    order: 3,
  },
  {
    slug: "body-wave-glam",
    title: "Body Wave Glam",
    tagline: "Soft. Full. Luminous.",
    summary: "Wide, glossy waves with weight behind them.",
    description:
      "Body wave is the softer register: a wider wave, more shine off the surface, and volume that reads as fullness rather than texture. It takes light better than any other pattern, which is why it is the one that photographs best in almost any room.",
    metaDescription:
      "Body-wave lace installs by Crowned by Nat. Soft volume, wide glossy waves, and elegant movement, in Towson and Laurel, MD.",
    hero: WORK.bodyWaveBlonde,
    hoverImage: WORK.bodyWaveCopper,
    gallery: [
      WORK.bodyWaveBlonde,
      WORK.bodyWaveCopper,
      WORK.bodyWaveSideSweep,
      WORK.bobSoftLob,
    ],
    order: 4,
  },
  {
    slug: "color-and-custom",
    title: "Color & Custom",
    tagline: "Blonde. Copper. Pink.",
    summary: "Explore custom colour inspiration.",
    description:
      "Colour inspiration from the chair: platinum, copper, burgundy and candy pink, all of it worked on the unit rather than on your own hair. Bring a reference to your consult and Nat will tell you straight what the unit you have can and cannot be taken to.",
    metaDescription:
      "Colour and custom wig inspiration from Crowned by Nat. Blonde, copper, burgundy, and pink lace installs, in Towson and Laurel, MD.",
    hero: WORK.colourPinkStraight,
    hoverImage: WORK.bodyWaveCopper,
    gallery: [
      WORK.colourPinkStraight,
      WORK.bodyWaveCopper,
      WORK.bodyWaveBlonde,
      WORK.colourCopperCentrePart,
      WORK.colourBlondeStraight,
      WORK.bobBurgundyCurl,
    ],
    order: 5,
  },
  {
    slug: "natural-lace",
    title: "Natural Lace",
    tagline: "Seamless. Quiet. Yours.",
    summary: "The install nobody can tell is an install.",
    description:
      "The quiet collection, and the one the others get judged against. Lace tinted to your skin, knots bleached down, the parting flat to the scalp, and the edges laid to follow your own hairline. Nothing here is trying to be noticed.",
    metaDescription:
      "Natural-looking lace installs by Crowned by Nat. Tinted lace, bleached knots, and a seamless hairline, in Towson and Laurel, MD.",
    hero: WORK.deepWaveMeltedPart,
    hoverImage: WORK.straightGlassFinish,
    gallery: [
      WORK.deepWaveMeltedPart,
      WORK.straightGlassFinish,
      WORK.deepWaveBraidedFront,
      WORK.straightSideSwoop,
      WORK.bobSoftLob,
      WORK.deepWaveMiddlePart,
    ],
    order: 6,
  },
];

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
  const n = collection.gallery.length;
  return `${n} ${n === 1 ? "look" : "looks"}`;
}
