import { Reveal } from "@/components/reveal";
import { PROCESS } from "@/lib/content";

/**
 * The appointment, four columns under a single rule.
 *
 * Labels are the verbs themselves. No "Step 1 / Stage 1" numbering, which
 * carries no information the position in the row does not already carry. No
 * card containers: a top rule per column groups them, and this section is
 * deliberately typographic so it breaks the run of image-led sections around
 * it.
 */
export function Process() {
  return (
    <section
      aria-labelledby="process-heading"
      className="bg-surface-2/60 py-14 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Reveal>
          <h2
            id="process-heading"
            className="max-w-[20ch] font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl"
          >
            What two hours in the chair looks like.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((stage, i) => (
            <Reveal key={stage.label} index={i}>
              <div className="border-t border-line-strong pt-6">
                <h3 className="font-display text-2xl tracking-tight text-ink">
                  {stage.label}
                </h3>
                <p className="mt-3 max-w-[34ch] text-base leading-relaxed text-muted">
                  {stage.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
