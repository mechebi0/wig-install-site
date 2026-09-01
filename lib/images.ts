/**
 * IMAGE SLOTS that are not part of a style collection.
 *
 * The portfolio itself lives in lib/collections.ts, which owns every
 * photograph of finished work and the six collections they are grouped into.
 * What is left here is the homepage hero rotation, plus the two single slots
 * that are not portfolio pieces.
 *
 * ---------------------------------------------------------------------------
 * PROVENANCE, WHICH IS NOW TWO DIFFERENT THINGS
 * ---------------------------------------------------------------------------
 * REAL. Everything in HERO_SLIDES is Nat's own work, pulled from the same set
 * as the collections and referenced straight out of lib/collections.ts so a
 * photograph is never described twice.
 *
 * STAND-IN. The two slots at the bottom are still royalty-free stock from
 * Pexels (pexels.com/license: free commercial use, no attribution required),
 * committed locally rather than hotlinked so the Cloudflare Pages deployment
 * has no third-party image dependency. `sourceId` records the originating
 * photo. Neither one is presented as Nat's work, and that is the line: stock
 * may illustrate an object, never a result.
 */

import { HERO_PHOTOS, type Photo } from "@/lib/collections";

export type ImageSlot = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Originating Pexels photo id, for traceability. Drop when replaced. */
  sourceId?: number;
};

const img = (file: string) => `/images/${file}`;

/* ==========================================================================
   HOMEPAGE HERO CAROUSEL
   ==========================================================================
   Seven of Nat's installs, crossfading behind a fixed brand block.

   WHY THERE IS ONLY ONE CROP PER SLIDE

   The previous stock set shipped every slide twice, a 16:10 landscape and a
   3:4 portrait. That apparatus is gone. These are one person standing in a
   room, shot on a phone in portrait, and cropping them to a landscape hero was
   tried: it cuts the face off at the mouth and removes the hair, on a wig
   installer's website. So the file is never cropped to a landscape shape. The
   full-width desktop hero puts it at its native ratio over a blurred copy of
   itself instead; see the note in components/hero-carousel.tsx.

   THE ORDER

   No two adjacent slides share a texture or a colour family, so the rotation
   always reads as a change, with one deliberate exception at the lead; see
   "THE SEVEN, AND WHY IN THIS ORDER" below, next to the array itself, for the
   current order and the reasoning.

   Slide one is the LCP element and carries the neon studio sign in frame,
   which is the fastest way to establish that this is a real place.
*/

/**
 * Where the subject sits in the frame, as an `object-position` value.
 *
 * Both hero frames crop, and they crop by different amounts, so each carries
 * its own value. Below `lg` the photograph covers a full-width portrait frame
 * close to its own ratio, so there is only a little overflow to spend. From
 * `lg` it fills 46% of a landscape hero, which is a 1.18 frame against a 0.75
 * file and crops considerably harder.
 *
 * The number is the share of that overflow taken off the TOP, so it runs the
 * way a contact sheet does rather than the way intuition suggests: a LOW
 * percentage keeps the top of the file and pushes the client toward the foot
 * of the frame, a HIGH percentage scrolls down the file and lifts her.
 *
 * WHY IT CANNOT BE ONE NUMBER FOR THE WHOLE SET
 * These are phone photographs taken in a working salon, not studio plates shot
 * to a mark. The neon sign is on the wall behind the chair, so Nat frames to
 * include it, and how much room that leaves above the client varies with where
 * she was standing. Measured off the files, the top of the hair lands anywhere
 * between 22% and 44% down the frame and the face between 44% and 64%. One
 * shared value therefore cannot be right twice: tuned for the copper body wave
 * it buries the straight install, tuned for the straight install it crops the
 * copper. Each slide carries its own.
 */
/**
 * An `object-position` value. One per slide, and one for both hero frames.
 *
 * It used to be two, because the phone frame was near-portrait and cropped
 * almost nothing while the desktop panel was 1.18 and cropped a third of the
 * height. Both frames changed with the 40/60 layout: the phone band is now
 * about 1.2 and the desktop panel 1.33, and a single measured value covers
 * both to within a few percent of frame height. Splitting it again would mean
 * two numbers that have to be kept in step for no reason.
 */
export type HeroFocal = string;

/**
 * For a slide that does not set its own: the middle of the measured set.
 *
 * A new photograph shot the same way as these will land close enough to read
 * correctly untouched, and only needs its own value if it is framed unusually
 * loose or unusually tight.
 */
export const HERO_FOCAL_DEFAULT: HeroFocal = "center 68%";

export type HeroSlide = {
  id: string;
  /**
   * The eyebrow above the headline, and the slide's name in the live region.
   *
   * Five of the six name a hairstyle. The sixth names a FINISH - Natural Lace
   * is how well the unit is attached, not a texture - which is why that slide
   * also carries `style`: the label says what the frame is about, and `style`
   * says what the hair in it actually is, so the two axes stay distinct
   * instead of Natural Lace quietly becoming a sixth hairstyle.
   */
  label: string;
  /** The h1 while this slide is showing. One line at desktop, two on a phone. */
  headline: string;
  /** One sentence under the headline. Kept under 90 characters; see below. */
  description: string;
  photo: Photo;
  /**
   * The hairstyle in the frame, when that differs from `label`. Only the
   * finish slide sets it, and only the accessible name reads it.
   */
  style?: string;
  /** The finish in the frame, when it is worth naming. */
  finish?: string;
  /**
   * The collection this look belongs to, as a slug in lib/collections.ts.
   *
   * It is what the hero's secondary CTA points at, so someone who likes the
   * slide in front of them lands on more of that same style rather than on the
   * top of the directory. Every slide must name a slug that exists.
   *
   * Natural Lace is in the rotation now and points at its own collection,
   * which is correct rather than duplicative: that page is a finish collection
   * holding installs of every texture, so it is a real destination and not a
   * second copy of the bob page.
   */
  collection: string;
  /** Overrides `HERO_FOCAL_DEFAULT`. */
  focal?: HeroFocal;
};

/*
   THE SEVEN, AND WHY IN THIS ORDER

   Copy first: each slide carries its own label, headline and sentence, and the
   carousel renders whichever the active index names. There is one index and it
   drives the photograph and the words together, so they cannot drift apart.

   The copy below is TEMPORARY MARKETING TEXT written to be replaced. It says
   nothing Nat has not already demonstrated in the photograph beside it - no
   prices, no timings, no claims about products - so it is safe to ship while
   she writes her own.

   ORDER. Slide one used to be the crimped deep wave, kept because it is the
   only frame in the deep wave set with no neon sign on the wall behind the
   client, matching the same sign the nav bar now carries as its logo. The new
   lead was supplied directly, sign and all, as the frame the homepage should
   open on, so that tradeoff is accepted here rather than solved again. The
   crimped deep wave keeps its place immediately after it rather than being
   reordered elsewhere in the six, which costs the rule below its one
   exception: two adjacent slides now share both a texture and a label,
   "Deep Wave Glam" twice in a row.

   After that the rule is the one this rotation has always used: no two
   adjacent slides share a colour family AND a texture, including across the
   wrap from seven back to one.

       black deep wave (swirl, sign in frame) -> black deep wave (crimped) ->
       black straight -> burgundy bob -> platinum body wave -> candy pink
       straight -> black bob -> (back to swirl)

   LENGTHS. Headlines are held to roughly 40 characters and descriptions to
   roughly 90, which is what keeps the copy block the same height on every
   slide. The block reserves a minimum height anyway, but matching the copy is
   what stops the CTAs shifting a few pixels as the text changes.
*/
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "deep-wave-swirl",
    label: "Deep Wave Glam",
    headline: "A hairline that melts into skin.",
    description:
      "Swirled baby hairs, a clean centre part, and lace you cannot find.",
    photo: HERO_PHOTOS.deepWaveSwirl,
    finish: "Melted Hairline",
    collection: "deep-wave-glam",
    // A moderately close frame: the crown sits at roughly 33% of the file and
    // the face around 55%, close to the crimped deep wave's own numbers.
    focal: "center 55%",
  },
  {
    id: "deep-wave",
    label: "Deep Wave Glam",
    headline: "Texture that moves with you.",
    description:
      "Defined waves, seamless lace, and a finish designed to turn heads.",
    photo: HERO_PHOTOS.deepWave,
    finish: "Melted Hairline",
    collection: "deep-wave-glam",
    // A close frame: the crown sits high at 31% of the file while the face is
    // low at 61%, so this one is held back to keep the hair off the top edge.
    focal: "center 62%",
  },
  {
    id: "straight",
    label: "Sleek Straight",
    headline: "Silky. Sleek. Effortlessly polished.",
    description:
      "Clean lines, a flawless finish, and a look that speaks for itself.",
    photo: HERO_PHOTOS.straight,
    finish: "Natural Lace",
    collection: "sleek-straight",
    // The loosest frame in the set - almost half the file is bare wall above
    // her - so this one is pushed hardest.
    focal: "center 90%",
  },
  {
    id: "bob",
    label: "Signature Bob",
    headline: "A statement cut, tailored to you.",
    description: "Sharp, polished, and shaped to complement your features.",
    photo: HERO_PHOTOS.bob,
    finish: "Melted Hairline",
    collection: "signature-bob",
    focal: "center 67%",
  },
  {
    id: "body-wave",
    label: "Body Wave Glam",
    headline: "Soft waves. Full volume. Pure glamour.",
    description: "Luxurious movement and body, from the first look to the last.",
    photo: HERO_PHOTOS.blonde,
    finish: "Natural Lace",
    collection: "body-wave-glam",
    // The only close frame: she already fills it, and anything higher than
    // this strands her against the top edge.
    focal: "center 43%",
  },
  {
    id: "colour",
    label: "Color & Custom",
    headline: "Your vision, brought to life.",
    description:
      "Custom color and styling, made to leave your install unmistakably yours.",
    photo: HERO_PHOTOS.pink,
    finish: "Melted Hairline",
    collection: "color-and-custom",
    // Shot from further back, with the sign high on the wall: the client sits
    // low in the file, so most of the overflow comes off the top.
    focal: "center 88%",
  },
  {
    id: "natural-lace",
    label: "Natural Lace",
    headline: "Made to look like it grew there.",
    description:
      "Customized lace and a seamless hairline, for an effortlessly natural finish.",
    photo: HERO_PHOTOS.lace,
    // The label is the FINISH. This says what the hair itself is, so the two
    // axes stay separate and the slide does not read as a sixth hairstyle.
    style: "Signature Bob",
    finish: "Natural Lace",
    collection: "natural-lace",
    focal: "center 73%",
  },
];

/* ==========================================================================
   SINGLE SLOTS - both still stand-ins
   ========================================================================== */

/**
 * 4:3 landscape. Fills the featured cell in the services panel on /book.
 *
 * A unit photographed flat with the lace cap facing up, because the services
 * section is about the thing that gets worked on rather than about a result.
 * It shows the lace, the knots and the perimeter that has to be tinted and
 * cut. STAND-IN, and the one place a stock photograph is defensible: it
 * illustrates an object, and claims nothing about whose work it is.
 */
export const SERVICE_IMAGE: ImageSlot = {
  src: img("unit-lace-cap-wide.jpg"),
  alt: "A brown wig laid flat with the lace cap facing up, showing the knots and the lace perimeter",
  width: 1000,
  height: 750,
  sourceId: 13074451,
};

/** The slide's focal point, falling back to `HERO_FOCAL_DEFAULT`. */
export function heroFocal(slide: HeroSlide): HeroFocal {
  return slide.focal ?? HERO_FOCAL_DEFAULT;
}
