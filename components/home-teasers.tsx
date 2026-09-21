import { ArrowRight, CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import { ButtonLink } from "@/components/button";
import { CollectionGrid } from "@/components/collection-grid";
import { Reveal } from "@/components/reveal";
import { CTA, HOME, bookingTarget } from "@/lib/content";
import { INSTALL_TYPES } from "@/lib/taxonomy";

/**
 * Two of the homepage's middle blocks.
 *
 * They live in one file because they exist to solve one problem: keeping the
 * homepage short. Each is a doorway to a page that carries the real content,
 * and neither is allowed to grow past the size of a doorway. Editing them
 * side by side is what stops that happening one section at a time.
 *
 *   InstallTypes         the two services, frontal and closure, out to /book
 *   CollectionShowcase   six style cards, out to /gallery
 *
 * They answer two different questions and are kept visibly apart. InstallTypes
 * is what you book. CollectionShowcase is the hair you browse. Nothing in the
 * second block is a service, which is why its Book buttons carry a style and
 * this block's carry an install type.
 */

/** A quiet text link with a rule that wipes in. The site's tertiary action. */
function TextLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-accent"
    >
      {children}
      <ArrowRight
        size={16}
        weight="regular"
        aria-hidden="true"
        className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
      />
    </a>
  );
}

/**
 * The primary service presentation: the two install types, and nothing else.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE ARE NO PRICES HERE
 * ---------------------------------------------------------------------------
 * Every figure in SERVICES is still a placeholder waiting on Nat, and a price
 * on a homepage is the single thing a visitor will remember and quote back.
 * /book carries them, once, where they can be corrected in one place. A name
 * and one line each is enough to answer "what do you do", which is the only
 * job this block has.
 *
 * ---------------------------------------------------------------------------
 * WHY TWO PANELS AND NOT A LIST
 * ---------------------------------------------------------------------------
 * This is the first place a visitor decides what to book, so each option gets
 * a surface big enough to tap without aiming and a button that says exactly
 * which appointment it opens. The panel is the same quiet paper-and-hairline
 * surface /book uses for its services, not a new component: the photography
 * elsewhere on the page carries the colour, and this block only has to be
 * unmistakable.
 *
 * Names, descriptions and the per-type booking link all come from
 * lib/taxonomy.ts. Nothing here types "frontal" or "closure".
 */
export function InstallTypes() {
  return (
    <section
      aria-labelledby="installs-heading"
      className="border-t border-line bg-bg"
    >
      <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal className="min-w-0">
            <p className="label text-accent">{HOME.installs.kicker}</p>
            <h2
              id="installs-heading"
              className="mt-5 max-w-[18ch] font-display text-3xl leading-[1.06] tracking-tight text-ink md:text-4xl lg:text-5xl"
            >
              {HOME.installs.heading}
            </h2>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted lg:text-lg">
              {HOME.installs.body}
            </p>
          </Reveal>

          <Reveal index={1} className="shrink-0">
            <TextLink href="/book/">{HOME.installs.link}</TextLink>
          </Reveal>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:mt-16 lg:gap-8">
          {INSTALL_TYPES.map((type, index) => (
            <Reveal as="li" key={type.id} index={index} className="flex">
              <article className="flex w-full flex-col justify-between gap-10 rounded-3xl border border-line-strong bg-surface p-7 shadow-soft sm:p-9 lg:min-h-[22rem] lg:p-12">
                <div>
                  <h3 className="font-display text-3xl leading-[1.05] tracking-tight text-ink lg:text-5xl">
                    {type.label}
                  </h3>
                  <p className="mt-5 max-w-[30ch] text-base leading-relaxed text-muted lg:text-lg">
                    {type.summary}
                  </p>
                </div>

                <div>
                  <ButtonLink
                    {...bookingTarget({ install: type.id })}
                    className="w-full sm:w-auto"
                  >
                    <CalendarCheck size={17} weight="regular" aria-hidden="true" />
                    {CTA.bookInstall} {type.label}
                  </ButtonLink>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The six collections. The centrepiece of the homepage, and the only block on
 * it that is allowed to be large.
 *
 * It carries a directory of the whole site's work in roughly a screen and a
 * half, which is the trade this page is built around: enough photography to
 * understand what Nat does, then out to a collection page for the depth.
 */
export function CollectionShowcase() {
  return (
    <section
      aria-labelledby="collections-heading"
      className="border-t border-line bg-bg"
    >
      <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal className="min-w-0">
            <p className="label text-accent">{HOME.collections.kicker}</p>
            <h2
              id="collections-heading"
              className="mt-5 max-w-[18ch] font-display text-3xl leading-[1.06] tracking-tight text-ink md:text-4xl lg:text-5xl"
            >
              {HOME.collections.heading}
            </h2>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted lg:text-lg">
              {HOME.collections.body}
            </p>
          </Reveal>

          <Reveal index={1} className="shrink-0">
            <TextLink href="/gallery/">{HOME.collections.link}</TextLink>
          </Reveal>
        </div>

        <div className="mt-12 lg:mt-16">
          <CollectionGrid />
        </div>
      </div>
    </section>
  );
}
