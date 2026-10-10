import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CollectionHero } from "@/components/collection-hero";
import { CollectionBooking } from "@/components/collection-booking";
import { CollectionCard } from "@/components/collection-card";
import { CollectionGallery } from "@/components/style-gallery";
import { Reveal } from "@/components/reveal";
import { COLLECTIONS } from "@/lib/collections";
import {
  findCollection,
  findResolved,
  resolveSite,
  suggestCollections,
} from "@/lib/gallery";
import { loadPhotoSet } from "@/lib/site-photos-server";
import { COLLECTION_PAGE, FINISH_FOCUS, STUDIO } from "@/lib/content";

/**
 * One page per collection, generated from lib/collections.ts.
 *
 * SIX PAGES, ONE FILE. The alternative was six near-identical page components
 * differing only in their data, which is six places for the layout to drift
 * and six titles to forget to update. Everything a collection page shows comes
 * out of the array, so the six are guaranteed to feel like one system rather
 * than six pages that happen to look similar.
 *
 * The words come from lib/collections.ts; the photographs from Supabase,
 * through lib/gallery.ts: in the HTML as they stood when the site was built,
 * then refreshed in the browser (components/site-photos.tsx). The link
 * preview uses the cover this deployment was built with. `generateStaticParams`
 * reads COLLECTIONS directly, because the six slugs are part of the site's
 * structure rather than its photographs, and Nat cannot add a seventh.
 *
 * STATIC EXPORT. `generateStaticParams` is what makes this compatible with
 * `output: "export"`: the six slugs are known at build time, so the build
 * emits six real HTML files and no dynamic route ever has to be resolved at
 * request time. `dynamicParams = false` makes that a build error rather than a
 * runtime surprise if a seventh slug is ever linked but not listed.
 *
 * The shape, top to bottom:
 *
 *   1. back to /gallery, the name, the three-beat line, one large photograph,
 *      and a Book button that jumps down to 3
 *   2. the gallery, with a lightbox: only this collection's published
 *      photographs (lib/gallery.ts)
 *   3. the booking section: the style named, what to tap, and the Square
 *      scheduler itself (components/collection-booking.tsx). This is where
 *      the Book button on the collection's card lands
 *   4. three other collections and the way back to all six, so the page is
 *      never a dead end
 *
 * Booking on the page replaced the wine band that closed it, which sent the
 * visitor to /book/ for a scheduler that could not be told the style anyway.
 * "Book Your Chair" in the nav still goes to /book/, the general way in.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return COLLECTIONS.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/gallery/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const collection = findCollection(slug);
  if (!collection) return {};
  // This page's openGraph replaces the layout's, so an empty collection
  // borrows the site's own share picture rather than sharing none.
  const view = resolveSite(await loadPhotoSet());
  const cover = findResolved(view, slug)?.cover ?? view.share;

  return {
    /* The root layout template appends "| Crowned by Nat", so every one of the
       six titles reads "Deep Wave Glam | Crowned by Nat" from one word here. */
    title: collection.title,
    description: collection.metaDescription,
    openGraph: {
      title: `${collection.title} | ${STUDIO.name}`,
      description: collection.metaDescription,
      ...(cover ? { images: [{ url: cover.image.large, alt: cover.alt }] } : {}),
      type: "website",
    },
  };
}

export default async function CollectionPage({
  params,
}: PageProps<"/gallery/[slug]">) {
  const { slug } = await params;
  const collection = findCollection(slug);
  if (!collection) notFound();

  const related = suggestCollections(collection.slug);

  return (
    <>
      <CollectionHero collection={collection} />

      <section
        aria-labelledby="gallery-heading"
        className="border-t border-line bg-bg"
      >
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
          <Reveal>
            <h2
              id="gallery-heading"
              className="font-display text-2xl leading-tight tracking-tight text-ink md:text-3xl"
            >
              {COLLECTION_PAGE.gallery}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              {COLLECTION_PAGE.galleryHint}
            </p>
          </Reveal>

          <div className="mt-10 lg:mt-14">
            <CollectionGallery
              slug={collection.slug}
              label={`${collection.title} gallery`}
            />
          </div>
        </div>
      </section>

      {/*
        Only Natural Lace reaches this. It is the one collection on the site
        that is not a hairstyle, and the gallery above it is deliberately a
        mix of textures, so without this the page reads as an incoherent
        sixth style rather than as the thing all five others are judged by.
      */}
      {collection.dimension === "finish" ? (
        <section
          aria-labelledby="finish-heading"
          className="border-t border-line bg-surface-2/50"
        >
          <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
            <Reveal>
              <p className="label text-accent">{FINISH_FOCUS.eyebrow}</p>
              <h2
                id="finish-heading"
                className="mt-4 font-display text-2xl leading-tight tracking-tight text-ink md:text-3xl"
              >
                {FINISH_FOCUS.heading}
              </h2>
              {FINISH_FOCUS.body ? (
                <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted lg:text-lg">
                  {FINISH_FOCUS.body}
                </p>
              ) : null}
            </Reveal>

            <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
              {FINISH_FOCUS.points.map((point, index) => (
                <Reveal as="li" key={index} index={index % 3}>
                  <h3 className="border-t border-line pt-5 font-display text-lg leading-tight text-ink">
                    {point.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {point.body}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <CollectionBooking collection={collection} />

      <section
        aria-labelledby="related-heading"
        className="border-t border-line bg-bg"
      >
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <Reveal className="min-w-0">
              <h2
                id="related-heading"
                className="font-display text-2xl leading-tight tracking-tight text-ink md:text-3xl"
              >
                {COLLECTION_PAGE.related}
              </h2>
            </Reveal>

            {/* The same way back to all six that opens the page, for whoever
                reaches the foot of it without finding her look. */}
            <Reveal index={1} className="shrink-0">
              <a
                href="/gallery/"
                className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"
              >
                {COLLECTION_PAGE.back}
                <ArrowRight
                  size={16}
                  weight="regular"
                  aria-hidden="true"
                  className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </a>
            </Reveal>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:mt-14">
            {related.map((other, index) => (
              <Reveal as="li" key={other.slug} index={index}>
                <CollectionCard collection={other} index={index + 2} />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
