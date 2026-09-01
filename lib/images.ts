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

   WHY THERE IS ONLY ONE CROP PER SLIDE NOW

   The previous stock set shipped every slide twice, a 16:10 landscape and a
   3:4 portrait, because a landscape photograph squeezed into a phone viewport
   loses the hair. That whole apparatus is gone, because the hero itself
   changed shape: it is a portrait panel beside the brand block on a wide
   screen, and a full-bleed portrait on a narrow one. Both frames now want the
   same 3:4 photograph, so one crop serves both and the browser picks a width
   off the srcSet rather than a crop off a media query.

   That is also the honest shape for this photography. These are one person
   standing in a room, shot on a phone in portrait. Cropping them to 16:10 to
   satisfy a desktop hero would cut the lengths out of a photograph whose whole
   subject is the lengths.

   THE ORDER

   No two adjacent slides share a texture or a colour family, so the rotation
   always reads as a change:

       deep wave black -> pink straight -> black straight -> platinum body
       wave -> black lob -> copper body wave

   Slide one is the LCP element and carries the neon studio sign in frame,
   which is the fastest way to establish that this is a real place.
*/

export type HeroSlide = {
  id: string;
  /** Short style name, announced to screen readers and shown at desktop. */
  label: string;
  photo: Photo;
};

export const HERO_SLIDES: HeroSlide[] = [
  { id: "deep-wave", label: "Deep wave install", photo: HERO_PHOTOS.deepWave },
  { id: "pink", label: "Custom colour install", photo: HERO_PHOTOS.pink },
  { id: "straight", label: "Sleek straight install", photo: HERO_PHOTOS.straight },
  { id: "blonde", label: "Body wave install", photo: HERO_PHOTOS.blonde },
  { id: "bob", label: "Signature bob", photo: HERO_PHOTOS.bob },
  { id: "copper", label: "Copper body wave", photo: HERO_PHOTOS.copper },
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
