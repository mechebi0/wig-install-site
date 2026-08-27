import { Info } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { TESTIMONIALS, testimonialsArePlaceholder } from "@/lib/content";

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
    <section className="border-t border-line py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <h2 className="max-w-[18ch] font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl">
            What people say on week three.
          </h2>

          {/*
            Visible while the quotes below are written stand-ins. Presenting
            invented quotes as real reviews would be deceptive, so the notice
            ships with them and is removed by flipping the flag in content.ts
            once real testimonials replace these.
          */}
          {testimonialsArePlaceholder ? (
            <p className="mt-5 inline-flex items-start gap-2 rounded-3xl border border-line-strong bg-surface px-4 py-2.5 text-sm leading-relaxed text-muted">
              <Info
                size={16}
                weight="regular"
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-accent"
              />
              <span>
                Sample wording, shown while real client reviews are collected.
              </span>
            </p>
          ) : null}
        </Reveal>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {TESTIMONIALS.map((item, i) => (
            <Reveal
              key={item.name}
              as="figure"
              index={i}
              className={OFFSETS[i] ?? "lg:mt-0"}
            >
              <blockquote className="font-display text-xl leading-snug tracking-tight text-ink lg:text-2xl">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-line pt-5 text-sm">
                <span className="block font-medium text-ink">{item.name}</span>
                <span className="block text-muted">{item.role}</span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
