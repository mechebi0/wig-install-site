import Image from "next/image";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { HOME } from "@/lib/content";
import { CAROUSEL } from "@/lib/images";

/**
 * Homepage work preview. Three installs, then out to /work.
 *
 * Deliberately a static three-up grid rather than a second carousel. The hero
 * directly above this is already a carousel, and the full rail lives on /work;
 * repeating the mechanism here would make the homepage feel like one long
 * slideshow and would bury the third image behind a swipe nobody makes.
 *
 * Three is also the whole point of a preview. The homepage is a landing
 * experience, so its job here is to prove the work is good and get out of the
 * way, not to be the gallery.
 */
export function FeaturedWork() {
  const preview = CAROUSEL.slice(0, 3);

  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28"
    >
      <Reveal>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="featured-heading"
              className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl"
            >
              {HOME.featured.heading}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted">
              {HOME.featured.body}
            </p>
          </div>

          {/* Desktop affordance. The full-width one below covers small screens. */}
          <a
            href="/work/"
            className="group hidden min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-accent sm:inline-flex"
          >
            {HOME.featured.link}
            <ArrowRight
              size={15}
              weight="bold"
              aria-hidden="true"
              className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </a>
        </div>
      </Reveal>

      <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:mt-14 lg:gap-6">
        {preview.map((slide, i) => (
          <Reveal as="li" key={slide.image.src} index={i}>
            <figure className="group">
              <div className="relative aspect-4/5 overflow-hidden rounded-3xl bg-surface-2 shadow-soft">
                <Image
                  src={slide.image.src}
                  alt={slide.image.alt}
                  width={slide.image.width}
                  height={slide.image.height}
                  loading="lazy"
                  sizes="(min-width: 640px) 31vw, 100vw"
                  className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-[900ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:scale-[1.04]"
                />
              </div>
              <figcaption className="mt-4 px-1">
                <span className="block font-display text-lg tracking-tight text-ink">
                  {slide.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  {slide.caption}
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </ul>

      <Reveal index={3}>
        <a
          href="/work/"
          className="mt-10 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line-strong bg-surface px-7 text-sm font-medium text-ink transition-[border-color,color] duration-200 hover:border-accent hover:text-accent sm:hidden"
        >
          {HOME.featured.link}
        </a>
      </Reveal>
    </section>
  );
}
