import { Reveal } from "@/components/reveal";
import { INTRO, STUDIO } from "@/lib/content";

/**
 * The brand statement, sitting directly under the hero.
 *
 * Deliberately typographic and image free. The hero above it is a full bleed
 * photograph and the trust strip below it is a hairline grid, so this is the
 * page taking a breath between them. It is also the first place the visitor is
 * told, in plain words, that one named person does the work.
 *
 * The heading is set wide and the body is held to two columns at desktop, so
 * the eye travels across rather than down a single narrow measure. No card, no
 * container, no accent block: a hairline rule and space do the grouping.
 */
export function Intro() {
  return (
    <section
      aria-labelledby="intro-heading"
      className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28"
    >
      <Reveal>
        <p className="label text-accent">{STUDIO.name}</p>
      </Reveal>

      <div className="mt-8 grid gap-10 border-t border-line-strong pt-10 lg:grid-cols-12 lg:gap-8 lg:pt-14">
        <Reveal className="lg:col-span-6">
          <h2
            id="intro-heading"
            className="max-w-[15ch] font-display text-3xl leading-[1.06] tracking-tight text-ink md:text-4xl lg:text-[3.25rem]"
          >
            {INTRO.heading}
          </h2>
        </Reveal>

        <div className="lg:col-span-5 lg:col-start-8">
          <Reveal index={1}>
            {INTRO.paragraphs.map((paragraph, i) => (
              <p
                key={paragraph.slice(0, 24)}
                className={`max-w-[52ch] text-base leading-relaxed text-muted lg:text-lg ${
                  i === 0 ? "" : "mt-5"
                }`}
              >
                {paragraph}
              </p>
            ))}
          </Reveal>

          <Reveal index={2}>
            <p className="mt-8 flex items-center gap-4 text-sm text-ink">
              <span aria-hidden="true" className="h-px w-10 bg-accent" />
              {INTRO.signature}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
