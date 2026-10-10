import { Info } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { REVIEWS_NOTICE, TESTIMONIALS, testimonialsArePlaceholder } from "@/lib/content";

/**
 * Three quotes on an offset baseline. The middle column drops and the third
 * rises, so the row reads as composed rather than three matched cards.
 *
 * No avatars. The photography on this page is licensed stock, and pinning a
 * stock model's face to a named testimonial would imply that person endorsed
 * the business, which the licence does not permit and which is dishonest
 * regardless. Typographic attribution only.
 */

const OFFSETS = ["lg:mt-0", "lg:mt-14", "lg:mt-6"] as const;

export function Testimonials() {
  return (
    /*
      No heading of its own: /reviews opens with this exact sentence. What is
      kept is the placeholder notice, which has to sit with the quotes rather
      than in the page header, because it is a claim about these specific
      words.
    */
    <section
      aria-label="Client reviews"
      className="py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          {/*
            Visible while the quotes below are written stand-ins. Presenting
            invented quotes as real reviews would be deceptive, so the notice
            ships with them, and the dashboard will not switch it off while
            the stand-ins are still there (lib/content.ts).
          */}
          {testimonialsArePlaceholder && REVIEWS_NOTICE ? (
            <p className="inline-flex items-start gap-2 rounded-3xl border border-line-strong bg-surface px-4 py-2.5 text-sm leading-relaxed text-muted">
              <Info
                size={16}
                weight="regular"
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-accent"
              />
              <span>{REVIEWS_NOTICE}</span>
            </p>
          ) : null}
        </Reveal>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {TESTIMONIALS.map((item, i) => (
            <Reveal
              key={i}
              as="figure"
              index={i}
              className={OFFSETS[i % OFFSETS.length]}
            >
              <blockquote className="whitespace-pre-line font-display text-xl leading-snug tracking-tight text-ink lg:text-2xl">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-line pt-5 text-sm">
                <span className="block font-medium text-ink">{item.name}</span>
                {item.role ? <span className="block text-muted">{item.role}</span> : null}
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
