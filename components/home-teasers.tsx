import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { CollectionGrid } from "@/components/collection-grid";
import { Reveal } from "@/components/reveal";
import {
  HOME,
  INTRO,
  SERVICES,
  testimonialsArePlaceholder,
} from "@/lib/content";

/**
 * The three middle blocks of the homepage.
 *
 * They live in one file because they exist to solve one problem: keeping the
 * homepage short. Each is a doorway to a page that carries the real content,
 * and none of them is allowed to grow past the size of a doorway. Editing them
 * side by side is what stops that happening one section at a time.
 *
 *   CollectionShowcase   six cards, out to /gallery
 *   ServiceSummary       the three services by name, out to /book
 *   ClosingTeasers       Meet Nat and the reviews, side by side, four lines
 *                        each, out to /meet-nat and /reviews
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
 * What Nat actually does, in three lines and no prices.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE ARE NO PRICES HERE
 * ---------------------------------------------------------------------------
 * Every figure in SERVICES is still a placeholder waiting on Nat, and a price
 * on a homepage is the single thing a visitor will remember and quote back.
 * /book carries them, once, where they can be corrected in one place. Names
 * and one line each is enough to answer "what is this business", which is the
 * only job this block has.
 *
 * It is a plain definition list rather than three cards. Three bordered cards
 * carrying two lines of text each is the most generic block on the modern web,
 * and this page already spends its card budget on photographs.
 */
export function ServiceSummary() {
  return (
    <section
      aria-labelledby="services-heading"
      className="border-t border-line bg-bg"
    >
      <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Reveal className="min-w-0">
            <p className="label text-accent">{HOME.services.kicker}</p>
            <h2
              id="services-heading"
              className="mt-5 max-w-[18ch] font-display text-3xl leading-[1.06] tracking-tight text-ink md:text-4xl lg:text-5xl"
            >
              {HOME.services.heading}
            </h2>
            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted lg:text-lg">
              {HOME.services.body}
            </p>
          </Reveal>

          <Reveal index={1} className="shrink-0">
            <TextLink href="/book/">{HOME.services.link}</TextLink>
          </Reveal>
        </div>

        <dl className="mt-12 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-3 lg:mt-16">
          {SERVICES.map((service, index) => (
            <Reveal key={service.id} index={index}>
              <dt className="border-t border-line pt-5 font-display text-lg leading-tight tracking-tight text-ink lg:text-xl">
                {service.name}
              </dt>
              <dd className="mt-3 max-w-[42ch] text-sm leading-relaxed text-muted">
                {service.body}
              </dd>
            </Reveal>
          ))}
        </dl>
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
      <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
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

/**
 * MEET NAT and THE CROWNED EXPERIENCE, side by side in one band.
 *
 * ---------------------------------------------------------------------------
 * WHY THEY SHARE A BAND, AND WHY NEITHER HAS A PHOTOGRAPH
 * ---------------------------------------------------------------------------
 * These started as two stacked image-and-text sections, and both were wrong
 * for the same reason.
 *
 * The Meet Nat one carried a photograph, and the only photographs this project
 * has are of Nat's CLIENTS. A face under the words "Meet Nat" says that face
 * is Nat's. It is not, and no amount of caption undoes what a portrait beside
 * a name asserts. No photograph of Nat has been supplied, so this teaser has
 * none. (/meet-nat solves the same problem with a brand plate; see
 * components/brand-plate.tsx.)
 *
 * The reviews one could not carry a quote either, because every quote on
 * /reviews is still a written stand-in and lifting one out of the page that
 * labels it as such is how a placeholder becomes a fake testimonial.
 *
 * Two short text blocks stacked as two full-width sections is a page paying
 * twice for the same silence. Side by side they read as one considered
 * closing note, they cost a screen less of scroll, and the quiet after the six
 * photographs above is the rhythm the page wanted anyway. This is now the last
 * band on the homepage, and it closes straight into the footer.
 *
 * The moment either has real content, it earns its own section back.
 */
export function ClosingTeasers() {
  return (
    <section
      aria-label="About Nat, and client reviews"
      className="border-t border-line bg-surface-2/50"
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <Reveal>
          <p className="label text-accent">{HOME.meetNat.kicker}</p>
          <h2 className="mt-5 max-w-[15ch] font-display text-3xl leading-[1.06] tracking-tight text-ink md:text-4xl">
            {HOME.meetNat.heading}
          </h2>
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted">
            {HOME.meetNat.body}
          </p>
          <p className="mt-6 font-display text-base italic text-muted">
            {INTRO.signature}
          </p>
          <div className="mt-6">
            <TextLink href="/meet-nat/">{HOME.meetNat.link}</TextLink>
          </div>
        </Reveal>

        {/*
          The rule is drawn on this column rather than between the two, so it
          simply is not there below lg where the columns stack and a vertical
          rule would be pointing at nothing.
        */}
        <Reveal index={1} className="lg:border-l lg:border-line lg:pl-20">
          {/* No eyebrow on this column. The homepage is allowed two across the
              whole page (see the note in components/collection-grid.tsx), the
              collection showcase has one, and "In her clients' words." needs
              no label above it to say what it is. */}
          <h2 className="max-w-[15ch] font-display text-3xl leading-[1.06] tracking-tight text-ink md:text-4xl">
            {HOME.reviews.heading}
          </h2>
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted">
            {testimonialsArePlaceholder
              ? HOME.reviews.bodyPending
              : HOME.reviews.body}
          </p>
          <div className="mt-6">
            <TextLink href="/reviews/">{HOME.reviews.link}</TextLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
