import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { SERVICES } from "@/lib/content";
import { SERVICE_IMAGE } from "@/lib/images";

/**
 * Services bento. Four services, exactly four cells, no filler tile:
 *   tall featured card (7 cols, 2 rows) | two stacked cards (5 cols)
 *   full width card across the base
 *
 * Background diversity: the featured cell carries a real photograph, the
 * closure cell carries the rose tint, and the base cell sits on the deeper
 * blush surface. It is not four identical text boxes.
 */
export function Services() {
  const [featured, closure, custom, refresh] = SERVICES;

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28"
    >
      <Reveal>
        <h2
          id="services-heading"
          className="max-w-[16ch] font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl"
        >
          Four ways to sit in the chair.
        </h2>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted lg:text-lg">
          Prices are for the service. You bring the unit, or send a link before
          you buy one and you will get an honest read on it.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 lg:grid-cols-12">
        <Reveal
          as="article"
          className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft lg:col-span-7 lg:row-span-2"
        >
          <div className="relative aspect-16/10 w-full overflow-hidden bg-surface-2">
            <Image
              src={SERVICE_IMAGE.src}
              alt={SERVICE_IMAGE.alt}
              width={SERVICE_IMAGE.width}
              height={SERVICE_IMAGE.height}
              loading="lazy"
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-1 flex-col p-7 lg:p-9">
            <ServiceHead
              name={featured.name}
              price={featured.price}
              large
            />
            <p className="mt-1 text-sm text-muted">{featured.duration}</p>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted">
              {featured.body}
            </p>
          </div>
        </Reveal>

        <Reveal
          as="article"
          index={1}
          className="rounded-3xl border border-accent/20 bg-accent-soft p-7 lg:col-span-5 lg:p-9"
        >
          <ServiceHead name={closure.name} price={closure.price} />
          <p className="mt-1 text-sm text-muted">{closure.duration}</p>
          <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-muted">
            {closure.body}
          </p>
        </Reveal>

        <Reveal
          as="article"
          index={2}
          className="rounded-3xl border border-line bg-surface p-7 shadow-soft lg:col-span-5 lg:p-9"
        >
          <ServiceHead name={custom.name} price={custom.price} />
          <p className="mt-1 text-sm text-muted">{custom.duration}</p>
          <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-muted">
            {custom.body}
          </p>
        </Reveal>

        <Reveal
          as="article"
          index={3}
          className="rounded-3xl border border-line bg-surface-2 p-7 lg:col-span-12 lg:p-9"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <ServiceHead name={refresh.name} price={refresh.price} />
              <p className="mt-1 text-sm text-muted">{refresh.duration}</p>
            </div>
            <p className="max-w-[46ch] text-base leading-relaxed text-muted">
              {refresh.body}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ServiceHead({
  name,
  price,
  large = false,
}: {
  name: string;
  price: string;
  large?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h3
        className={`font-display tracking-tight text-ink ${
          large ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl"
        }`}
      >
        {name}
      </h3>
      <span
        className={`tabular font-display tracking-tight text-accent ${
          large ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl"
        }`}
      >
        {price}
      </span>
    </div>
  );
}
