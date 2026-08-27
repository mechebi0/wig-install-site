import { HeroStage } from "@/components/hero-stage";
import { Intro } from "@/components/intro";
import { FeaturedWork } from "@/components/featured-work";
import { ServicesPreview } from "@/components/services-preview";
import { BookingCta } from "@/components/booking-cta";
import { QUESTIONS, SERVICES, STUDIO } from "@/lib/content";

/**
 * The homepage is a landing experience, not a table of contents.
 *
 * Five blocks, and every one of them is either the brand or a way forward:
 *
 *   Hero            the live location strip, then the full bleed crossfading
 *                   carousel with the brand and the booking CTA. Both sized as
 *                   one viewport by HeroStage.
 *   Intro           short typographic brand statement, Nat named as installer
 *   Featured work   three installs, then out to /work
 *   Services        three services and their prices, then out to /book
 *   Closing CTA     the wine band, booking again
 *
 * Everything that needs a paragraph to explain now lives on its own page:
 *
 *   /work             the full install rail and the style galleries
 *   /book             every service, the studio details, the request form
 *   /before-you-book  the appointment step by step, and the full FAQ
 *   /reviews          the client quotes
 *   /meet-nat         the biography, the credentials, the assurances
 *
 * The structured data stays here rather than being split across pages: it
 * describes the business, and the homepage is what a search engine treats as
 * the business. It is generated from the same STUDIO and SERVICES constants
 * the visible page uses, so the two cannot drift apart.
 */

const localBusiness = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: STUDIO.name,
  telephone: STUDIO.phone,
  email: STUDIO.email,
  founder: { "@type": "Person", name: STUDIO.owner },
  sameAs: [STUDIO.instagram],
  address: {
    "@type": "PostalAddress",
    streetAddress: STUDIO.street,
    addressLocality: STUDIO.city,
    addressRegion: STUDIO.regionCode,
    postalCode: STUDIO.postalCode,
    addressCountry: "US",
  },
  // Keep in step with STUDIO.hours; this is the machine readable copy of it.
  openingHours: ["Tu-Fr 09:00-19:00", "Sa 08:00-16:00"],
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
      <HeroStage />
      <Intro />
      <FeaturedWork />
      <ServicesPreview />
      <BookingCta />
    </>
  );
}
