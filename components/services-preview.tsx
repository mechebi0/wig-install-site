"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { useServices } from "@/lib/catalog";
import { HOME } from "@/lib/content";
import { formatDuration, formatPrice } from "@/lib/format";

/**
 * Homepage services preview. Three of the four, then out to /book.
 *
 * One line of description each, and no card containers: a hairline rule per
 * column groups them, the same device the process list uses. The full bento
 * with the photograph and the long descriptions lives on /book, next to the
 * form, which is where someone reading service detail is actually heading.
 *
 * Only the first three are shown, whatever the list holds. The last service
 * (reinstall and refresh, at the seeded ordering) is the one nobody books
 * first, so it earns its place on /book and not here. Nat controls which three
 * these are through display_order in her dashboard.
 *
 * Live rows, prerendered from the static fallback so the homepage HTML still
 * ships three services and three prices. See the note in components/services.tsx.
 */
export function ServicesPreview() {
  const { services } = useServices();
  const preview = services.slice(0, 3);

  return (
    <section
      aria-labelledby="services-preview-heading"
      className="border-y border-line bg-surface-2/50"
    >
      <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="services-preview-heading"
                className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl"
              >
                {HOME.services.heading}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted">
                {HOME.services.body}
              </p>
            </div>

            <a
              href="/book/"
              className="group hidden min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-accent sm:inline-flex"
            >
              {HOME.services.link}
              <ArrowRight
                size={15}
                weight="bold"
                aria-hidden="true"
                className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </a>
          </div>
        </Reveal>

        <dl className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-3 lg:mt-14">
          {preview.map((service, i) => (
            <Reveal key={service.id} index={i}>
              <div className="border-t border-line-strong pt-6">
                <dt className="flex items-baseline justify-between gap-4">
                  <span className="font-display text-xl tracking-tight text-ink lg:text-2xl">
                    {service.name}
                  </span>
                  <span className="tabular font-display text-xl tracking-tight text-accent lg:text-2xl">
                    {formatPrice(service.price_cents)}
                  </span>
                </dt>
                <dd>
                  <p className="mt-1 text-sm text-muted">
                    {formatDuration(service.duration_minutes)}
                  </p>
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>

        <Reveal index={3}>
          <a
            href="/book/"
            className="mt-10 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line-strong bg-surface px-7 text-sm font-medium text-ink transition-[border-color,color] duration-200 hover:border-accent hover:text-accent sm:hidden"
          >
            {HOME.services.link}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
