import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceBooking } from "@/components/service-booking";
import {
  SERVICES,
  SERVICE_AREA,
  STUDIO,
  getService,
  parseServiceId,
} from "@/lib/content";
import { bookingPhotos, resolveSite } from "@/lib/gallery";
import { loadPhotoSet } from "@/lib/site-photos-server";

/**
 * /book/frontal-install/, /book/closure-install/ and the other five: each
 * service's own booking page, generated from SERVICES in lib/content.ts. See
 * components/service-booking.tsx for what is on it.
 *
 * /book/ itself is untouched and is still the whole menu; it is where "Book
 * Your Chair" goes. These are where a button that names one service goes
 * (serviceBookingTarget in lib/content.ts).
 *
 * STATIC EXPORT, the same as the install pages: `generateStaticParams` lists
 * the seven slugs at build time, `dynamicParams = false` makes any other one
 * a build error rather than a runtime surprise, and an address that is not a
 * service (/book/frontal/, a typo) gets the site's own 404 page with its
 * link back to /book, which Cloudflare Pages serves for any path it has no
 * file for.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((service) => ({ service: service.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/book/[service]">): Promise<Metadata> {
  const id = parseServiceId((await params).service);
  if (!id) return {};
  const service = getService(id);

  const description = `${service.name} with ${STUDIO.name}, in ${SERVICE_AREA}. ${service.body}`;
  /* The first of the service's photographs as this deployment was built
     with them; the site's share picture when it has none (this openGraph
     replaces the layout's, so leaving it out would share no picture). */
  const view = resolveSite(await loadPhotoSet());
  const image = bookingPhotos(view, id).items[0] ?? view.share;

  return {
    // The root template appends "| Crowned by Nat".
    title: `Book ${service.name}`,
    description,
    openGraph: {
      title: `Book ${service.name} | ${STUDIO.name}`,
      description,
      ...(image ? { images: [{ url: image.image.large, alt: image.alt }] } : {}),
      type: "website",
    },
  };
}

export default async function ServiceBookingPage({
  params,
}: PageProps<"/book/[service]">) {
  const id = parseServiceId((await params).service);
  if (!id) notFound();

  return <ServiceBooking service={id} />;
}
