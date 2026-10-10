"use client";

import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { useSiteView } from "@/components/site-photos";
import {
  ACTIVE_SERVICES,
  CTA,
  SERVICES_MENU,
  serviceBookingTarget,
  servicesByCategory,
  type ServiceEntry,
} from "@/lib/content";
import { formatDuration, formatPrice } from "@/lib/format";

/**
 * The service menu, grouped by the four categories the customer books within.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE MENU COMES FROM
 * ---------------------------------------------------------------------------
 * The services Nat has on offer, with the names, prices, descriptions and
 * order she published from the dashboard (Services & pricing), built into
 * the page (ACTIVE_SERVICES in lib/content.ts). It used to read the
 * `services` table after the page loaded; it no longer does, so the menu and
 * each service's own booking page can never quote two different prices, and
 * nothing on the page changes after it appears.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS GROUPED BY CATEGORY
 * ---------------------------------------------------------------------------
 * The seven services are filed under four headings (Wig Installs, Reinstalls,
 * Color Services, Services), and the grouping is the point: a visitor deciding
 * between a frontal and a frontal reinstall is choosing between two categories,
 * not scanning one flat list of seven.
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
 * THE LAYOUT DOES NOT ASSUME A COUNT
 * ---------------------------------------------------------------------------
 * It is derived from whatever is on offer, grouped by category, so a service
 * Nat takes off the menu simply leaves its heading's grid.
 */
export function Services() {
  const services = ACTIVE_SERVICES;

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
          {SERVICES_MENU.heading}
        </h2>
        {SERVICES_MENU.intro ? (
          <p className="mt-4 max-w-[52ch] whitespace-pre-line text-base leading-relaxed text-muted lg:text-lg">
            {SERVICES_MENU.intro}
          </p>
        ) : null}
      </Reveal>

      <div className="mt-12 flex flex-col gap-12">
        {servicesByCategory(services).map(({ category, items: group }, categoryIndex) => {
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

function ServiceCard({
  service,
  featured = false,
}: {
  service: ServiceEntry;
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
              {formatDuration(service.durationMinutes)}
            </p>
            <p className="mt-5 max-w-[46ch] whitespace-pre-line text-base leading-relaxed text-muted">
              {service.body}
            </p>
            <ServiceLink service={service} className="mt-4" />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col rounded-3xl border border-line bg-surface p-7 shadow-soft">
      <ServiceHead service={service} />
      <p className="mt-1 text-sm text-muted">
        {formatDuration(service.durationMinutes)}
      </p>
      <p className="mt-4 max-w-[46ch] whitespace-pre-line text-base leading-relaxed text-muted">
        {service.body}
      </p>
      {/* At the foot of the card, so the links line up across a row. */}
      <ServiceLink service={service} className="mt-auto pt-4" />
    </article>
  );
}

/**
 * "Book Closure Install", out to that service's own page: its photographs
 * and the same scheduler, with nothing else in the way. The scheduler is
 * still further down this page too; the link is for someone who wants to see
 * the work first.
 */
function ServiceLink({
  service,
  className = "",
}: {
  service: ServiceEntry;
  className?: string;
}) {
  return (
    <div className={className}>
      <a
        {...serviceBookingTarget(service.id)}
        className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"
      >
        {CTA.bookInstall} {service.name}
        <ArrowRight
          size={15}
          weight="regular"
          aria-hidden="true"
          className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
        />
      </a>
    </div>
  );
}

function ServiceHead({
  service,
  large = false,
}: {
  service: ServiceEntry;
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
        {formatPrice(service.priceCents)}
      </span>
    </div>
  );
}
