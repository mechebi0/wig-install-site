/**
 * IMAGE SLOTS - all photography on the site.
 *
 * HOW TO REPLACE WITH NAT'S OWN CLIENT PHOTOS
 * -------------------------------------------
 * Every file lives under `public/images/` and every slot below points at one.
 * To swap in real work: drop a photo in using the same filename, matching the
 * aspect ratio noted on the slot, and nothing else in the codebase changes. If
 * you use a different filename, edit only the `src` here. The components that
 * consume these (hero-carousel, install-carousel, owner, services,
 * style-galleries) read the shape, never the paths.
 *
 * Layout of the folder:
 *
 *   public/images/hero/     the six homepage hero slides, two crops each
 *   public/images/          everything else, 4:5 portrait unless noted
 *
 * Keep `width`/`height` truthful to the file. They reserve layout space, which
 * is what holds Cumulative Layout Shift at zero.
 *
 * SOURCE AND LICENCE OF THE CURRENT PLACEHOLDERS
 * ----------------------------------------------
 * Royalty-free stock from Pexels (pexels.com/license): free commercial use,
 * no attribution required. Downloaded and committed locally rather than
 * hotlinked, so the Cloudflare Pages deployment has no third-party image
 * dependency and cannot break if a CDN URL changes. `sourceId` records the
 * originating Pexels photo for traceability.
 *
 * Two licence limits worth knowing before launch:
 *   1. It does not permit implying an identifiable person endorses the
 *      business. Gallery captions therefore describe the STYLE and never claim
 *      a named client, and testimonials carry no stock faces.
 *   2. These are stand-ins. Nat's real portfolio will convert better than any
 *      of them.
 */

export type ImageSlot = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Originating Pexels photo id, for traceability. Drop when replaced. */
  sourceId?: number;
};

const img = (file: string) => `/images/${file}`;
const heroImg = (file: string) => `/images/hero/${file}`;

/* ==========================================================================
   HOMEPAGE HERO CAROUSEL
   ==========================================================================
   Six slides, art directed for two shapes rather than one image squeezed into
   both. A phone viewport is roughly 9:19; cropping a 16:10 landscape into it
   would leave a narrow vertical band through the middle of the frame and cut
   the hair out of a hair photograph. So every slide ships twice:

     wide  1920x1200 (16:10)  served at >= 768px
     tall  1080x1440 (3:4)    served below 768px

   The component picks between them with <picture> + a media query, so a phone
   downloads only the tall file and a laptop only the wide one. Neither is ever
   fetched twice.

   Art direction rules for anything that replaces these:
     - light, warm and high key, so the wine scrim reads as a tint rather than
       mud, and so the overlaid brand text keeps its contrast
     - the subject sitting centre or right of frame, because the brand block is
       anchored bottom left
     - one texture per slide, and no two adjacent slides sharing a texture
*/

export type HeroSlide = {
  id: string;
  /** Short style name, announced to screen readers and shown at desktop. */
  label: string;
  alt: string;
  wide: { src: string; width: number; height: number };
  tall: { src: string; width: number; height: number };
  sourceId?: number;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "signature-wave",
    label: "Body-wave install",
    alt: "Long honey body-wave hair falling past the shoulders, photographed from behind against a soft pink wall",
    wide: { src: heroImg("01-signature-wave-wide.jpg"), width: 1920, height: 1200 },
    tall: { src: heroImg("01-signature-wave-tall.jpg"), width: 1080, height: 1440 },
    sourceId: 35267461,
  },
  {
    id: "sleek-straight",
    label: "Sleek straight install",
    alt: "A woman in a cream gown wearing a long jet black sleek straight unit swept into a high ponytail",
    wide: { src: heroImg("02-sleek-straight-wide.jpg"), width: 1920, height: 1200 },
    tall: { src: heroImg("02-sleek-straight-tall.jpg"), width: 1080, height: 1440 },
    sourceId: 38879889,
  },
  {
    id: "texture-lineup",
    label: "Four textures",
    alt: "Four finished units seen from behind side by side: straight, body wave, tight curl and sleek dark lengths",
    wide: { src: heroImg("03-texture-lineup-wide.jpg"), width: 1920, height: 1200 },
    tall: { src: heroImg("03-texture-lineup-tall.jpg"), width: 1080, height: 1440 },
    sourceId: 29096365,
  },
  {
    id: "dressed-updo",
    label: "Dressed updo",
    alt: "A blonde unit dressed into a low coiled updo and pinned with dusty rose flowers, seen from behind",
    wide: { src: heroImg("04-dressed-updo-wide.jpg"), width: 1920, height: 1200 },
    tall: { src: heroImg("04-dressed-updo-tall.jpg"), width: 1080, height: 1440 },
    sourceId: 11654504,
  },
  {
    id: "in-the-chair",
    label: "In the chair",
    alt: "A stylist setting a section of long copper hair with a curling wand during an appointment",
    wide: { src: heroImg("05-in-the-chair-wide.jpg"), width: 1920, height: 1200 },
    tall: { src: heroImg("05-in-the-chair-tall.jpg"), width: 1080, height: 1440 },
    sourceId: 3065209,
  },
  {
    id: "glass-wave",
    label: "Glass wave install",
    alt: "A glossy dark body-wave unit falling over one shoulder against a warm terracotta backdrop",
    wide: { src: heroImg("06-glass-wave-wide.jpg"), width: 1920, height: 1200 },
    tall: { src: heroImg("06-glass-wave-tall.jpg"), width: 1080, height: 1440 },
    sourceId: 1172559,
  },
];

/* ==========================================================================
   SINGLE SLOTS
   ========================================================================== */

/**
 * 4:5 portrait. Nat at work, in the About section.
 *
 * Hands and hair, no face. That is on purpose while this is a stand-in: a
 * stock portrait sitting under a heading that says "Meet Nat" quietly claims
 * that the model IS Nat, which is not true and is not something the Pexels
 * licence permits either. A hands-at-work frame says the honest thing until
 * Nat sends her own photograph, and it is the frame the heading is about.
 */
export const OWNER_IMAGE: ImageSlot = {
  src: img("owner-at-work.jpg"),
  alt: "A stylist pinning the last section of a blonde unit dressed into a soft updo",
  width: 900,
  height: 1125,
  sourceId: 15507425,
};

/**
 * 4:3 landscape. Fills the featured services cell.
 *
 * A unit photographed flat, lace cap up, because the services section is about
 * what actually gets worked on. It shows the thing the whole business is
 * about: the lace, the knots, and the perimeter that has to be tinted and cut.
 */
export const SERVICE_IMAGE: ImageSlot = {
  src: img("unit-lace-cap-wide.jpg"),
  alt: "A brown wig laid flat with the lace cap facing up, showing the knots and the lace perimeter",
  width: 1000,
  height: 750,
  sourceId: 13074451,
};

/* ==========================================================================
   FEATURED INSTALLS
   ==========================================================================
   The swipeable rail under the services section. Photographs only: the brand
   itself is established by the hero carousel at the top of the page, so a
   logo slide in here would say the same thing twice.
*/

export type CarouselSlide = {
  image: ImageSlot;
  title: string;
  caption: string;
};

export const CAROUSEL: CarouselSlide[] = [
  {
    image: {
      src: img("finish-bodywave-lengths.jpg"),
      alt: "Long chestnut body-wave lengths falling past the shoulders, seen from behind",
      width: 900,
      height: 1125,
      sourceId: 35267458,
    },
    title: "Body-wave lengths",
    caption: "Frontal install, 22 inch unit set into a soft wave.",
  },
  {
    image: {
      src: img("finish-dressed-chignon.jpg"),
      alt: "A dark unit dressed into a low twisted chignon with a fine pearl pin",
      width: 900,
      height: 1125,
      sourceId: 16976882,
    },
    title: "Dressed chignon",
    caption: "Bridal fitting, unit dressed into a low twist.",
  },
  {
    image: {
      src: img("finish-blunt-bob.jpg"),
      alt: "A blunt jaw-length bob with a sharp baseline, against a soft pink ground",
      width: 900,
      height: 1125,
      sourceId: 8182251,
    },
    title: "Blunt bob",
    caption: "Closure install, cut to a sharp jaw-length baseline.",
  },
  {
    image: {
      src: img("finish-soft-curl-set.jpg"),
      alt: "A soft blonde curl set framing the face, photographed close against a pale ground",
      width: 900,
      height: 1125,
      sourceId: 235490,
    },
    title: "Soft curl set",
    caption: "Frontal install, curls shaped and separated on the day.",
  },
  {
    image: {
      src: img("finish-long-straight.jpg"),
      alt: "Long dark hair fanned out and lit from behind",
      width: 900,
      height: 1125,
      sourceId: 10224830,
    },
    title: "Long and straight",
    caption: "Frontal install, 24 inch unit pressed straight.",
  },
  {
    image: {
      src: img("finish-scarlet-fringe.jpg"),
      alt: "A vivid red unit with a full fringe",
      width: 900,
      height: 1125,
      sourceId: 6270123,
    },
    title: "Scarlet fringe",
    caption: "Colour unit customized in studio, then installed.",
  },
];

/* ==========================================================================
   STYLE GALLERIES
   ==========================================================================
   Grouped by the look a client actually asks for, so a visitor can browse one
   style without wading through the rest.
*/

export type StyleGroup = {
  id: string;
  label: string;
  blurb: string;
  shots: ImageSlot[];
};

export const STYLE_GROUPS: StyleGroup[] = [
  {
    id: "bobs",
    label: "Bobs and lobs",
    blurb:
      "Short units live or die on the perimeter cut. These are finished on the head, never off the stand.",
    shots: [
      {
        src: img("finish-waved-lob.jpg"),
        alt: "A cool brown lob with soft movement through the ends",
        width: 900,
        height: 1125,
        sourceId: 1369273,
      },
      {
        src: img("finish-blunt-bob.jpg"),
        alt: "A blunt jaw-length bob with a sharp baseline",
        width: 900,
        height: 1125,
        sourceId: 8182251,
      },
      {
        src: img("finish-rose-bob.jpg"),
        alt: "A blunt pink bob with a straight fringe",
        width: 900,
        height: 1125,
        sourceId: 6923441,
      },
    ],
  },
  {
    id: "curls",
    label: "Curls and coils",
    blurb:
      "Density is set before the lace goes down, so the shape holds instead of collapsing by week two.",
    shots: [
      {
        src: img("finish-volume-curls.jpg"),
        alt: "A high-volume curly unit shaped into a rounded silhouette",
        width: 900,
        height: 1125,
        sourceId: 6923437,
      },
      {
        src: img("finish-soft-curl-set.jpg"),
        alt: "A soft blonde curl set shaped around the face",
        width: 900,
        height: 1125,
        sourceId: 235490,
      },
      {
        src: img("style-curl-detail.jpg"),
        alt: "Close detail of tight pink and blonde curls",
        width: 900,
        height: 1125,
        sourceId: 4718638,
      },
    ],
  },
  {
    id: "long",
    label: "Long and waved",
    blurb:
      "Length pulls at the perimeter all day. The base braid pattern changes for anything past 22 inches.",
    shots: [
      {
        src: img("finish-bodywave-lengths.jpg"),
        alt: "Long chestnut body-wave lengths seen from behind",
        width: 900,
        height: 1125,
        sourceId: 35267458,
      },
      {
        src: img("finish-long-straight.jpg"),
        alt: "Long dark hair fanned out and backlit",
        width: 900,
        height: 1125,
        sourceId: 10224830,
      },
      {
        src: img("style-long-comb.jpg"),
        alt: "A wide-tooth comb drawn through long conditioned hair",
        width: 900,
        height: 1125,
        sourceId: 23349912,
      },
      {
        src: img("style-blonde-detail.jpg"),
        alt: "Close detail of long blonde hair against a soft pink ground",
        width: 900,
        height: 1125,
        sourceId: 14730872,
      },
    ],
  },
  {
    id: "colour",
    label: "Colour work",
    blurb:
      "Colour is done on the unit before it ever touches your head, so your own hair takes none of it.",
    shots: [
      {
        src: img("finish-scarlet-fringe.jpg"),
        alt: "A vivid red unit with a blunt fringe",
        width: 900,
        height: 1125,
        sourceId: 6270123,
      },
      {
        src: img("finish-dressed-updo.jpg"),
        alt: "A coiled braided updo dressed with small flowers",
        width: 900,
        height: 1125,
        sourceId: 2301842,
      },
      {
        src: img("style-honey-centre-part.jpg"),
        alt: "A honey blonde unit styled with a centre part",
        width: 900,
        height: 1125,
        sourceId: 35150126,
      },
    ],
  },
];
