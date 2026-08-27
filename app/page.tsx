import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/hero";
import { Assurances } from "@/components/assurances";
import { InstallCarousel } from "@/components/install-carousel";
import { Services } from "@/components/services";
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
 *   Hero          asymmetric split, image right
 *   Assurances    hairline strip
 *   Carousel      auto-rotating peek carousel
 *   Services      asymmetric bento
 *   Styles        tabbed swipe galleries
 *   Process       four column rule, typographic
 *   Owner         asymmetric split, image left
 *   Testimonials  offset baseline row
 *   Questions     sticky aside plus accordion
 *   Booking       detail column plus form panel
 *
 * Ten sections, ten layout families, and the two image splits are separated by
 * five sections. Zero eyebrows on the page.
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
    addressRegion: "MD",
    postalCode: "21231",
    addressCountry: "US",
  },
  openingHours: ["Tu-Fr 09:00-19:00", "Sa 08:00-16:00"],
  // Picked up by search engines as a booking action once the client's real
  // booking tool is set in STUDIO.bookingUrl.
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
        <Hero />
        <Assurances />
        <InstallCarousel />
        <Services />
        <StyleGalleries />
        <Process />
        <Owner />
        <Testimonials />
        <Questions />
        {/*
          The on-page form only exists while booking runs through this site.
          Set STUDIO.bookingUrl to the client's real booking tool and every CTA
          points there instead, so this section would be a dead end.
        */}
        {usesOnPageBooking ? <Booking /> : null}
      </main>
      <SiteFooter />
      <MobileBookBar />
    </>
  );
}
