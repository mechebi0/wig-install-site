"use client";

import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { useSiteView } from "@/components/site-photos";
import { groupByCategory, useServices, type CatalogService } from "@/lib/catalog";
import { formatDuration, formatPrice } from "@/lib/format";

/**
 * The service menu, grouped by the four categories the customer books within.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS GROUPED BY CATEGORY NOW
 * ---------------------------------------------------------------------------
 * The seven services are filed under four headings (Wig Installs, Reinstalls,
 * Color Services, Services), and the grouping is the point: a visitor deciding
 * between a frontal and a frontal reinstall is choosing between two categories,
 * not scanning one flat list of seven. The categories come from SERVICES in
 * lib/content.ts, so a service added to the right category lands in the right
 * section here without a second list to keep in step.
 *
 * ---------------------------------------------------------------------------
 * WHY THE FIRST SERVICE STILL CARRIES THE PHOTOGRAPH
 * ---------------------------------------------------------------------------
 * The featured cell with Nat's own frame is kept as the lead of the first
 * category. It is the one picture in the menu and it sits on the service a
 * visitor is most likely to book, which is the same reasoning the old bento
 * used to put it first. Which frame is the `book` place in the photo manager
 * (lib/gallery.ts); with no photographs at all the cell is words alone.
 *
 * ---------------------------------------------------------------------------
 * THE LAYOUT NO LONGER ASSUMES A COUNT
 * ---------------------------------------------------------------------------
 * It used to destructure exactly four services. It is now derived from
 * whatever the catalog holds, grouped by category, so a service added from the
 * dashboard appears under its own heading without this file being touched.
 */
export function Services() {
  const { services } = useServices();

  if (services.length === 0) return null;

  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28"
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

      <div className="mt-12 flex flex-col gap-12">
        {groupByCategory(services).map(({ category, items: group }, categoryIndex) => {
          return (
            <Reveal key={category || "other"} index={categoryIndex + 1}>
              <div>
                {category ? (
                  <h3 className="font-display text-xl tracking-tight text-accent">
                    {category}
                  </h3>
                ) : null}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {group.map((service, serviceIndex) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      featured={categoryIndex === 0 && serviceIndex === 0}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The heading counts the services rather than hardcoding "Four ways", so
 * adding an eighth from the dashboard does not leave the page contradicting
 * itself. Past six it stops counting, because "Seven ways to sit in the chair"
 * is a menu, not a line of copy.
 */
function headingFor(count: number): string {
  const words = ["", "One way", "Two ways", "Three ways", "Four ways", "Five ways", "Six ways"];
  const opener = words[count] ?? "Every way";
  return `${opener} to sit in the chair.`;
}

function ServiceCard({
  service,
  featured = false,
}: {
  service: CatalogService;
  featured?: boolean;
}) {
  const photo = useSiteView().book;

  if (featured) {
    return (
      <article className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-soft sm:col-span-2">
        <div className={photo ? "grid sm:grid-cols-2" : "grid"}>
          {/*
            Nat's own frame, through the same component as every other
            photograph on the site, so it gets the 600/1200/1600 srcSet rather
            than one fixed file. `priority` because this cell is the first
            picture on /book and sits in the opening screen at every width,
            which makes it the page's likely LCP.
          */}
          {photo ? (
            <div className="relative aspect-16/10 w-full overflow-hidden bg-surface-2 sm:aspect-auto sm:min-h-[16rem]">
              <Photograph
                photo={photo.item.image}
                sizes="(min-width: 1024px) 55vw, calc(100vw - 2.5rem)"
                priority
                style={{ objectPosition: photo.focal }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : null}
          <div className="flex flex-col justify-center p-7 lg:p-9">
            <ServiceHead service={service} large />
            <p className="mt-1 text-sm text-muted">
              {formatDuration(service.duration_minutes)}
            </p>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted">
              {service.description}
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col rounded-3xl border border-line bg-surface p-7 shadow-soft">
      <ServiceHead service={service} />
      <p className="mt-1 text-sm text-muted">
        {formatDuration(service.duration_minutes)}
      </p>
      <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-muted">
        {service.description}
      </p>
    </article>
  );
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
