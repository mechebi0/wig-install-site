import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { STYLE_LABELS } from "@/lib/collections";
import { featuredInstalls } from "@/lib/gallery";
import { HOME } from "@/lib/content";

/**
 * The recent-work rail on the homepage.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT THE SAME SIX PHOTOGRAPHS AS THE HERO
 * ---------------------------------------------------------------------------
 * The hero already rotates through six installs directly above this. Showing
 * the same six again a screen later does not read as emphasis, it reads as a
 * site that only has six photographs. So `featured` is set on a different six
 * in lib/collections.ts, and the two blocks between them put twelve of the
 * eighteen frames on the homepage without repeating one.
 *
 * That constraint is in the data rather than in this component on purpose: it
 * survives someone adding a slide, because the honest fix then is to move a
 * `featured` flag rather than to edit a list here.
 *
 * ---------------------------------------------------------------------------
 * WHY EACH ONE LINKS TO A COLLECTION RATHER THAN OPENING A LIGHTBOX
 * ---------------------------------------------------------------------------
 * A lightbox on the homepage is a dead end: it shows one photograph larger and
 * then puts the visitor back exactly where they were. Every cell here instead
 * goes to the collection that photograph belongs to, which is the next thing
 * someone who liked it actually wants. The homepage stays a directory.
 *
 * The label under each frame is its PRIMARY style, not every tag it carries.
 * An install tagged both Body Wave Glam and Color & Custom is genuinely both,
 * but a rail of photographs with two or three chips under each is a filter
 * dashboard; the collection pages are where the full tagging shows.
 */
export function FeaturedInstalls() {
  const items = featuredInstalls();
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-heading"
      className="border-t border-line bg-surface-2/50"
    >
      <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal className="min-w-0">
            <p className="label text-accent">{HOME.featured.kicker}</p>
            <h2
              id="featured-heading"
              className="mt-5 max-w-[18ch] font-display text-3xl leading-[1.06] tracking-tight text-ink md:text-4xl lg:text-5xl"
            >
              {HOME.featured.heading}
            </h2>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted lg:text-lg">
              {HOME.featured.body}
            </p>
          </Reveal>

          <Reveal index={1} className="shrink-0">
            <a
              href="/gallery/"
              className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"
            >
              {HOME.featured.link}
              <ArrowRight
                size={16}
                weight="regular"
                aria-hidden="true"
                className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </a>
          </Reveal>
        </div>

        {/*
          Three across at desktop rather than six, so the frames stay large
          enough to read as photographs. Two on a phone, which is the same
          rhythm the collection galleries use.
        */}
        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:mt-16 lg:grid-cols-3 lg:gap-6">
          {items.map((item, index) => (
            <Reveal as="li" key={item.id} index={index % 3}>
              <a
                href={`/gallery/${item.primaryStyle}/`}
                className="group block"
              >
                <div className="relative overflow-hidden rounded-3xl bg-surface-3 aspect-[3/4]">
                  <Photograph
                    photo={item.image}
                    sizes="(min-width: 1024px) 30vw, 47vw"
                    style={{ objectPosition: item.focalPosition }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-[rgb(var(--scrim)/0.22)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                  />
                </div>

                <div className="mt-4 border-t border-line pt-4 transition-colors duration-300 group-hover:border-line-strong">
                  <h3 className="font-display text-lg leading-tight tracking-tight text-ink">
                    {item.title}
                  </h3>
                  <p className="label mt-2 text-muted">
                    {STYLE_LABELS[item.primaryStyle]}
                  </p>
                </div>
              </a>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
