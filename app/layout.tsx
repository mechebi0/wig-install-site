import type { Metadata, Viewport } from "next";
import { Playfair_Display, Geist } from "next/font/google";
import "./globals.css";
import { STUDIO } from "@/lib/content";

/*
  Type pairing. UI/UX Pro Max matched "Playfair Display / Inter" for the
  luxury-beauty profile. Playfair is kept: it is also inside Taste Skill's
  approved display-serif rotation, and a lace atelier is a genuine editorial
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
  description:
    "Every install performed personally by the owner. Custom-tinted lace, bleached knots, and a hairline cut to your face. Frontal and closure installs, unit customization, and reinstalls.",
  keywords: [
    "wig install",
    "lace frontal install",
    "closure install",
    "wig customization",
    "medical wig fitting",
    STUDIO.city,
  ],
  openGraph: {
    title: `${STUDIO.name} | Lace wig installs in ${STUDIO.city}`,
    description:
      "Every install performed personally by the owner. One chair, one client, two hours.",
    type: "website",
    locale: "en_US",
    siteName: STUDIO.name,
  },
};

export const viewport: Viewport = {
  // Page is light locked by design; see the palette note in globals.css.
  themeColor: "#fdf8fa",
};

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
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-20 focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-on-accent"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
