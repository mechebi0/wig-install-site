import type { Metadata, Viewport } from "next";
import { Playfair_Display, Geist } from "next/font/google";
import "./globals.css";
import { AnnouncementMarquee } from "@/components/announcement-marquee";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { MobileBookBar } from "@/components/mobile-book-bar";
import {
  ADDITIONAL_LOCATION_LABELS,
  PRIMARY_LOCATION_LABEL,
  STUDIO,
} from "@/lib/content";
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

    THIS MUST BE A HOST THAT RESOLVES: nothing on the site links to it and no
    build step checks it, so a wrong value silently breaks every share preview.
    It is the production domain, https://crownedbynat.com (live on Cloudflare,
    confirmed 2026-10-08). It read the Pages address, wig-install-site.pages.dev,
    before that, and `crownedbynat.pages.dev` (NXDOMAIN) before that. Confirm the
    og:image URL loads in a browser before trusting a share preview again.
  */
  metadataBase: new URL("https://crownedbynat.com"),
  /*
    The template gives every inner page "<Page> | Crowned by Nat" from a one-line
    `title` in its own metadata, so the brand name can never be forgotten on a
    page and never has to be typed twice.
  */
  /*
    PRIMARY_LOCATION_LABEL ("Towson, MD") carries the title and the og:title,
    since Towson is Nat's fixed primary chair (confirmed 2026-10-05) and a
    search title is read as the one place to be, not a directory. SERVICE_AREA
    (both towns, "Towson and Laurel, MD") still appears in the body
    description, where there is room to say Laurel is also served without it
    reading as two addresses crammed into one line. Both derive from LOCATIONS
    in lib/content.ts, so a change of town, in either direction, is still a
    one-line change there.
  */
  title: {
    default: `${STUDIO.name} | Lace wig installs in ${PRIMARY_LOCATION_LABEL}`,
    template: `%s | ${STUDIO.name}`,
  },
  description: `Lace frontal and closure wig installs in ${PRIMARY_LOCATION_LABEL}, also serving ${ADDITIONAL_LOCATION_LABELS.join(", ")}, performed personally by ${STUDIO.owner}. Six style collections, custom-tinted lace, bleached knots, and a hairline cut to your face.`,
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
    PRIMARY_LOCATION_LABEL,
    ...ADDITIONAL_LOCATION_LABELS,
  ],
  openGraph: {
    title: `${STUDIO.name} | Lace wig installs in ${PRIMARY_LOCATION_LABEL}`,
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
  /*
    Required for `env(safe-area-inset-*)` to report anything but zero.

    The mobile booking bar pads itself off the iOS home indicator with
    `env(safe-area-inset-bottom)` (see components/mobile-book-bar.tsx), and
    without `viewport-fit: cover` that value resolves to 0 on every device:
    the bar was sitting under the indicator on exactly the phones it was
    written for. Declaring it here is what makes that padding real.

    It also lets the layout run under the notch, so globals.css pays the
    horizontal insets back on the body. Both are 0 in portrait, which is
    where nearly all of this traffic is, so this changes nothing there and
    only starts mattering in landscape on a notched handset.
  */
  viewportFit: "cover",
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
