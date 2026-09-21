import { ArrowDown, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import {
  BookInstallLink,
  InstallSelector,
} from "@/components/install-selector";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { StyleGallery } from "@/components/style-gallery";
import { COLLECTION_PAGE, CTA, INSTALL_PAGE } from "@/lib/content";
import { installExamples } from "@/lib/gallery";
import { FINISHES, INSTALL_TYPES, type InstallType } from "@/lib/taxonomy";

/**
 * One install type's own page: /installs/frontal/ or /installs/closure/.
 *
 * Both pages are this one component reading one entry of INSTALL_TYPES in
 * lib/taxonomy.ts, the same way the six collection pages are one file reading
 * lib/collections.ts, so the two cannot drift into two layouts.
 *
 * ---------------------------------------------------------------------------
 * THE ORDER, TOP TO BOTTOM
 * ---------------------------------------------------------------------------
 *   1. what it is      name, three beats, two sentences, one photograph, and
 *                      the two ways forward: book it, or choose a finish first
 *   2. how it works    four short facts
 *   3. the work        photographs that show this install, when there are any
 *   4. the choice      the finish, then the Book button (InstallSelector)
 *   5. the other one   the other install, so the page is never a dead end
 *
 * Explain, show, choose, book. The choice comes after the photographs on
 * purpose: someone picking between curls and crimps has usually just been
 * looking at hair.
 *
 * ---------------------------------------------------------------------------
 * WHY THE CLOSURE PAGE HAS NO GALLERY TODAY
 * ---------------------------------------------------------------------------
 * The work section lists only photographs whose frame establishes this
 * install type (see `installType` in lib/collections.ts). No photograph can
 * establish a closure, so on that page the section is left out entirely
 * rather than filled with pictures that merely look like one. It appears on
 * its own the day Nat marks a real closure in the set. The closure's lead
 * photograph is still shown, captioned for what it shows: the look a closure
 * is built around, not a record of what that client booked.
 */
export function InstallPage({ type }: { type: InstallType }) {
  const other = INSTALL_TYPES.find((candidate) => candidate.id !== type.id)!;
  const finishPhotos = FINISHES.flatMap((finish) =>
    finish.image ? [finish.image] : [],
  );
  const examples = installExamples(type.id, {
    exclude: [type.image, ...finishPhotos],
  });

  return (
    <>
      {/* -------------------------------------------------- what it is --- */}
      <header className="relative isolate overflow-hidden bg-ink">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 pb-14 pt-10 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-20 lg:pt-16">
          <div className="on-photo min-w-0 lg:col-span-6 lg:pr-6">
            <Reveal>
              <p className="label text-on-accent/60">{INSTALL_PAGE.eyebrow}</p>
              <h1 className="mt-4 max-w-[13ch] font-display text-4xl leading-[1.02] tracking-tight text-on-accent md:text-5xl lg:text-6xl">
                {type.label}
              </h1>
              <p className="mt-5 font-display text-xl italic text-on-accent/75 lg:text-2xl">
                {type.tagline}
              </p>
            </Reveal>

            <Reveal index={1}>
              <p className="mt-7 max-w-[52ch] text-base leading-relaxed text-on-accent/80 lg:text-lg">
                {type.description}
              </p>

              {/*
                Two ways on, in the order of commitment. The pill is the same
                near-white hero pill as the collection pages and the homepage,
                and it carries any finish already chosen. The outline button
                goes down this page to the finishes, for anyone who wants to
                choose one first; it is the quiet hero variant, so the pill
                stays the only filled object here.
              */}
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <BookInstallLink
                  installType={type.id}
                  className="w-full sm:w-auto"
                />
                <a href="#finish" className={`${buttonStyles.quiet} w-full sm:w-auto`}>
                  {INSTALL_PAGE.toFinish}
                  <ArrowDown size={16} weight="regular" aria-hidden="true" />
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal index={1} className="min-w-0 lg:col-span-6">
            <figure>
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface-3 lg:aspect-[5/6]">
                <Photograph
                  photo={type.image}
                  sizes="(min-width: 1024px) 48vw, calc(100vw - 2.5rem)"
                  large
                  priority
                  style={{ objectPosition: type.imageFocal }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              {/*
                Says what is visible in the frame. On the frontal page that
                is also the proof it is a frontal; on the closure page it is
                the look a closure is built around, stated as a look.
              */}
              <figcaption className="mt-4 max-w-[52ch] text-sm leading-relaxed text-on-accent/65">
                {type.imageCaption}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </header>

      {/* ------------------------------------------------ how it works --- */}
      <section aria-labelledby="how-heading" className="border-t border-line bg-bg">
        <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
          <Reveal>
            <h2
              id="how-heading"
              className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl"
            >
              {INSTALL_PAGE.how(type.shortLabel)}
            </h2>
          </Reveal>

          <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-9 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
            {type.highlights.map((point, index) => (
              <Reveal as="li" key={point.title} index={index}>
                <h3 className="border-t border-line-strong pt-5 font-display text-xl leading-tight tracking-tight text-ink">
                  {point.title}
                </h3>
                <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-muted lg:text-base">
                  {point.body}
                </p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- the work --- */}
      {examples.length > 0 ? (
        <section
          aria-labelledby="examples-heading"
          className="border-t border-line bg-surface-2/50"
        >
          <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
            <Reveal>
              <h2
                id="examples-heading"
                className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl"
              >
                {INSTALL_PAGE.examples(type.shortLabel)}
              </h2>
              <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted">
                {type.examplesNote} {COLLECTION_PAGE.galleryHint}
              </p>
            </Reveal>

            <div className="mt-10 lg:mt-14">
              {/* Every one of these is this install, so the per-photograph
                  install tag would only repeat the page's own title. */}
              <StyleGallery
                items={examples}
                label={`${type.label} gallery`}
                showInstallType={false}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------- the choice --- */}
      <section id="finish" className="scroll-mt-24 border-t border-line bg-bg">
        <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
          <InstallSelector mode="page" installType={type.id} />
        </div>
      </section>

      {/* ----------------------------------------------- the other one --- */}
      <section
        aria-labelledby="other-heading"
        className="border-t border-line bg-surface-2/50"
      >
        <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
          <Reveal>
            <h2
              id="other-heading"
              className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl"
            >
              {INSTALL_PAGE.other}
            </h2>
          </Reveal>

          <Reveal index={1} className="mt-10 lg:mt-14">
            {/*
              One link for the whole card, the same rule as a collection card:
              one destination is one tab stop. The photograph is decorative
              here because the words beside it already name where it goes.
            */}
            <a
              href={other.href}
              className="group grid grid-cols-[38%_minmax(0,1fr)] overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-soft transition-colors duration-300 hover:border-accent sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-surface-3 sm:aspect-auto sm:min-h-[20rem]">
                <Photograph
                  photo={other.image}
                  sizes="(min-width: 1024px) 24vw, (min-width: 640px) 38vw, 38vw"
                  decorative
                  style={{ objectPosition: other.imageFocal }}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
              <div className="flex min-w-0 flex-col justify-center p-5 sm:p-9 lg:p-12">
                <h3 className="font-display text-2xl leading-tight tracking-tight text-ink sm:text-3xl lg:text-4xl">
                  {other.label}
                </h3>
                <p className="mt-2 font-display text-base italic leading-snug text-muted sm:text-lg">
                  {other.tagline}
                </p>
                <p className="mt-5 hidden max-w-[52ch] text-base leading-relaxed text-muted sm:block">
                  {other.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
                  {CTA.viewInstall} {other.label}
                  <ArrowRight
                    size={15}
                    weight="regular"
                    aria-hidden="true"
                    className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </span>
              </div>
            </a>
          </Reveal>

          <Reveal index={2}>
            <a
              href="/gallery/"
              className="group mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"
            >
              {INSTALL_PAGE.gallery}
              <ArrowRight
                size={15}
                weight="regular"
                aria-hidden="true"
                className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </a>
          </Reveal>
        </div>
      </section>
    </>
  );
}
