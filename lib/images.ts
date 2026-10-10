/**
 * THE WORDS AND CROPS around the site's fixed photographs.
 *
 * Which photograph fills each fixed place - a slide of the homepage hero, the
 * picture in the services menu on /book, the one beside the sign-in forms -
 * is Nat's choice now, made in the photo manager and stored in
 * site_photo_slots (migration 0007). The words written AROUND a photograph,
 * each slide's eyebrow, headline and sentence, are Nat's too, from the
 * dashboard (Homepage). What stays in code is each slide's place, collection
 * and crop: the crops measured for the photographs the site launched with.
 *
 * A measured crop only means something for the frame it was measured on, so
 * each one is used while that launch photograph is still the one in the
 * place, and a photograph Nat puts there instead brings its own (see
 * resolveSite in lib/gallery.ts).
 *
 * ---------------------------------------------------------------------------
 * PROVENANCE
 * ---------------------------------------------------------------------------
 * ALL REAL. Every photograph on the site is Nat's own work. There is no stock
 * photography on the site any more: the last piece, a Pexels shot of a wig
 * laid flat, used to fill the services slot on /book and was replaced with
 * one of Nat's own frames. If a place ever needs a picture the set does not
 * have, it gets a real frame that honestly fits it rather than stock.
 */

import { SITE } from "@/lib/cms/published";
import type { SlotId } from "@/lib/site-photos";

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
   always reads as a change; see "THE SIX, AND WHY IN THIS ORDER" below,
   next to the array itself, for the current order and the reasoning.

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
  /**
   * The place this slide's photograph comes from, in slideshow order. If Nat
   * hides or removes the photograph there, the slide shows another from
   * `collection` instead, and is left out if that collection has none.
   */
  slot: Extract<SlotId, `home-${number}`>;
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
  /**
   * Overrides `HERO_FOCAL_DEFAULT`, for the photograph this slide launched
   * with. A different photograph in the slot uses its own crop.
   */
  focal?: HeroFocal;
};

/*
   THE SIX, AND WHY IN THIS ORDER

   Copy first: each slide carries its own label, headline and sentence, and the
   carousel renders whichever the active index names. There is one index and it
   drives the photograph and the words together, so they cannot drift apart.

   The words are Nat's to rewrite in the dashboard (Homepage, Slideshow);
   lib/cms/defaults.ts holds the launch copy, which says nothing she has not
   already demonstrated in the photograph beside it - no prices, no timings,
   no claims about products.

   ORDER. Slide one used to be the crimped deep wave, kept because it is the
   only frame in the deep wave set with no neon sign on the wall behind the
   client, matching the same sign the nav bar now carries as its logo. The new
   lead was supplied directly, sign and all, as the frame the homepage should
   open on, so that tradeoff is accepted here rather than solved again.

   Both are "Deep Wave Glam", so putting them next to each other would repeat
   that label on screen two slides running - the one adjacency the rule below
   cannot allow no matter what the photographs look like. The crimped deep
   wave therefore moved rather than staying in place: it now sits fourth,
   with a straight and a bob between it and the lead on one side and a
   colour and a bob between it and the lead on the other.

   With that the rule this rotation has always used still holds with no
   exception: no two adjacent slides share a colour family AND a texture,
   including across the wrap from six back to one.

       black deep wave (swirl, sign in frame) -> black straight -> burgundy
       bob -> black deep wave (crimped) -> candy pink straight -> black bob
       -> (back to swirl)

   LENGTHS. Headlines are held to roughly 40 characters and descriptions to
   roughly 90, which is what keeps the copy block the same height on every
   slide. The block reserves a minimum height anyway, but matching the copy is
   what stops the CTAs shifting a few pixels as the text changes.
*/
/** A slide's words, as Nat last published them, by the slide's id. */
function slideCopy(id: string): Pick<HeroSlide, "label" | "headline" | "description"> {
  // Every slide id below is in DEFAULT_CONTENT, and lib/cms/model.ts puts back any missing.
  const { label, headline, description } = SITE.home.slides.find((slide) => slide.id === id)!;
  return { label, headline, description };
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "deep-wave-swirl",
    ...slideCopy("deep-wave-swirl"),
    slot: "home-1",
    finish: "Melted Hairline",
    collection: "deep-wave-glam",
    // A moderately close frame: the crown sits at roughly 33% of the file and
    // the face around 55%, close to the crimped deep wave's own numbers.
    focal: "center 55%",
  },
  {
    id: "straight",
    ...slideCopy("straight"),
    slot: "home-2",
    finish: "Natural Lace",
    collection: "sleek-straight",
    // The loosest frame in the set - almost half the file is bare wall above
    // her - so this one is pushed hardest.
    focal: "center 90%",
  },
  {
    id: "bob",
    ...slideCopy("bob"),
    slot: "home-3",
    finish: "Melted Hairline",
    collection: "signature-bob",
    focal: "center 67%",
  },
  {
    id: "deep-wave",
    ...slideCopy("deep-wave"),
    slot: "home-4",
    finish: "Melted Hairline",
    collection: "deep-wave-glam",
    // A close frame: the crown sits high at 31% of the file while the face is
    // low at 61%, so this one is held back to keep the hair off the top edge.
    focal: "center 62%",
  },
  {
    id: "colour",
    ...slideCopy("colour"),
    slot: "home-5",
    finish: "Melted Hairline",
    collection: "color-and-custom",
    // Shot from further back, with the sign high on the wall: the client sits
    // low in the file, so most of the overflow comes off the top.
    focal: "center 88%",
  },
  {
    id: "natural-lace",
    ...slideCopy("natural-lace"),
    slot: "home-6",
    // The label is the FINISH. This says what the hair itself is, so the two
    // axes stay separate and the slide does not read as a sixth hairstyle.
    style: "Signature Bob",
    finish: "Natural Lace",
    collection: "natural-lace",
    focal: "center 73%",
  },
];

/* ==========================================================================
   SINGLE SLOT
   ========================================================================== */

/**
 * The crop for the featured cell in the services menu on /book (the `book`
 * place), which carries the first service: Frontal Install.
 *
 * The cell is 16:10 and the file is 3:4, so the crop keeps a band a little
 * under half the file's height. For the launch photograph, the S-wave side
 * sweep, this puts that band on the laid hairline and the swirls at both
 * temples, which are the point of the frame. Its stand-in, if Nat hides it,
 * is the first published frontal (see resolveSite in lib/gallery.ts), so the
 * picture in the frontal cell stays a frontal where one exists.
 */
export const BOOK_FOCAL = "center 35%";

/**
 * The crop for the photograph beside the sign-in forms (the `sign-in`
 * place). The launch photograph is tall with bare wall above the client, so
 * this keeps the top fifth: the crown and the parting.
 */
export const SIGN_IN_FOCAL = "center 20%";
