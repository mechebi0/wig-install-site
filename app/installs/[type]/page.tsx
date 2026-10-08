import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstallPage } from "@/components/install-page";
import { SERVICE_AREA, STUDIO } from "@/lib/content";
import { resolveSite } from "@/lib/gallery";
import { loadPhotoSet } from "@/lib/site-photos-server";
import {
  INSTALL_TYPES,
  getInstallType,
  parseInstallType,
} from "@/lib/taxonomy";

/**
 * /installs/frontal/ and /installs/closure/, generated from lib/taxonomy.ts.
 *
 * Two pages, one file, for the same reason the six collection pages are one
 * file: everything either page shows comes out of its entry in INSTALL_TYPES,
 * so the two are guaranteed to be one design rather than two that happen to
 * look alike. See components/install-page.tsx for the layout.
 *
 * STATIC EXPORT. `generateStaticParams` lists the two ids at build time, so the
 * export writes two real HTML files and nothing is resolved at request time.
 * `dynamicParams = false` makes a third, unlisted id a build error rather than
 * a runtime surprise. The id is still run through parseInstallType, the one
 * place an untrusted string becomes an install type.
 *
 * `/installs/` on its own is not a page. public/_redirects sends it to /book,
 * where the two are side by side.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return INSTALL_TYPES.map((type) => ({ type: type.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/installs/[type]">): Promise<Metadata> {
  const id = parseInstallType((await params).type);
  if (!id) return {};
  const type = getInstallType(id);

  /* The brand and the town are added here from lib/content.ts rather than
     typed into lib/taxonomy.ts, so a change of either is still one edit. */
  const description = `${type.label} by ${STUDIO.name}, in ${SERVICE_AREA}. ${type.metaDescription}`;
  /* The page's own photograph as this deployment was built with it; the
     site's share picture if the page has none (this openGraph replaces the
     layout's, so leaving it out would share no picture at all). */
  const view = resolveSite(await loadPhotoSet());
  const image = view.installs[id]?.item ?? view.share;

  return {
    // The root template appends "| Crowned by Nat".
    title: type.label,
    description,
    openGraph: {
      title: `${type.label} | ${STUDIO.name}`,
      description,
      ...(image ? { images: [{ url: image.image.large, alt: image.alt }] } : {}),
      type: "website",
    },
  };
}

export default async function InstallTypePage({
  params,
}: PageProps<"/installs/[type]">) {
  const id = parseInstallType((await params).type);
  if (!id) notFound();

  return <InstallPage type={getInstallType(id)} />;
}
