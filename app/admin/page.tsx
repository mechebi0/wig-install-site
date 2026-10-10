import type { Metadata } from "next";
import { StudioDashboard } from "@/components/admin/cms/studio-dashboard";

/**
 * Nat's studio dashboard: the website's words, business details, locations,
 * services and prices, FAQs, reviews and search settings, published from
 * here, and the way into the photo manager. See docs/content-manager.md.
 *
 * NOT LINKED FROM ANYWHERE PUBLIC. It is absent from NAV_LINKS, from the
 * footer, and from the mobile menu, and it is noindex/nofollow so it stays out
 * of search results. That is obscurity, and obscurity is not what protects it:
 * this HTML is a static file on a CDN that anyone can fetch. What protects it
 * is that every query behind it is answered by Postgres according to
 * `is_admin()`, so an uninvited visitor gets a shell with nothing in it. See
 * the note in components/auth/guarded.tsx.
 */
export const metadata: Metadata = {
  title: "Studio dashboard",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <StudioDashboard />;
}
