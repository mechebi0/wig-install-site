import { SiteNav } from "@/components/site-nav";
import { HeroCarousel } from "@/components/hero-carousel";
import { Intro } from "@/components/intro";
import { Assurances } from "@/components/assurances";
import { Services } from "@/components/services";
import { InstallCarousel } from "@/components/install-carousel";
import { StyleGalleries } from "@/components/style-galleries";
import { Process } from "@/components/process";
import { Owner } from "@/components/owner";
import { Testimonials } from "@/components/testimonials";
import { Questions } from "@/components/questions";
import { Booking } from "@/components/booking";
import { SiteFooter } from "@/components/site-footer";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { QUESTIONS, SERVICES, STUDIO, usesOnPageBooking } from "@/lib/content";

/**
 * Section order and layout family, so the repetition rules stay checkable:
 *
 *   Hero          full bleed crossfading carousel
 *   Intro         typographic two column statement
 *   Assurances    hairline strip
 *   Services      asymmetric bento
 *   Installs      auto-rotating peek rail
 *   Styles        tabbed swipe galleries
 *   Process       four column rule, typographic
 *   Owner         asymmetric split, image left
 *   Testimonials  offset baseline row
 *   Questions     sticky aside plus accordion
 *   Booking       detail column plus form panel
 *
 * Eleven sections, eleven layout families. The two carousels are separated by
 * three sections and use different mechanisms (crossfade versus peek rail), so
 * the page never reads as the same component twice. The only image-plus-text
 * split on the page is Owner, and it is five sections clear of the hero.
 *
 * Services sits ahead of Installs on purpose: a visitor who has just been sold
 * by the hero wants to know what can be booked and what it costs before being
 * shown more photographs.
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
    price: service.price.replace("$", ""),
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
      <SiteNav />
      <main id="main">
        <HeroCarousel />
        <Intro />
        <Assurances />
        <Services />
        <InstallCarousel />
        <StyleGalleries />
        <Process />
        <Owner />
        <Testimonials />
        <Questions />
        {/*
          The on-page form only exists while booking runs through this site.
          Set STUDIO.bookingUrl to the real booking tool and every CTA points
          there instead, so this section would be a dead end.
        */}
        {usesOnPageBooking ? <Booking /> : null}
      </main>
      <SiteFooter />
      <MobileBookBar />
    </>
  );
}
