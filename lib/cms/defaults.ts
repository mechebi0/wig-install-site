/**
 * EVERY WORD NAT CAN CHANGE FROM /admin/, AS THE SITE SHIPPED IT.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE IS
 * ---------------------------------------------------------------------------
 * The website's editable content, grouped by page and section, with the
 * wording the site carried before anyone edited it. Nothing on the public
 * site reads this object directly: lib/cms/published.ts lays whatever Nat
 * has published on top of it (lib/cms/model.ts), and lib/content.ts,
 * lib/taxonomy.ts, lib/collections.ts and lib/images.ts hand the result to
 * the pages under the names they have always used.
 *
 * So a value here is the FALLBACK, used for any field Nat has never
 * published and for any published value that fails a check. Changing a
 * string here changes the site only where she has not written her own.
 *
 * Each top-level key is one SECTION: one card of fields in the dashboard,
 * one draft row in `site_content_drafts`, one key in a published release
 * (supabase/migrations/0011_website_content.sql). Field names are the
 * stable keys the database stores, so renaming one orphans what Nat wrote
 * under the old name; add a new key instead.
 *
 * ---------------------------------------------------------------------------
 * LOCATIONS ARE WRITTEN ONCE
 * ---------------------------------------------------------------------------
 * Towns appear in `locations` and nowhere else. Copy that mentions where Nat
 * works says so with a placeholder, filled in when the site is built:
 *
 *   {current location}   "Towson, MD"
 *   {other locations}    "Laurel, MD"
 *   {all locations}      "Towson and Laurel, MD"
 *
 * so changing the current location in the dashboard changes every sentence
 * that names it (lib/cms/model.ts, fillLocationTokens).
 *
 * The voice rules in lib/content.ts still apply to every default here: no
 * em-dashes or en-dashes in copy, no filler verbs.
 */

import type { ContentRules } from "@/lib/cms/model";

/** The four headings the service menu is filed under, by a fixed id. */
export type ServiceCategoryId = "wig-installs" | "reinstalls" | "color-services" | "services";

/**
 * Which heading each service is filed under. Structure, not copy: it decides
 * which services share a booking page's switch, so it stays in code. Nat
 * renames the headings themselves (`services.categories`).
 */
export const SERVICE_CATEGORY_OF: Record<string, ServiceCategoryId> = {
  "frontal-install": "wig-installs",
  "closure-install": "wig-installs",
  "frontal-reinstall": "reinstalls",
  "closure-reinstall": "reinstalls",
  "color-frontal-install": "color-services",
  "color-closure-install": "color-services",
  "wig-touch-up": "services",
};

/** The homepage blocks below the slideshow, which Nat can reorder and hide. */
export type HomeSectionId = "installs" | "collections" | "featured";

export const DEFAULT_CONTENT = {
  business: {
    name: "Crowned by Nat",
    owner: "Nat",
    email: "crownedbynattt@gmail.com",
    phone: "",
    street: "",
    /** The booking window the studio advertises; the "Booking hours" row on /book. */
    hours: [{ days: "Tuesday to Saturday", time: "10:00 AM – 9:00 PM" }],
  },

  locations: {
    /** The id of the current location. Must be one of the active items. */
    primary: "towson",
    items: [
      { id: "towson", name: "Towson", region: "MD", description: "", notice: "", active: true },
      { id: "laurel", name: "Laurel", region: "MD", description: "", notice: "", active: true },
    ],
  },

  services: {
    heading: "Every way to sit in the chair.",
    intro:
      "Prices are for the service. You bring the unit, or send a link before you buy one and you will get an honest read on it.",
    categories: {
      "wig-installs": "Wig Installs",
      reinstalls: "Reinstalls",
      "color-services": "Color Services",
      services: "Services",
    },
    /**
     * The seven services, in menu order. `price` is in cents; `minutes` is the
     * length printed on the /book menu, 0 for none. Neither changes Square,
     * which takes the booking.
     */
    items: [
      {
        id: "frontal-install",
        name: "Frontal Install",
        price: 10000,
        minutes: 120,
        description:
          "Lace tinted to your skin, knots bleached, hairline plucked and cut. Includes the style you leave in.",
        active: true,
      },
      {
        id: "closure-install",
        name: "Closure Install",
        price: 9000,
        minutes: 90,
        description: "Less lace to manage, lower upkeep, and gentler on a tender scalp.",
        active: true,
      },
      {
        id: "frontal-reinstall",
        name: "Frontal Reinstall",
        price: 9000,
        minutes: 0,
        description:
          "A fresh lay on a unit you already have, with a frontal lace. The parting, melt and edges are all redone.",
        active: true,
      },
      {
        id: "closure-reinstall",
        name: "Closure Reinstall",
        price: 8000,
        minutes: 0,
        description:
          "A fresh lay on a unit you already have, with a closure. Quicker than a frontal, with less lace to redo.",
        active: true,
      },
      {
        id: "color-frontal-install",
        name: "Color Frontal Install",
        price: 13500,
        minutes: 0,
        description:
          "A frontal install with custom color, cut and finish. Bring a reference or describe the look you are after.",
        active: true,
      },
      {
        id: "color-closure-install",
        name: "Color Closure Install",
        price: 12500,
        minutes: 0,
        description:
          "A closure install with custom color, cut and finish. Bring a reference or describe the look you are after.",
        active: true,
      },
      {
        id: "wig-touch-up",
        name: "Wig Touch Up",
        price: 3500,
        minutes: 45,
        description: "Curls reset, waves refreshed, or a new style on a unit you already have.",
        active: true,
      },
    ],
    /** The styling add-ons offered on every install page. */
    finishes: {
      curls: {
        label: "Curls",
        description: "Soft, full curls set through the lengths for movement and volume.",
      },
      "wand-curls": {
        label: "Wand Curls",
        description: "Defined spiral curls wrapped around a wand, from the mid-lengths to the ends.",
      },
      crimps: {
        label: "Crimps",
        description: "A tight, crimped texture pressed through the lengths.",
      },
    },
  },

  header: {
    announcement: {
      lead: "Now booking",
      service: "Lace wig installs",
      closedFirst: "The chair is between studios just now",
      closedSecond: "New dates announced soon",
    },
    nav: {
      home: "Home",
      gallery: "Gallery",
      beforeYouBook: "Before you book",
      reviews: "Reviews",
      meetNat: "Meet Nat",
    },
    cta: {
      book: "Book Your Chair",
      bookStyle: "Book",
      bookService: "Book",
      view: "View",
      bookThisStyle: "Book This Style",
      bookThisFinish: "Book This Finish",
      gallery: "View the gallery",
      collection: "View collection",
    },
    footer: {
      bookingLead: "Now booking in",
      pagesHeading: "Pages",
      contactHeading: "Contact",
      tagline: "Every install performed by Nat.",
    },
    /** The wine band that closes the inner pages. */
    closing: {
      heading: "Your chair is waiting.",
      body: "One client at a time, currently in {current location}, also serving {other locations}. Send a request and Nat comes back to you with two or three slots.",
    },
  },

  home: {
    sections: [
      { id: "installs", visible: true },
      { id: "collections", visible: true },
      { id: "featured", visible: true },
    ],
    /** The slideshow's words, by slide. The photographs are chosen in the photo manager. */
    slides: [
      {
        id: "deep-wave-swirl",
        label: "Deep Wave Glam",
        headline: "A hairline that melts into skin.",
        description: "Swirled baby hairs, a clean centre part, and lace you cannot find.",
      },
      {
        id: "straight",
        label: "Sleek Straight",
        headline: "Silky. Sleek. Effortlessly polished.",
        description: "Clean lines, a flawless finish, and a look that speaks for itself.",
      },
      {
        id: "bob",
        label: "Signature Bob",
        headline: "A statement cut, tailored to you.",
        description: "Sharp, polished, and shaped to complement your features.",
      },
      {
        id: "deep-wave",
        label: "Deep Wave Glam",
        headline: "Texture that moves with you.",
        description: "Defined waves, seamless lace, and a finish designed to turn heads.",
      },
      {
        id: "colour",
        label: "Color & Custom",
        headline: "Your vision, brought to life.",
        description: "Custom color and styling, made to leave your install unmistakably yours.",
      },
      {
        id: "natural-lace",
        label: "Natural Lace",
        headline: "Made to look like it grew there.",
        description: "Customized lace and a seamless hairline, for an effortlessly natural finish.",
      },
    ],
    installs: {
      kicker: "Choose your install",
      heading: "Frontal, closure, or a reinstall.",
      body: "Three ways to book, and Nat performs every one herself.",
      link: "See what is included",
      linkTo: "/book/",
    },
    collections: {
      kicker: "The looks",
      heading: "Explore the Crowned by Nat collection.",
      body: "Six looks to browse. The style is what the hair looks like; frontal or closure is how it is installed.",
      link: "See all six collections",
      linkTo: "/gallery/",
    },
    featured: {
      kicker: "Recent work",
      heading: "Lately, from the chair.",
      body: "A few of the most recent installs. The full set lives in the collections.",
      link: "View the gallery",
      linkTo: "/gallery/",
    },
  },

  book: {
    kicker: "Book",
    title: "Book your chair.",
    lede: "Choose your service, add-ons, and an available day and time using the scheduler below.",
    heading: "Choose your time.",
    body: "Pick your service, any add-ons, and a day and time that works for you using the scheduler below.",
    currentLocationLabel: "Current location",
    alsoServingLabel: "Also serving",
    hoursLabel: "Booking hours",
    reachLabel: "Reach Nat",
    schedulerLoading: "Loading the scheduler…",
    schedulerError: "Booking is temporarily unavailable. Please try again shortly.",
    schedulerErrorContact: "Or reach the studio directly:",
  },

  serviceBooking: {
    back: "All services",
    toScheduler: "Choose a time",
    price: "Price",
    photosHeading: "{service} looks from the chair",
    photosHint: "Select any photograph to see it larger.",
    photosBorrowed:
      "None is tagged {service} yet, so these are from Nat's {install type} of every kind.",
    photosEmptyHeading: "No photos of this one yet",
    photosEmpty:
      "Nat has not added photos of {service} to the site yet. Every look in the gallery is her own work.",
    photosGallery: "Browse the gallery",
    schedulerHeading: "Choose your time.",
    finishLabel: "Finish",
    styleNotesLabel: "Your style notes",
    step1: "Tap {service} in the scheduler's menu.",
    step2: "Add Styling, under Add ons, for your {finish} finish.",
    step3: "Choose a day and time, then confirm your details.",
    unavailable:
      "This service is not on the menu at the moment. See every service Nat offers, or get in touch.",
  },

  installs: {
    eyebrow: "Install type",
    toFinish: "Choose your finish",
    otherHeading: "Other ways to book",
    galleryLink: "Browse every look in the gallery",
    types: {
      frontal: {
        label: "Frontal Install",
        bookLabel: "Frontal Install",
        shortLabel: "Frontal",
        summary: "Professional frontal wig installation performed by Nat.",
        tagline: "Ear to ear. Any parting. Every edge laid.",
        description:
          "A frontal is a band of lace that runs across the whole front of the hairline, from one ear to the other. Nat tints it to your skin and lays every edge, so the parting can sit anywhere and the hair can be worn back off your face.",
        metaDescription:
          "Lace from ear to ear, tinted to your skin, with every edge laid and the parting wherever you want it.",
        howHeading: "How a frontal works",
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
        examplesHeading: "Frontal looks from the chair",
        examplesNote: "Every look here shows lace laid past the parting, which only a frontal allows.",
        imageCaption:
          "A deep side part with the hairline laid right across. Only ear-to-ear lace does that.",
      },
      closure: {
        label: "Closure Install",
        bookLabel: "Closure Install",
        shortLabel: "Closure",
        summary: "Professional closure wig installation performed by Nat.",
        tagline: "One parting. Less lace. Lower upkeep.",
        description:
          "A closure is a smaller piece of lace set where the hair parts, with the rest of the unit built on wefts. Nat tints it and lays it flat, so the parting reads as scalp while the hair frames your face.",
        metaDescription:
          "A lace closure at the parting, tinted and laid flat, with less lace to manage and lower upkeep than a frontal.",
        howHeading: "How a closure works",
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
        examplesHeading: "Closure looks from the chair",
        examplesNote: "",
        imageCaption:
          "A centre part laid flat, the hair falling over the temples: the look a closure is built around.",
      },
      "wig-touch-up": {
        label: "Reinstalls",
        bookLabel: "Reinstall",
        shortLabel: "Reinstall",
        summary: "Professional wig reinstall services performed by Nat.",
        tagline: "Same unit. Fresh finish. Ready again.",
        description:
          "A reinstall is for the style, not the lace: Nat resets the pattern you already have, whether that means fresh curls, a new part, or bringing shape back to hair that has gone flat. Tell her the look you want and she will tell you straight whether the unit can get there.",
        metaDescription:
          "A style reset on a wig you already have, in the finish and look you choose, checked first by Nat.",
        howHeading: "How a reinstall works",
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
        examplesHeading: "Reinstall looks from the chair",
        examplesNote: "",
        imageCaption:
          "Soft layers falling into movement through the lengths: the kind of shape a reinstall brings back.",
      },
    },
    /** The steps on each install page: install, finish, style, then the Book button. */
    selection: {
      installHeading: "Choose your install",
      installBody:
        "Frontal, closure, or a reinstall on a wig you already have. Nat performs every appointment herself.",
      finishHeading: "Choose your finish",
      finishBody: "How would you like your install styled?",
      styleHeading: "Have a specific style in mind?",
      styleBody:
        "Tell Nat about the specific style, cut, color, length, or look you're interested in.",
      styleOptional: "Optional",
      stylePlaceholder: "Tell us about the style you'd like...",
      bookHeading: "Book your appointment",
      bookInstall: "Install",
      bookFinish: "Finish",
      noInstall: "Not chosen yet",
      noFinish: "None chosen",
      needInstall: "Choose your service first.",
      needFinish: "Choose a finish first.",
      needBoth: "Choose your install and a finish first.",
    },
  },

  gallery: {
    kicker: "Gallery",
    title: "Explore the collection.",
    lede: "Six ways to wear a Crowned by Nat install, each one a room full of finished work. Find the one you keep coming back to and bring it to your consult.",
    axesHeading: "Three ways to read this work",
    axesBody:
      "The collections below group the looks by style, plus one by lace finish. Where a photograph shows how the unit was fitted, it carries that label too.",
    axes: [
      {
        label: "Install type",
        body: "Frontal or closure: how the unit is fitted, and the choice you make when you book. A look is labelled with one only where the photograph shows it.",
      },
      {
        label: "Style",
        body: "The texture, the length, the cut and the colour - what you picture when you book. Deep wave, sleek straight, bobs, body wave, and custom colour.",
      },
      {
        label: "Lace finish",
        body: "How well the unit is attached: the melt, the hairline, the parting. Natural Lace collects installs of every texture that share that standard.",
      },
    ],
    collections: {
      "deep-wave-glam": {
        title: "Deep Wave Glam",
        tagline: "Texture. Movement. Glamour.",
        summary: "Long, textured, effortlessly glamorous.",
        description:
          "Deep wave is the one people bring a screenshot in for. Long lengths, a wave pattern that holds its definition from the root down, and enough weight through the ends to move when you do. Density is set before the lace goes down, so the shape is still there in week three.",
        metaDescription:
          "Long deep-wave lace installs by Crowned by Nat. Defined texture, glamorous volume, and a hairline cut to your face, in {all locations}.",
      },
      "sleek-straight": {
        title: "Sleek Straight",
        tagline: "Smooth. Precise. Polished.",
        summary: "Pressed flat, parted clean, finished sharp.",
        description:
          "Straight hides nothing. Every lift at the parting and every uneven end is visible from across a room, which is what makes this collection the honest test of an install. Middle part or deep side part, pressed to a glass finish, cut to a baseline that stays level.",
        metaDescription:
          "Sleek straight lace installs by Crowned by Nat. Clean centre and side partings, a pressed glass finish, and a level baseline, in {all locations}.",
      },
      "signature-bob": {
        title: "Signature Bob",
        tagline: "Sharp. Modern. Considered.",
        summary: "The cut that has to be right the first time.",
        description:
          "Short units live or die on the perimeter, and a bob cannot be rescued by length the way long hair can. These are cut on the head rather than off the stand, so the baseline sits where your jaw actually is and the shape holds when you turn your head.",
        metaDescription:
          "Bob and lob lace installs by Crowned by Nat. Blunt baselines, soft curved ends, and a perimeter cut on the head, in {all locations}.",
      },
      "body-wave-glam": {
        title: "Body Wave",
        tagline: "Soft. Full. Luminous.",
        summary: "Wide, glossy waves with weight behind them.",
        description:
          "Body wave is the softer register: a wider wave, more shine off the surface, and volume that reads as fullness rather than texture. It takes light better than any other pattern, which is why it is the one that photographs best in almost any room.",
        metaDescription:
          "Body-wave lace installs by Crowned by Nat. Soft volume, wide glossy waves, and elegant movement, in {all locations}.",
      },
      "color-and-custom": {
        title: "Color & Custom",
        tagline: "Blonde. Copper. Pink.",
        summary: "Explore custom colour inspiration.",
        description:
          "Colour inspiration from the chair: platinum, copper, burgundy and candy pink, all of it worked on the unit rather than on your own hair. Bring a reference to your consult and Nat will tell you straight what the unit you have can and cannot be taken to.",
        metaDescription:
          "Colour and custom wig inspiration from Crowned by Nat. Blonde, copper, burgundy, and pink lace installs, in {all locations}.",
      },
      "natural-lace": {
        title: "Natural Lace",
        tagline: "Seamless. Quiet. Yours.",
        summary: "The install nobody can tell is an install.",
        description:
          "The quiet collection, and the one the others get judged against. Lace tinted to your skin, knots bleached down, the parting flat to the scalp, and the edges laid to follow your own hairline. Nothing here is trying to be noticed.",
        metaDescription:
          "Natural-looking lace installs by Crowned by Nat. Tinted lace, bleached knots, and a seamless hairline, in {all locations}.",
      },
    },
    back: "All six collections",
    galleryHeading: "Explore the collection",
    galleryHint: "Select any photograph to see it larger.",
    related: "More from the collection",
    /** The booking section under a collection's photographs, beside the scheduler. */
    ctaHeading: "Ready for your crown?",
    ctaBody:
      "Bring this page to your consult. Nat will tell you straight whether the unit you have will get you there.",
    bookingStep1: "Tap the service you want in the scheduler's menu.",
    bookingStep2: "Choose a day and time, then confirm your details.",
    bookingStep3: "The scheduler books the service, not the look, so tell Nat you want {style} at your appointment.",
    styleLabel: "Style",
    laceFinishLabel: "Lace finish",
    /** The explainer only the Natural Lace page shows. */
    finishFocus: {
      eyebrow: "A lace finish, not a hairstyle",
      heading: "What natural lace actually means",
      body: "Every look on this page is a different style. What they share is how the unit meets the skin, which is the part that decides whether an install reads as hair or as a wig.",
      points: [
        {
          title: "Lace melt",
          body: "Lace tinted to your skin and pressed flat, so the edge disappears into it rather than sitting on top of it.",
        },
        {
          title: "Hairline realism",
          body: "Edges laid to follow the hairline you already have, rather than a shape drawn on to a face it does not belong to.",
        },
        {
          title: "Scalp realism",
          body: "Knots bleached down until the parting reads as scalp at conversational distance.",
        },
        {
          title: "Seamless installation",
          body: "Secured to sit flat the whole way round, with nothing lifting at the temples or the nape by the end of the day.",
        },
      ],
    },
  },

  beforeYouBook: {
    kicker: "Before you book",
    title: "Everything worth knowing first.",
    lede: "What the appointment involves, how long an install lasts, and what happens if the lace lifts early.",
    processHeading: "What two hours in the chair looks like.",
    process: [
      {
        label: "Consult",
        body: "Nat looks at your unit, your hairline, and what your scalp can take that week.",
      },
      {
        label: "Prep",
        body: "Cleanse, braid down, and build a flat base. The install is won or lost here.",
      },
      {
        label: "Install",
        body: "Lace tinted, knots bleached, adhesive laid in thin passes and cured between each one.",
      },
      {
        label: "Style",
        body: "Cut, shape, and a finish you can put back yourself on day nine.",
      },
    ],
  },

  faq: {
    heading: "Common questions.",
    /** True while Nat has not confirmed the answers: shows `draftNotice` beside them. */
    draft: true,
    draftNotice:
      "Draft answers, shown while Nat confirms timings and studio policy. Ask her directly and she will tell you straight.",
    items: [
      {
        question: "Where does the appointment happen?",
        answer:
          "Nat's current location is {current location}. She also takes appointments in {other locations}. The full address comes with your confirmation, and the strip at the top of the site always shows where she is currently booking.",
      },
      {
        question: "Who actually does my install?",
        answer:
          "Nat does, every time. There is no second chair and no assistant finishing the work. If she is booked out, you wait for her rather than being passed along.",
      },
      {
        question: "How long does an install last?",
        answer:
          "Three to four weeks for a frontal, and closer to five for a closure. Sweat, heat, and how often you lift the lace at home all move that number. A refresh appointment resets it.",
      },
      {
        question: "Do I need to bring my own wig?",
        answer:
          "Yes. The chair time covers customization and install, not the unit itself. If you are buying for the first time, send a link before you order and you will get a straight answer on whether the cap and density are worth it.",
      },
      {
        question: "Will this damage my natural hair?",
        answer:
          "Not when it is braided down properly and taken down properly. The base braids are kept loose at the perimeter, and takedown uses a solvent rather than pulling. Leaving an install in past six weeks is what causes damage.",
      },
      {
        question: "Can you work with a sensitive or healing scalp?",
        answer:
          "Yes, and those appointments are booked with extra time built in. Bring anything your dermatologist or oncology team has told you about adhesives. There are non-adhesive options that hold well if glue is off the table.",
      },
      {
        question: "What happens if the lace lifts before my refresh?",
        answer:
          "Come back in. If it lifts inside ten days of the install, laying it again is free and you do not need to explain yourself.",
      },
      {
        question: "How do I move or cancel an appointment?",
        answer:
          "Get in touch as early as you can. Appointments must be canceled at least 24 hours before the scheduled appointment, and the same notice moves an appointment to a new time.",
      },
      {
        question: "What is your cancellation policy?",
        answer: "Appointments must be canceled at least 24 hours before the scheduled appointment.",
      },
      {
        question: "What should I bring, and how should I turn up?",
        answer:
          "Your unit, and a screenshot of the look you are after. Come with your own hair washed, fully dried and detangled, and with no heavy oil or grease on your scalp, because adhesive will not hold on a conditioned hairline. If you are between installs, leave the takedown to Nat rather than pulling it out the night before.",
      },
    ],
  },

  meetNat: {
    kicker: "Meet Nat",
    title: "One pair of hands, start to finish.",
    lede: "One stylist, one chair, and one client in the room at a time.",
    /** Paragraphs, separated by a blank line. */
    bio: "Hey babes! I’m Natalie, but you can call me Nat, the stylist behind Crowned by Nat! I specialize in wig installs and reinstalls, helping you feel beautiful and confident with every look.\n\nMy goal is to make sure you feel comfortable in my chair and leave loving your hair. Whether we’re trying a new style or refreshing your favorite look, I’m excited to bring your vision to life!\n\nThank you for supporting Crowned by Nat and trusting me with your hair. I can’t wait to have you in my chair!",
    credentials: [
      "Every install performed by Nat",
      "One client in the room at a time",
      "Consultation before every first install",
    ],
    reachLabel: "Reach Nat:",
    /** The three promises under the biography, each with a fixed icon. */
    assurances: [
      {
        title: "Nat does the work",
        body: "Every unit is fitted by Nat herself. Your install is never handed to an assistant.",
      },
      {
        title: "One client at a time",
        body: "Your appointment is the only one in the room, so nothing is rushed to fit another in.",
      },
      {
        title: "Personalized to You",
        body: "Every install is shaped around you, from the fit and placement to the final cut and style. Nat takes the time to make sure your crown feels like your own.",
      },
    ],
  },

  reviews: {
    kicker: "Reviews",
    title: "What people say on week three.",
    lede: "Not on the day, when everything looks good. Three weeks in, which is when an install has to prove itself.",
    /**
     * True while the quotes are written stand-ins: shows `placeholderNotice`
     * above them. The dashboard will not switch it off while these three
     * sample quotes are still there (see the FTC note in lib/content.ts).
     */
    placeholder: true,
    placeholderNotice: "Sample wording, shown while real client reviews are collected.",
    items: [
      {
        quote: "I swim four mornings a week and the lace has not lifted once.",
        name: "Adaeze Nwankwo",
        role: "Secondary school teacher",
      },
      {
        quote: "First install after chemo. Nat explained every step and never once rushed me.",
        name: "Rosalind Peirce",
        role: "Ceramicist",
      },
      {
        quote: "I brought in a unit I had already ruined. It came back better than I bought it.",
        name: "Camille Ashworth",
        role: "Event producer",
      },
    ],
  },

  notFound: {
    kicker: "Page not found",
    title: "This page is not here.",
    lede: "The link may be old or mistyped. The gallery and the booking page are one tap away.",
  },

  seo: {
    instagram: "https://www.instagram.com/crownedbynattt/",
    /** Follows the studio name in the homepage title: "Crowned by Nat | ...". */
    titleTagline: "Lace wig installs in {current location}",
    description:
      "Lace frontal and closure wig installs in {current location}, also serving {other locations}, performed personally by Nat. Six style collections, custom-tinted lace, bleached knots, and a hairline cut to your face.",
    shareDescription:
      "Every install performed personally by Nat. One chair, one client, two hours.",
    galleryTitle: "Styles",
    galleryDescription:
      "Six collections of finished lace installs by Crowned by Nat: deep wave, sleek straight, bobs, body wave, custom colour, and natural lace.",
    bookTitle: "Book your chair",
    beforeYouBookTitle: "Before you book",
    reviewsTitle: "Reviews",
    meetNatTitle: "Meet Nat",
  },
};

export type SiteContent = typeof DEFAULT_CONTENT;
export type SectionKey = keyof SiteContent;

/** The sections in the order the dashboard and a release list them. */
export const SECTION_KEYS = Object.keys(DEFAULT_CONTENT) as SectionKey[];

/**
 * The lists Nat can add to and remove from: what a new item starts as, which
 * of its fields must be filled in for it to appear at all ("" means the item
 * is itself a line of text), and how many the site will show.
 *
 * Every other array in DEFAULT_CONTENT is either a fixed set of ids (merged
 * by id, reorderable) or a fixed number of items (merged by position).
 */
export const FREE_LISTS: Record<string, { item: unknown; required: string[]; max: number }> = {
  "business.hours": { item: { days: "", time: "" }, required: ["days"], max: 7 },
  "locations.items": {
    item: { id: "", name: "", region: "", description: "", notice: "", active: true },
    required: ["name", "region"],
    max: 12,
  },
  "faq.items": { item: { question: "", answer: "" }, required: ["question", "answer"], max: 30 },
  "reviews.items": { item: { quote: "", name: "", role: "" }, required: ["quote", "name"], max: 12 },
  "meetNat.credentials": { item: "", required: [""], max: 8 },
};

/**
 * Where a "go to" setting may point: the site's own pages, by address. A
 * destination is chosen from this list rather than typed, so it cannot be
 * mistyped into a broken link or pointed off the site.
 */
export const PAGE_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Homepage" },
  { href: "/gallery/", label: "Gallery" },
  { href: "/book/", label: "Book (every service)" },
  { href: "/before-you-book/", label: "Before you book" },
  { href: "/reviews/", label: "Reviews" },
  { href: "/meet-nat/", label: "Meet Nat" },
  { href: "/installs/frontal/", label: "Frontal Install page" },
  { href: "/installs/closure/", label: "Closure Install page" },
  { href: "/installs/wig-touch-up/", label: "Reinstalls page" },
  { href: "/gallery/deep-wave-glam/", label: "Deep Wave Glam collection" },
  { href: "/gallery/sleek-straight/", label: "Sleek Straight collection" },
  { href: "/gallery/signature-bob/", label: "Signature Bob collection" },
  { href: "/gallery/body-wave-glam/", label: "Body Wave collection" },
  { href: "/gallery/color-and-custom/", label: "Color & Custom collection" },
  { href: "/gallery/natural-lace/", label: "Natural Lace collection" },
];

/**
 * Text that may never be empty on the site, because an empty one would leave
 * a blank button, a blank heading or a nameless service. An empty or missing
 * value here falls back to the default. `*` stands for any one key.
 */
export const REQUIRED_TEXT = [
  // Every page opening's small label and title.
  "*.kicker",
  "*.title",
  "business.name",
  "business.owner",
  "business.email",
  "services.heading",
  "services.categories.*",
  "services.items.*.name",
  "services.items.*.description",
  "services.finishes.*.label",
  "services.finishes.*.description",
  "header.announcement.*",
  "header.nav.*",
  "header.cta.*",
  "header.footer.bookingLead",
  "header.footer.pagesHeading",
  "header.footer.contactHeading",
  "header.closing.heading",
  "home.slides.*.label",
  "home.slides.*.headline",
  "home.slides.*.description",
  "home.*.kicker",
  "home.*.heading",
  "home.*.link",
  "book.heading",
  "book.currentLocationLabel",
  "book.alsoServingLabel",
  "book.hoursLabel",
  "book.reachLabel",
  "book.schedulerLoading",
  "book.schedulerError",
  "book.schedulerErrorContact",
  "serviceBooking.*",
  "installs.eyebrow",
  "installs.toFinish",
  "installs.otherHeading",
  "installs.galleryLink",
  // Not examplesNote or imageCaption: those may be left empty.
  "installs.types.*.label",
  "installs.types.*.bookLabel",
  "installs.types.*.shortLabel",
  "installs.types.*.tagline",
  "installs.types.*.summary",
  "installs.types.*.description",
  "installs.types.*.metaDescription",
  "installs.types.*.howHeading",
  "installs.types.*.examplesHeading",
  "installs.types.*.highlights.*.title",
  "installs.types.*.highlights.*.body",
  "installs.selection.*",
  "gallery.axesHeading",
  "gallery.axes.*.label",
  "gallery.axes.*.body",
  "gallery.collections.*.title",
  "gallery.collections.*.tagline",
  "gallery.collections.*.summary",
  "gallery.collections.*.description",
  "gallery.collections.*.metaDescription",
  "gallery.back",
  "gallery.galleryHeading",
  "gallery.galleryHint",
  "gallery.related",
  "gallery.ctaHeading",
  "gallery.bookingStep1",
  "gallery.bookingStep2",
  "gallery.bookingStep3",
  "gallery.styleLabel",
  "gallery.laceFinishLabel",
  "gallery.finishFocus.eyebrow",
  "gallery.finishFocus.heading",
  "gallery.finishFocus.points.*.title",
  "gallery.finishFocus.points.*.body",
  "beforeYouBook.processHeading",
  "beforeYouBook.process.*.label",
  "beforeYouBook.process.*.body",
  "faq.heading",
  "meetNat.bio",
  "meetNat.reachLabel",
  "meetNat.assurances.*.title",
  "meetNat.assurances.*.body",
  "seo.titleTagline",
  "seo.description",
  "seo.shareDescription",
  "seo.galleryTitle",
  "seo.galleryDescription",
  "seo.bookTitle",
  "seo.beforeYouBookTitle",
  "seo.reviewsTitle",
  "seo.meetNatTitle",
];

/**
 * Numbers with a sensible range. A published value outside it falls back to
 * the default. Prices are in cents.
 */
export const NUMBER_RANGES: Record<string, [number, number]> = {
  "services.items.*.price": [0, 1_000_000],
  "services.items.*.minutes": [0, 600],
};

/**
 * Addresses that are opened as links. Only these schemes survive the build,
 * so nothing typed into the dashboard can become a `javascript:` link.
 */
export const LINK_FIELDS: Record<string, "web" | "page"> = {
  "seo.instagram": "web",
  "home.installs.linkTo": "page",
  "home.collections.linkTo": "page",
  "home.featured.linkTo": "page",
};

/** Everything above, in the shape lib/cms/model.ts applies it. */
export const CONTENT_RULES: ContentRules = {
  freeLists: FREE_LISTS,
  requiredText: REQUIRED_TEXT,
  numberRanges: NUMBER_RANGES,
  linkFields: LINK_FIELDS,
  pageLinks: PAGE_LINKS,
};
