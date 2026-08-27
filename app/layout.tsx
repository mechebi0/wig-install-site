import type { Metadata, Viewport } from "next";
import { Playfair_Display, Geist } from "next/font/google";
import "./globals.css";
import { STUDIO } from "@/lib/content";
import { HERO_SLIDES } from "@/lib/images";

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
  title: `${STUDIO.name} | Lace wig installs in ${STUDIO.city}`,
  description: `Lace frontal and closure wig installs in ${STUDIO.city}, performed personally by ${STUDIO.owner}. Custom-tinted lace, bleached knots, and a hairline cut to your face. Unit customization and reinstalls too.`,
  applicationName: STUDIO.name,
  keywords: [
    "wig install",
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
  },
};

export const viewport: Viewport = {
  // Page is light locked by design; see the palette note in globals.css.
  themeColor: "#fdf8fa",
};

/*
  The first hero slide is the LCP element on every visit. Preloading it from
  the head starts the fetch before React has hydrated, which is worth roughly
  a render pass on a cold mobile connection.

  Two links, mutually exclusive by media query, mirroring the <picture> in the
  hero exactly: whichever crop the browser is going to choose is the one that
  gets preloaded, and the other is never requested. These two conditions and the
  <source> in hero-carousel.tsx have to stay in step, and they have to stay
  mutually exclusive, or a phone pays for both files.

  The tall condition is the negation of the wide one, written as an OR list:
  narrower than 768px, or a frame that is taller than it is wide.
*/
const lead = HERO_SLIDES[0];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${geist.variable} h-full antialiased`}
    >
      <head>
        {/*
          These two are written as elements rather than through
          ReactDOM.preload(), because preload() takes no `media` option and an
          art-directed preload is the entire point: the pair has to be mutually
          exclusive or a phone pays for both crops.

          React registers each one in its resource float system AND renders the
          element, so each ends up in the built <head> twice. That is React
          behaviour, not a mistake here, and it costs about 300 bytes of markup:
          the browser keys preloads by URL, and only one of the two media
          queries can match anyway, so nothing is fetched twice. Moving them
          into <body> does not change it.
        */}
        <link
          rel="preload"
          as="image"
          href={lead.wide.src}
          media="(min-width: 768px) and (min-aspect-ratio: 1/1)"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          href={lead.tall.src}
          media="(max-width: 767.98px), (max-aspect-ratio: 0.9999/1)"
          fetchPriority="high"
        />
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
        {children}
      </body>
    </html>
  );
}
