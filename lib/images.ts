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
   Six of Nat's installs, crossfading behind a fixed brand block.

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
   always reads as a change:

       deep wave black -> pink straight -> black straight -> platinum body
       wave -> black lob -> copper body wave

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
export type HeroFocal = {
  /** Below 1024px, where the photograph covers a full-width portrait frame. */
  narrow: string;
  /** From 1024px up, where it fills the right 46% of a landscape hero. */
  wide: string;
};

/**
 * For a slide that does not set its own: the middle of the measured set.
 *
 * A new photograph shot the same way as these will land close enough to read
 * correctly untouched, and only needs its own value if it is framed unusually
 * loose or unusually tight.
 */
export const HERO_FOCAL_DEFAULT: HeroFocal = {
  narrow: "center 75%",
  wide: "center 68%",
};

export type HeroSlide = {
  id: string;
  /** Short style name, announced to screen readers and shown at desktop. */
  label: string;
  photo: Photo;
  /** Overrides `HERO_FOCAL_DEFAULT`. Either half may be omitted. */
  focal?: Partial<HeroFocal>;
};

/*
   The values below are measured, not guessed: for each file, the top of the
   hair and the centre of the face were read off the frame, and the position
   solved so the face lands a little above the middle of the panel with the
   whole install still in shot. They are deliberately capped short of the
   point where a 1920-wide panel would clip the top of the hair.
*/
export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "deep-wave",
    label: "Deep wave install",
    photo: HERO_PHOTOS.deepWave,
    focal: { narrow: "center 75%", wide: "center 68%" },
  },
  {
    id: "pink",
    label: "Custom colour install",
    photo: HERO_PHOTOS.pink,
    // Shot from further back, with the sign high on the wall: the client sits
    // low in the file, so most of the overflow comes off the top.
    focal: { narrow: "center 95%", wide: "center 88%" },
  },
  {
    id: "straight",
    label: "Sleek straight install",
    photo: HERO_PHOTOS.straight,
    // The loosest frame in the set - almost half the file is bare wall above
    // her - so this one is pushed hardest.
    focal: { narrow: "center 100%", wide: "center 90%" },
  },
  {
    id: "blonde",
    label: "Body wave install",
    photo: HERO_PHOTOS.blonde,
    // The only close frame: she already fills it, and anything higher than
    // this strands her against the top edge.
    focal: { narrow: "center 43%", wide: "center 43%" },
  },
  {
    id: "bob",
    label: "Signature bob",
    photo: HERO_PHOTOS.bob,
    focal: { narrow: "center 78%", wide: "center 73%" },
  },
  {
    id: "copper",
    label: "Copper body wave",
    photo: HERO_PHOTOS.copper,
    // The mane reaches the top of the file, so the ceiling here is the hair
    // rather than the face; held back to keep the crown intact on a wide
    // monitor.
    focal: { narrow: "center 46%", wide: "center 43%" },
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

/** The slide's focal point, with `HERO_FOCAL_DEFAULT` filling any gap. */
export function heroFocal(slide: HeroSlide): HeroFocal {
  return { ...HERO_FOCAL_DEFAULT, ...slide.focal };
}
