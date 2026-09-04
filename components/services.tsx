"use client";

import Image from "next/image";
import { Reveal } from "@/components/reveal";
import { useServices, type CatalogService } from "@/lib/catalog";
import { formatDuration, formatPrice } from "@/lib/format";
import { SERVICE_IMAGE } from "@/lib/images";

/**
 * Services bento.
 *
 * WHAT CHANGED, AND WHY IT IS A CLIENT COMPONENT NOW
 * The four services used to be compiled in. They are now rows in the database
 * that Nat edits from her dashboard, and a price she has just corrected should
 * appear on the site without a redeploy. Under `output: "export"` there is no
 * server render to fetch during, so reading them means reading them in the
 * browser.
 *
 * This costs nothing at first paint. useServices() starts from the same static
 * list this component used to import, so Next prerenders the identical markup
 * into the HTML at build time and a search engine still finds four services
 * and four prices in the source. The live rows swap in on hydration. There is
 * no spinner and no empty state, because there is never a moment with nothing
 * to show.
 *
 * THE LAYOUT NO LONGER ASSUMES FOUR
 * It used to destructure exactly four services and would have thrown the day
 * Nat added a fifth from her own dashboard. The bento is now derived:
 *
 *   featured   first service, 7 cols and 2 rows, carries the photograph
 *   pair       next two, 5 cols each, stacked beside it
 *   remainder  anything after that, full width
 *
 * With four services that is pixel-for-pixel what it was before. With three it
 * drops the full-width row, and with two the single side cell takes both rows
 * so no hole opens beside the photograph.
 */
export function Services() {
  const { services } = useServices();

  const [featured, ...rest] = services;
  const pair = rest.slice(0, 2);
  const remainder = rest.slice(2);

  if (!featured) return null;

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-14 sm:px-8 sm:py-20 lg:py-28"
    >
      <Reveal>
        <h2
          id="services-heading"
          className="max-w-[16ch] font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl"
        >
          {headingFor(services.length)}
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
            <ServiceHead service={featured} large />
            <p className="mt-1 text-sm text-muted">
              {formatDuration(featured.duration_minutes)}
            </p>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted">
              {featured.description}
            </p>
          </div>
        </Reveal>

        {pair.map((service, index) => (
          <Reveal
            key={service.id}
            as="article"
            index={index + 1}
            className={`rounded-3xl p-7 lg:col-span-5 lg:p-9 ${
              index === 0
                ? "border border-accent/20 bg-accent-soft"
                : "border border-line bg-surface shadow-soft"
            } ${pair.length === 1 ? "lg:row-span-2" : ""}`}
          >
            <ServiceHead service={service} />
            <p className="mt-1 text-sm text-muted">
              {formatDuration(service.duration_minutes)}
            </p>
            <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-muted">
              {service.description}
            </p>
          </Reveal>
        ))}

        {remainder.map((service, index) => (
          <Reveal
            key={service.id}
            as="article"
            index={index + 3}
            className="rounded-3xl border border-line bg-surface-2 p-7 lg:col-span-12 lg:p-9"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <ServiceHead service={service} />
                <p className="mt-1 text-sm text-muted">
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>
              <p className="max-w-[46ch] text-base leading-relaxed text-muted">
                {service.description}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/**
 * The heading counts the services rather than hardcoding "Four ways", so
 * adding a fifth from the dashboard does not leave the page contradicting
 * itself. Past six it stops counting, because "Seven ways to sit in the chair"
 * is a menu, not a line of copy.
 */
function headingFor(count: number): string {
  const words = ["", "One way", "Two ways", "Three ways", "Four ways", "Five ways", "Six ways"];
  const opener = words[count] ?? "Every way";
  return `${opener} to sit in the chair.`;
}

function ServiceHead({
  service,
  large = false,
}: {
  service: CatalogService;
  large?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h3
        className={`font-display tracking-tight text-ink ${
          large ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl"
        }`}
      >
        {service.name}
      </h3>
      <span
        className={`tabular shrink-0 font-display tracking-tight text-accent ${
          large ? "text-2xl lg:text-3xl" : "text-xl lg:text-2xl"
        }`}
      >
        {formatPrice(service.price_cents)}
      </span>
    </div>
  );
}
