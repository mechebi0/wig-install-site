import type { Metadata, Viewport } from "next";
import { Playfair_Display, Geist } from "next/font/google";
import "./globals.css";
import { AnnouncementMarquee } from "@/components/announcement-marquee";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { STUDIO } from "@/lib/content";
import { HERO_PHOTOS } from "@/lib/collections";

/*
  Type pairing. UI/UX Pro Max matched "Playfair Display / Inter" for the
  luxury-beauty profile. Playfair is kept: it is also inside Taste Skill's
  approved display-serif rotation, and a lace studio is a genuine editorial
  and luxury brief rather than a serif reached for out of habit.

  Inter is NOT kept. Taste Skill discourages it as a default body face, so the
  body runs on Geist, which fills the same neutral role without the tell.
*/
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  /*
    Absolute URLs for the social cards. Next resolves og:image against this, and
    without it every share preview points at localhost. The site is a static
    export with no request context to infer a host from, so it has to be
    stated. Change it here if the production domain changes.
  */
  metadataBase: new URL("https://crownedbynat.pages.dev"),
  /*
    The template gives every inner page "<Page> | Crowned by Nat" from a one-line
    `title` in its own metadata, so the brand name can never be forgotten on a
    page and never has to be typed twice.
  */
  title: {
    default: `${STUDIO.name} | Lace wig installs in ${STUDIO.city}`,
    template: `%s | ${STUDIO.name}`,
  },
  description: `Lace frontal and closure wig installs in ${STUDIO.city}, performed personally by ${STUDIO.owner}. Six style collections, custom-tinted lace, bleached knots, and a hairline cut to your face.`,
  applicationName: STUDIO.name,
  keywords: [
    "wig install",
    "deep wave install",
    "sleek straight wig",
    "bob wig install",
    "body wave install",
    "lace frontal install",
    "closure install",
    "wig customization",
    "medical wig fitting",
    STUDIO.name,
    STUDIO.city,
  ],
  openGraph: {
    title: `${STUDIO.name} | Lace wig installs in ${STUDIO.city}`,
    description: `Every install performed personally by ${STUDIO.owner}. One chair, one client, two hours.`,
    type: "website",
    locale: "en_US",
    siteName: STUDIO.name,
    /* Nat's own work, so a shared link opens on a real install rather than on
       a logo. Same file the homepage hero loads first, so it is already warm. */
    images: [
      { url: HERO_PHOTOS.deepWaveSwirl.large, alt: HERO_PHOTOS.deepWaveSwirl.alt },
    ],
  },
};

export const viewport: Viewport = {
  // Page is light locked by design; see the palette note in globals.css.
  themeColor: "#fdf8fa",
};

/**
 * The announcement stripe, the nav, the footer and the mobile booking bar live
 * here rather than in each page. They are identical on every route, and
 * putting them in the layout means a client side page change swaps only the
 * middle of the document: the nav never repaints, so moving between pages does
 * not flash.
 *
 * The stripe comes first, above the nav, and it is in normal flow rather than
 * sticky: it says its piece at the top of the page and scrolls away, and the
 * nav takes the top edge from there. A second sticky band would cost every
 * page 36px of viewport for the life of the visit.
 *
 * The hero image preload used to live in this head. It moved into
 * HeroCarousel, because only the homepage renders a hero and every other page
 * was paying to preload an image it never showed.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${geist.variable} h-full antialiased`}
    >
      <head>
        {/*
          Scroll reveals are prerendered at opacity 0 by Motion. Without this,
          a visitor with JavaScript off would get a blank page below the fold.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full bg-bg text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-on-accent"
        >
          Skip to content
        </a>
        <AnnouncementMarquee />
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
        <MobileBookBar />
      </body>
    </html>
  );
}
