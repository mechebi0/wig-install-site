"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowsOut,
  CalendarCheck,
  Camera,
  Check,
} from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { useSiteView } from "@/components/site-photos";
import { SquareBooking } from "@/components/square-booking";
import { Notice } from "@/components/ui/feedback";
import { useBookingSelection } from "@/lib/booking-selection";
import {
  PAGES,
  REACH,
  SERVICE_BOOKING,
  STUDIO,
  getService,
  serviceBookingPath,
  serviceForPath,
  servicesInCategory,
  type ServiceId,
} from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { bookingPhotos, type GalleryItem } from "@/lib/gallery";
import { getFinish, getInstallType } from "@/lib/taxonomy";

/**
 * One service's own booking page, /book/<service>/: what a visitor lands on
 * from any button that names a service ("Book Closure Install", "Book
 * Reinstall", the links on the /book menu). The general way in, "Book Your
 * Chair", still goes to the whole menu at /book; this page is only ever the
 * service she already picked.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS ON IT, AND WHAT IS NOT
 * ---------------------------------------------------------------------------
 *   1. the service      its name, what it is, its price from the same
 *                       catalog /book prints, and any finish she chose on
 *                       an install page
 *   2. its photographs  only those Nat ticked for this service, or for a
 *                       reinstall the Reinstalls ones, labelled as such
 *                       (bookingPhotos in lib/gallery.ts). None is a short
 *                       note, never somebody else's photographs
 *   3. the scheduler    the same Square embed /book uses, once
 *
 * No other service cards, no collections, no gallery. The only other
 * services offered are the one or two filed under the same heading (Frontal
 * or Closure Install, say), as a switch, and "All services" goes back to the
 * full menu.
 *
 * ---------------------------------------------------------------------------
 * THE SCHEDULER CANNOT BE PRESELECTED
 * ---------------------------------------------------------------------------
 * Square's embed script loads one fixed address and takes no service, so it
 * opens on Nat's whole menu on every page (components/square-booking.tsx).
 * This page does not pretend otherwise: it names the service at the top and
 * tells her which line to tap, in the words Square uses (SERVICE_BOOKING in
 * lib/content.ts).
 *
 * ---------------------------------------------------------------------------
 * SWITCHING WITHOUT RELOADING THE SCHEDULER
 * ---------------------------------------------------------------------------
 * The service is read from the address, not only from the build, so the
 * switch can change it with history.pushState: the photographs and the words
 * change, the scheduler stays loaded, and Back walks the switches in
 * reverse (Next keeps usePathname in step with pushState and popstate; see
 * "Native History API" in the Next docs). The links are still real links to
 * the other page, so a new tab, a refresh or a shared address all open on
 * the service they name.
 */
export function ServiceBooking({ service: built }: { service: ServiceId }) {
  const id = serviceForPath(usePathname()) ?? built;
  const service = getService(id);

  /*
    Name, description and price as Nat published them, the same entry the
    /book menu prints (SERVICES in lib/content.ts), so the two pages never
    quote different prices. A service she has taken off the menu keeps its
    page, which says so rather than offering it.

    The service's TIME is left off, on purpose. Square decides how long an
    appointment is and prints it on every line of the scheduler beside this,
    and on 2026-10-09 every time the site held disagreed with it (2 hours
    against Square's 3 hr for a frontal, for one), so the page shows only
    Square's.
  */
  const offMenu = !service.active;
  const name = service.name;
  const description = service.body;
  const price = service.priceCents;

  /*
    The finish and style notes chosen on an install page, carried here by
    lib/booking-selection.ts. A finish only where the service has one: Wig
    Touch Up does not.
  */
  const selection = useBookingSelection();
  const finish = service.installType && selection.finish ? getFinish(selection.finish) : null;
  const notes = selection.styleDescription.trim();

  const { items, borrowed } = bookingPhotos(useSiteView(), id);
  // The others on offer under the same heading, and this one even when it is not.
  const siblings = servicesInCategory(service.category).filter(
    (sibling) => sibling.active || sibling.id === id,
  );

  const [announcement, setAnnouncement] = useState("");

  // The build wrote the title for the service the page opened on.
  useEffect(() => {
    document.title = `Book ${name} | ${STUDIO.name}`;
  }, [name]);

  const switchTo = (event: MouseEvent<HTMLAnchorElement>, next: ServiceId) => {
    // A new tab or window opens the other page itself, as any link would.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    if (next === id) return;
    window.history.pushState(null, "", `${serviceBookingPath(next)}${window.location.search}`);
    setAnnouncement(SERVICE_BOOKING.switched(getService(next).name));
  };

  return (
    <>
      {/* ------------------------------------------------- the service --- */}
      <header className="border-b border-line bg-surface-2/40">
        <div className="mx-auto max-w-[1400px] px-5 pb-12 pt-6 sm:px-8 lg:pb-16 lg:pt-10">
          <a
            href="/book/#services"
            className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"
          >
            <ArrowLeft
              size={15}
              weight="regular"
              aria-hidden="true"
              className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-1 motion-reduce:transition-none"
            />
            {SERVICE_BOOKING.back}
          </a>

          <div className="mt-6 grid gap-9 lg:mt-8 lg:grid-cols-12 lg:items-end lg:gap-8">
            <Reveal className="min-w-0 lg:col-span-7">
              <p className="label text-accent">{service.category}</p>
              <h1 className="mt-5 max-w-[16ch] font-display text-4xl leading-[1.03] tracking-tight text-ink md:text-5xl lg:text-6xl">
                {name}
              </h1>
              <p className="mt-4 max-w-[52ch] whitespace-pre-line text-base leading-relaxed text-muted sm:mt-5 sm:text-lg">
                {description}
              </p>
            </Reveal>

            <Reveal index={1} className="min-w-0 lg:col-span-5">
              <dl className="flex flex-wrap gap-x-10 gap-y-5">
                <div>
                  <dt className="text-sm text-muted">{SERVICE_BOOKING.price}</dt>
                  <dd className="tabular mt-1 font-display text-2xl tracking-tight text-accent lg:text-3xl">
                    {formatPrice(price)}
                  </dd>
                </div>
                {finish ? (
                  <div>
                    <dt className="text-sm text-muted">{SERVICE_BOOKING.scheduler.finish}</dt>
                    <dd className="mt-1 font-display text-2xl tracking-tight text-ink lg:text-3xl">
                      {finish.label}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {siblings.length > 1 ? (
                <nav aria-label={SERVICE_BOOKING.switchLabel(service.category)} className="mt-8">
                  {/*
                    Stacked on a phone, side by side from `sm`: "Color Closure
                    Install" with its tick does not fit half of a 390px pill.
                  */}
                  <ul className="grid grid-cols-1 gap-1 rounded-3xl border border-line-strong bg-surface p-1 sm:inline-grid sm:grid-cols-2 sm:rounded-full">
                    {siblings.map((sibling) => {
                      const current = sibling.id === id;
                      return (
                        <li key={sibling.id} className="min-w-0">
                          <a
                            href={`${serviceBookingPath(sibling.id)}${finish ? `?finish=${finish.id}` : ""}`}
                            aria-current={current ? "page" : undefined}
                            onClick={(event) => switchTo(event, sibling.id)}
                            className={`flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-5 text-sm font-medium transition-colors duration-200 ${
                              current
                                ? "bg-accent text-on-accent"
                                : "text-ink hover:bg-accent-soft hover:text-accent"
                            }`}
                          >
                            {current ? <Check size={14} weight="bold" aria-hidden="true" /> : null}
                            {sibling.name}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              ) : null}

              <a href="#scheduler" className={`${buttonStyles.primary} mt-8 w-full sm:w-auto`}>
                <CalendarCheck size={17} weight="regular" aria-hidden="true" />
                {SERVICE_BOOKING.toScheduler}
                <ArrowDown size={14} weight="regular" aria-hidden="true" />
              </a>
            </Reveal>
          </div>

          {offMenu ? (
            <div className="mt-8 max-w-[60ch]">
              <Notice tone="info">
                {SERVICE_BOOKING.unavailable}{" "}
                <a href="/book/#services" className="text-accent underline underline-offset-4">
                  {SERVICE_BOOKING.back}
                </a>
                {" · "}
                <a href={REACH.href} className="text-accent underline underline-offset-4">
                  {REACH.label}
                </a>
              </Notice>
            </div>
          ) : null}

          <p aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </div>
      </header>

      <div className="bg-bg">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-5 py-10 sm:gap-14 sm:px-8 sm:py-16 lg:grid-cols-12 lg:gap-10 lg:py-20">
          {/* ------------------------------------------- its photographs --- */}
          <section
            aria-labelledby="service-photos-heading"
            className={`min-w-0 ${items.length > 0 ? "lg:col-span-5" : "lg:col-span-4"}`}
          >
            {items.length > 0 ? (
              <ServicePhotos
                items={items}
                heading={SERVICE_BOOKING.photos.heading(
                  borrowed ? getInstallType(borrowed).shortLabel : name,
                )}
                note={
                  borrowed
                    ? `${SERVICE_BOOKING.photos.borrowed(name, getInstallType(borrowed).label)} ${SERVICE_BOOKING.photos.hint}`
                    : SERVICE_BOOKING.photos.hint
                }
                label={`${name} photographs`}
              />
            ) : (
              /*
                A short note beside its icon on a phone, so the scheduler is
                not a screen further down for the sake of saying "none yet";
                the icon goes on top from `lg`, where the card sits beside
                the scheduler and has the height anyway.
              */
              <Reveal className="flex gap-4 rounded-3xl border border-line bg-surface-2/50 p-5 sm:p-7 lg:flex-col lg:gap-5 lg:p-9">
                <Camera size={28} weight="thin" aria-hidden="true" className="shrink-0 text-accent" />
                <div className="min-w-0">
                  <h2
                    id="service-photos-heading"
                    className="font-display text-xl leading-tight tracking-tight text-ink lg:text-2xl"
                  >
                    {SERVICE_BOOKING.photos.emptyHeading}
                  </h2>
                  <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted sm:text-base lg:mt-3">
                    {SERVICE_BOOKING.photos.empty(name)}
                  </p>
                  <a
                    href="/gallery/"
                    className="group mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent lg:mt-4"
                  >
                    {SERVICE_BOOKING.photos.gallery}
                    <ArrowRight
                      size={15}
                      weight="regular"
                      aria-hidden="true"
                      className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
                    />
                  </a>
                </div>
              </Reveal>
            )}
          </section>

          {/* ---------------------------------------------- the scheduler --- */}
          <section
            id="scheduler"
            aria-labelledby="scheduler-heading"
            className={`min-w-0 ${items.length > 0 ? "lg:col-span-7" : "lg:col-span-8"}`}
          >
            <Reveal>
              <p className="label text-accent">{PAGES.book.kicker}</p>
              <h2
                id="scheduler-heading"
                className="mt-4 font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl"
              >
                {SERVICE_BOOKING.scheduler.heading}
              </h2>

              <ol className="mt-6 flex flex-col gap-3">
                <Step number={1}>
                  <Emphasised text={SERVICE_BOOKING.scheduler.step1(name)} phrase={name} />
                </Step>
                {finish ? (
                  <Step number={2}>
                    <Emphasised text={SERVICE_BOOKING.scheduler.step2(finish.label)} phrase="Styling" />
                  </Step>
                ) : null}
                <Step number={finish ? 3 : 2}>{SERVICE_BOOKING.scheduler.step3}</Step>
              </ol>

              {notes ? (
                <div className="mt-6 rounded-3xl border border-line bg-surface-2/50 p-5">
                  <p className="text-sm font-medium text-ink">{SERVICE_BOOKING.scheduler.style}</p>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-muted">
                    {notes}
                  </p>
                </div>
              ) : null}
            </Reveal>

            <Reveal index={1} className="mt-8">
              <SquareBooking />
            </Reveal>
          </section>
        </div>
      </div>
    </>
  );
}

/**
 * The service's photographs: a row to swipe through on a phone, so the
 * scheduler is a short scroll below rather than six full-height photographs
 * away, and two columns beside the scheduler from `lg`. Each opens the same
 * lightbox the collection pages use.
 */
function ServicePhotos({
  items,
  heading,
  note,
  label,
}: {
  items: GalleryItem[];
  heading: string;
  note: string;
  /** Names the lightbox. */
  label: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const photos = items.map((item) => item.image);
  // A photograph Nat hides while the lightbox is open can shorten the list.
  const open = selected !== null && selected < photos.length ? selected : null;

  return (
    <>
      <Reveal>
        <h2
          id="service-photos-heading"
          className="font-display text-2xl leading-tight tracking-tight text-ink md:text-3xl"
        >
          {heading}
        </h2>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">{note}</p>
      </Reveal>

      <Reveal index={1}>
        {/*
          Edge to edge on a phone, so the row runs off the screen and the
          half-shown photograph says there is more. `scroll-px` keeps a
          snapped photograph level with the text above rather than the glass.
        */}
        <ul className="no-scrollbar -mx-5 mt-6 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0">
          {items.map((item, index) => (
            <li key={item.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-auto">
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`View larger: ${item.alt}`}
                className="group relative block aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-3xl bg-surface-3"
              >
                <Photograph
                  photo={item.image}
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 44vw"
                  priority={index < 2}
                  style={{ objectPosition: item.focalPosition }}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[rgb(var(--scrim)/0.28)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-on-accent/90 text-accent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
                >
                  <ArrowsOut size={16} weight="regular" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Reveal>

      <GalleryLightbox
        photos={photos}
        index={open}
        label={label}
        onClose={() => setSelected(null)}
        onStep={(delta) =>
          setSelected((current) =>
            current === null ? current : (current + delta + photos.length) % photos.length,
          )
        }
      />
    </>
  );
}

/** One of the steps above the scheduler, numbered the way the install pages number theirs. */
function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong font-display text-sm text-accent"
      >
        {number}
      </span>
      <span className="pt-1 text-base leading-relaxed text-muted">{children}</span>
    </li>
  );
}

/** A sentence with one phrase in it set in ink, so the line to tap stands out. */
function Emphasised({ text, phrase }: { text: string; phrase: string }) {
  const at = text.indexOf(phrase);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <strong className="font-medium text-ink">{phrase}</strong>
      {text.slice(at + phrase.length)}
    </>
  );
}
