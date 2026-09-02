import { ArrowLeft, CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import { ButtonLink } from "@/components/button";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { COLLECTION_PAGE, CTA, bookingTarget } from "@/lib/content";
import {
  focalFor,
  lookCount,
  type StyleCollection,
} from "@/lib/collections";

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
            {/*
              Which axis this collection cuts along, said out loud. Five of
              the six are hairstyles and one is a standard of finish, and a
              visitor who does not know that reads Natural Lace as a texture
              she has never heard of. Two words fix it.
            */}
            <p className="label mt-8 text-on-accent/60">
              {collection.dimension === "finish" ? "Finish" : "Style"}
            </p>

            <h1 className="mt-3 max-w-[13ch] font-display text-4xl leading-[1.02] tracking-tight text-on-accent md:text-5xl lg:text-6xl">
              {collection.title}
            </h1>

            {/*
              The three-beat line. Playfair italic against the roman heading
              above it, the brand's masthead device, so the two read as one
              voice.
            */}
            <p className="mt-5 font-display text-xl italic text-on-accent/75 lg:text-2xl">
              {collection.tagline}
            </p>
          </Reveal>

          <Reveal index={2}>
            <p className="mt-7 max-w-[52ch] text-base leading-relaxed text-on-accent/80 lg:text-lg">
              {collection.description}
            </p>

            {/*
              The ask, placed at the end of the pitch and before the gallery.

              WHY HERE. The page already closed on a booking band, and it still
              does; this is not a replacement for it. But the band is below the
              gallery, which means the moment a visitor is most likely to
              decide - having just read what this collection is - was the one
              moment the page had nothing to offer her but scrolling. The
              description is the argument, so the button goes directly under
              it, and the look count that follows is the invitation to keep
              looking if she is not ready yet. Above the fold on desktop, above
              the photograph on mobile, and no image is covered on either.

              WHY THE HERO PILL. `onPhoto` is the same near-white pill the
              homepage hero uses and the same one the band at the foot of this
              page uses. That is deliberate: the primary booking action gets
              one appearance on the whole site, so it is recognised rather than
              re-read. It also happens to be the only variant that survives
              this background - a wine fill on the wine hero stops reading as a
              button, which is the note in components/button.tsx. Contrast is
              5.58:1, and the focus ring flips to white here from the
              `.on-photo :focus-visible` rule in globals.css.

              WHY NOT LOUDER. The pill sits at the size the hero CTA sits at
              and no larger, three type sizes under the h1. It should be the
              first thing you can act on, not the first thing you see; the
              photograph and the name keep that job.

              The label comes from `dimension` so Natural Lace reads "Book This
              Finish" and agrees with its own eyebrow. The collection name is
              appended for screen readers, because "Book This Style" is
              identical on all six pages and "This" only means something to
              someone who can see which page she is on. Visible text stays a
              subset of the accessible name, per WCAG 2.5.3.

              Full width below `sm` because at phone width a centred pill in a
              column of left-aligned text reads as an orphan, and a full-width
              bar cannot overflow or crowd the look count under it.
            */}
            <div className="mt-9">
              <ButtonLink
                {...bookingTarget(collection.slug)}
                variant="onPhoto"
                className="w-full sm:w-auto"
              >
                <CalendarCheck size={16} weight="regular" aria-hidden="true" />
                {CTA.bookCollection[collection.dimension]}
                <span className="sr-only">: {collection.title}</span>
              </ButtonLink>
            </div>

            <p className="label mt-9 text-on-accent/55">
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
              style={{ objectPosition: focalFor(collection.hero) }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </Reveal>
      </div>
    </header>
  );
}
