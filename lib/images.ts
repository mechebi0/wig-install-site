/**
 * IMAGE SLOTS - all photography on the site.
 *
 * HOW TO REPLACE WITH THE CLIENT'S OWN PHOTOS
 * -------------------------------------------
 * Every file lives in `public/images/` and every slot below points at one.
 * To swap in real work: drop a photo into `public/images/` using the same
 * filename, matching the aspect ratio noted on the slot, and nothing else in
 * the codebase changes. If you use a different filename, edit only the `src`
 * here. The five components that consume these (hero, install-carousel, owner,
 * services, style-galleries) read the shape, never the paths.
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
 *   2. These are stand-ins. The owner's real portfolio will convert better.
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

/** 4:5 portrait. The LCP image. */
export const HERO_IMAGE: ImageSlot = {
  src: img("hero-install.jpg"),
  alt: "A stylist adjusting a soft pink wig for a smiling seated client",
  width: 1100,
  height: 1375,
  sourceId: 6923561,
};

/** 4:5 portrait. The owner at work. */
export const OWNER_IMAGE: ImageSlot = {
  src: img("owner-at-work.jpg"),
  alt: "A stylist shaping a voluminous curly unit for a seated client",
  width: 900,
  height: 1125,
  sourceId: 6923469,
};

/** 4:3 landscape. Fills the featured services cell. */
export const SERVICE_IMAGE: ImageSlot = {
  src: img("unit-on-stand-wide.jpg"),
  alt: "A sleek dark bob unit on a styling stand, ready for customization",
  width: 1000,
  height: 750,
  sourceId: 17320163,
};

/**
 * Finished-install carousel.
 *
 * Slide 1 is intentionally not a photograph. It is the brand slide, so the
 * carousel opens on the studio's identity before the work. It renders the logo
 * at `STUDIO.logo` (currently a clearly-marked placeholder in public/brand/),
 * and falls back to the wordmark if that is cleared.
 */
export type CarouselSlide =
  | { kind: "brand"; caption: string }
  | { kind: "photo"; image: ImageSlot; title: string; caption: string };

export const CAROUSEL: CarouselSlide[] = [
  {
    kind: "brand",
    caption: "Lace installs, fitted and finished by hand.",
  },
  {
    kind: "photo",
    image: {
      src: img("finish-rose-bob.jpg"),
      alt: "A blunt pink bob unit styled with a soft fringe",
      width: 900,
      height: 1125,
      sourceId: 6923441,
    },
    title: "Rose bob",
    caption: "Closure install, blunt cut with a soft fringe.",
  },
  {
    kind: "photo",
    image: {
      src: img("finish-waved-lob.jpg"),
      alt: "A softly waved shoulder-length bob in a cool brown",
      width: 900,
      height: 1125,
      sourceId: 1369273,
    },
    title: "Waved lob",
    caption: "Frontal install, tinted lace and a shoulder-length cut.",
  },
  {
    kind: "photo",
    image: {
      src: img("finish-volume-curls.jpg"),
      alt: "A high-volume curly unit being shaped by a stylist",
      width: 900,
      height: 1125,
      sourceId: 6923437,
    },
    title: "Volume curls",
    caption: "Frontal install, shaped and separated on the day.",
  },
  {
    kind: "photo",
    image: {
      src: img("finish-dressed-updo.jpg"),
      alt: "An intricate braided and coiled updo dressed with small flowers",
      width: 900,
      height: 1125,
      sourceId: 2301842,
    },
    title: "Dressed updo",
    caption: "Bridal fitting, unit dressed into a coiled braid.",
  },
  {
    kind: "photo",
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
    kind: "photo",
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

/**
 * Swipeable galleries, grouped by the look a client actually asks for, so a
 * visitor can browse one style without wading through the rest.
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
        src: img("finish-rose-bob.jpg"),
        alt: "A blunt pink bob with a straight fringe",
        width: 900,
        height: 1125,
        sourceId: 6923441,
      },
      {
        src: img("style-bob-on-stand.jpg"),
        alt: "A dark bob unit on a stand showing the blunt baseline",
        width: 900,
        height: 1125,
        sourceId: 17320163,
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
        src: img("style-curl-detail.jpg"),
        alt: "Close detail of tight pink and blonde curls",
        width: 900,
        height: 1125,
        sourceId: 4718638,
      },
      {
        src: img("owner-at-work.jpg"),
        alt: "A stylist separating curls on a freshly fitted unit",
        width: 900,
        height: 1125,
        sourceId: 6923469,
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
