import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { COLLECTION_PAGE } from "@/lib/content";
import { lookCount, type StyleCollection } from "@/lib/collections";

/**
 * The opening of a collection page: a way back, the name, the three-beat line,
 * the paragraph, and one large photograph.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT PageHeader
 * ---------------------------------------------------------------------------
 * components/page-header.tsx opens /book, /reviews and the rest on deliberate
 * emptiness: typographic, image free, all space. That is what tells a visitor
 * they have stepped off the landing experience into a page of detail.
 *
 * A collection page is the opposite kind of page. It is the landing experience
 * for one style, the visitor arrived here to look at hair, and opening it on
 * white space would waste the best photograph in the set. So it opens on the
 * picture instead, and the typographic opening stays reserved for the pages
 * that are genuinely about words.
 *
 * ---------------------------------------------------------------------------
 * THE BREADCRUMB
 * ---------------------------------------------------------------------------
 * One link, back to /gallery, rather than a Home / Styles / Deep Wave Glam
 * chain. A three-level chain on a two-level site is decoration: the third
 * crumb is the page you are already on, and the first is the wordmark in the
 * nav directly above it. What is actually useful here is one obvious way back
 * up to the other five collections, so that is what it is.
 */
export function CollectionHero({
  collection,
}: {
  collection: StyleCollection;
}) {
  return (
    <header className="relative isolate overflow-hidden bg-ink">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-20 lg:pt-16">
        <div className="on-photo min-w-0 lg:col-span-6 lg:pr-6">
          <Reveal>
            <a
              href="/gallery/"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-on-accent/70 transition-colors hover:text-on-accent"
            >
              <ArrowLeft size={15} weight="regular" aria-hidden="true" />
              {COLLECTION_PAGE.back}
            </a>
          </Reveal>

          <Reveal index={1}>
            <h1 className="mt-6 max-w-[13ch] font-display text-4xl leading-[1.02] tracking-tight text-on-accent md:text-5xl lg:text-6xl">
              {collection.title}
            </h1>

            {/*
              The three-beat line. Playfair italic against the roman heading
              above it, which is the same masthead device the announcement
              strip uses, so the two read as one voice.
            */}
            <p className="mt-5 font-display text-xl italic text-on-accent/75 lg:text-2xl">
              {collection.tagline}
            </p>
          </Reveal>

          <Reveal index={2}>
            <p className="mt-7 max-w-[52ch] text-base leading-relaxed text-on-accent/80 lg:text-lg">
              {collection.description}
            </p>
            <p className="label mt-8 text-on-accent/55">
              {lookCount(collection)} in this collection
            </p>
          </Reveal>
        </div>

        <Reveal index={1} className="min-w-0 lg:col-span-6">
          <div className="relative overflow-hidden rounded-3xl bg-surface-3 aspect-[4/5] lg:aspect-[5/6]">
            <Photograph
              photo={collection.hero}
              sizes="(min-width: 1024px) 48vw, calc(100vw - 2.5rem)"
              large
              priority
              className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
            />
          </div>
        </Reveal>
      </div>
    </header>
  );
}
