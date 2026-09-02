import { HeroCarousel } from "@/components/hero-carousel";
import {
  ClosingTeasers,
  CollectionShowcase,
  ServiceSummary,
} from "@/components/home-teasers";
import { FeaturedInstalls } from "@/components/featured-installs";
import { COLLECTIONS_IN_ORDER } from "@/lib/collections";
import { LOCATIONS, QUESTIONS, SERVICES, STUDIO } from "@/lib/content";

/**
 * The homepage is a premium introduction and a visual directory. It is not a
 * table of contents, and it is not the site.
 *
 * Five blocks, and every one of them is either the brand or a way forward:
 *
 *   Hero          the full-width crossfading carousel: the proposition, the
 *                 two actions, and six of her installs. Where Nat is booking
 *                 is not said here: the announcement stripe above the nav bar
 *                 carries the towns on every page (see app/layout.tsx).
 *   Collections   all six, as cards, then out to /gallery. It leads because
 *                 the work is what a first-time visitor came to see.
 *   Services      the three appointments by name, no prices, out to /book
 *   Featured      six recent installs, none of them a hero slide, each out to
 *                 the collection it belongs to
 *   Teasers       Meet Nat and the reviews side by side, four lines each,
 *                 then out to /meet-nat and /reviews. The page closes here.
 *
 * The wine BookingCta band that used to close this page has been removed. The
 * homepage already asks for the booking twice above the fold — the hero button
 * and the persistent nav button — and a third ask below the teasers was the
 * page repeating itself on the way out. It stays in use on the inner pages
 * (see components/booking-cta.tsx), which have no such button in view by the
 * time you reach their foot.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * The complete gallery for any style, the price list, the FAQ, Nat's story and
 * the testimonials. Each of those needs a paragraph or a grid to be worth
 * anything, and each of them has a page:
 *
 *   /gallery           the six collections, and a page each below that
 *   /book             every service, the studio details, the booking flow
 *   /before-you-book  the appointment step by step, and the full FAQ
 *   /reviews          the client quotes
 *   /meet-nat         the introduction, the approach, the credentials
 *
 * The structured data stays here rather than being split across pages: it
 * describes the business, and the homepage is what a search engine treats as
 * the business. It is generated from the same constants the visible page uses,
 * so the two cannot drift apart.
 */

const localBusiness = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: STUDIO.name,
  description: `Lace wig installs performed personally by ${STUDIO.owner}.`,
  founder: { "@type": "Person", name: STUDIO.owner },
  url: "/",
  /*
    No street address has been supplied, so `address` would be a fabrication
    and is omitted. `areaServed` says the true thing instead: two towns, both
    confirmed. Contact details are emitted only where a real value exists, so
    this block can never advertise a phone number nobody owns.
  */
  areaServed: LOCATIONS.map((location) => ({
    "@type": "City",
    name: location.name,
    addressRegion: location.region,
  })),
  ...(STUDIO.email ? { email: STUDIO.email } : {}),
  ...(STUDIO.phone ? { telephone: STUDIO.phone } : {}),
  ...(STUDIO.instagram ? { sameAs: [STUDIO.instagram] } : {}),
  // Picked up by search engines as a booking action once the real booking
  // tool is set in STUDIO.bookingUrl.
  ...(STUDIO.bookingUrl
    ? {
        potentialAction: {
          "@type": "ReserveAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: STUDIO.bookingUrl,
          },
        },
      }
    : {}),
  makesOffer: SERVICES.map((service) => ({
    "@type": "Offer",
    itemOffered: { "@type": "Service", name: service.name },
    price: (service.priceCents / 100).toFixed(2),
    priceCurrency: "USD",
  })),
  /* The six collections, so a search engine can see the shape of the site
     from its front door rather than having to crawl for it. */
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Styles",
    itemListElement: COLLECTIONS_IN_ORDER.map((collection) => ({
      "@type": "OfferCatalog",
      name: collection.title,
      url: `/gallery/${collection.slug}/`,
    })),
  },
  mainEntityOfPage: {
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }}
      />
      {/*
        The carousel starts directly under the nav bar. The wine band that used
        to sit here saying "Now booking in Towson & Laurel, MD" moved up into
        the announcement stripe above the nav (see
        components/announcement-marquee.tsx), which says the same towns on
        every page; keeping both would have opened the homepage with the same
        fact twice inside 130px.
      */}
      <HeroCarousel />
      <CollectionShowcase />
      <ServiceSummary />
      <FeaturedInstalls />
      <ClosingTeasers />
    </>
  );
}
