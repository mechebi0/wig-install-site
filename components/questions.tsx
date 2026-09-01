import { Info, Plus } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { policiesAreDraft, QUESTIONS } from "@/lib/content";

/**
 * Nine questions, so an accordion rather than a stack of open paragraphs.
 * Built on native <details>, which means it opens with keyboard, opens with
 * JavaScript disabled, and is announced correctly with no ARIA of our own.
 *
 * Rows are 56px+ tall, so each summary clears the touch target minimum.
 */
export function Questions() {
  return (
    <section
      id="questions"
      aria-labelledby="questions-heading"
      className="scroll-mt-24 bg-surface-2/60 py-20 lg:py-28"
    >
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <Reveal>
            <h2
              id="questions-heading"
              className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:sticky lg:top-28 lg:text-5xl"
            >
              Common questions.
            </h2>

            {/*
              The same device the testimonials use, for the same reason. These
              answers describe timings, aftercare and a cancellation policy,
              and none of them has been confirmed by Nat yet. A visitor is
              entitled to know which parts of a page are a draft, and the
              notice sits beside the questions rather than in a footnote
              because that is where it is read. Remove it by flipping
              policiesAreDraft in lib/content.ts, once and only once Nat has
              agreed to every answer.
            */}
            {policiesAreDraft ? (
              <p className="mt-6 inline-flex max-w-[38ch] items-start gap-2 rounded-3xl border border-line-strong bg-surface px-4 py-2.5 text-sm leading-relaxed text-muted">
                <Info
                  size={16}
                  weight="regular"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-accent"
                />
                <span>
                  Draft answers, shown while Nat confirms timings and studio
                  policy. Ask her directly and she will tell you straight.
                </span>
              </p>
            ) : null}
          </Reveal>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <Reveal index={1}>
            <div className="border-t border-line-strong">
              {QUESTIONS.map((item) => (
                <details key={item.q} className="group border-b border-line-strong">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                    <h3 className="font-display text-lg tracking-tight text-ink lg:text-xl">
                      {item.q}
                    </h3>
                    <Plus
                      size={20}
                      weight="light"
                      aria-hidden="true"
                      className="shrink-0 text-accent transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-45 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="max-w-[62ch] pb-7 text-base leading-relaxed text-muted">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
