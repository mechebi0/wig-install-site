import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/collection-hero";
import { CollectionCard } from "@/components/collection-card";
import { StyleGallery } from "@/components/style-gallery";
import { BookingCta } from "@/components/booking-cta";
import { Reveal } from "@/components/reveal";
import { COLLECTIONS } from "@/lib/collections";
import {
  collectionPhotos,
  findCollection,
  suggestCollections,
} from "@/lib/gallery";
import { COLLECTION_PAGE, STUDIO } from "@/lib/content";

/**
 * One page per collection, generated from lib/collections.ts.
 *
 * SIX PAGES, ONE FILE. The alternative was six near-identical page components
 * differing only in their data, which is six places for the layout to drift
 * and six titles to forget to update. Everything a collection page shows comes
 * out of the array, so the six are guaranteed to feel like one system rather
 * than six pages that happen to look similar.
 *
 * Everything is read through lib/gallery.ts rather than out of
 * lib/collections.ts directly, so the day the gallery moves into Supabase this
 * page does not change. `generateStaticParams` still reads COLLECTIONS
 * directly, because the list of slugs has to be known at BUILD time and a
 * database read is not available then; that is the one place the seam does not
 * reach, and it is the correct place for it not to.
 *
 * STATIC EXPORT. `generateStaticParams` is what makes this compatible with
 * `output: "export"`: the six slugs are known at build time, so the build
 * emits six real HTML files and no dynamic route ever has to be resolved at
 * request time. `dynamicParams = false` makes that a build error rather than a
 * runtime surprise if a seventh slug is ever linked but not listed.
 *
 * The shape, top to bottom:
 *
 *   1. back to /gallery, the name, the three-beat line, one large photograph
 *   2. the gallery, with a lightbox
 *   3. the booking CTA
 *   4. three other collections, so the page is never a dead end
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

  return {
    /* The root layout template appends "| Crowned by Nat", so every one of the
       six titles reads "Deep Wave Glam | Crowned by Nat" from one word here. */
    title: collection.title,
    description: collection.metaDescription,
    openGraph: {
      title: `${collection.title} | ${STUDIO.name}`,
      description: collection.metaDescription,
      images: [{ url: collection.hero.large, alt: collection.hero.alt }],
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
            <StyleGallery
              photos={collectionPhotos(collection)}
              label={`${collection.title} gallery`}
            />
          </div>
        </div>
      </section>

      <BookingCta
        heading={COLLECTION_PAGE.cta.heading}
        body={COLLECTION_PAGE.cta.body}
      />

      <section
        aria-labelledby="related-heading"
        className="border-t border-line bg-surface-2/50"
      >
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
          <Reveal>
            <h2
              id="related-heading"
              className="font-display text-2xl leading-tight tracking-tight text-ink md:text-3xl"
            >
              {COLLECTION_PAGE.related}
            </h2>
          </Reveal>

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
