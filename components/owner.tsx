import { Check } from "@phosphor-icons/react/dist/ssr";
import { BrandPlate } from "@/components/brand-plate";
import { Reveal } from "@/components/reveal";
import { OWNER, REACH, STUDIO } from "@/lib/content";

/**
 * About Crowned by Nat. Portrait on the left, words on the right.
 *
 * This is the section the whole brief hangs on: one named person does the
 * work. The shape is built to take Nat's real biography and her own photograph
 * with no layout change. Swap the words in OWNER (lib/content.ts), and swap
 * BrandPlate for a <Photograph> when a picture of Nat arrives. See the note in
 * components/brand-plate.tsx for why the slot is not holding a stock portrait
 * in the meantime.
 */
export function Owner() {
  return (
    /*
      No heading of its own. /meet-nat opens with this exact sentence in its
      page header, and repeating it here would give the page two h-levels
      saying the same thing four hundred pixels apart.
    */
    <section
      id="about"
      aria-label={`About ${STUDIO.owner}`}
      className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-14 sm:px-8 sm:py-20 lg:py-28"
    >
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl bg-surface-2 shadow-lifted">
            <BrandPlate />
          </div>
        </Reveal>

        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal index={1}>
            {OWNER.paragraphs.map((paragraph, i) => (
              <p
                key={paragraph.slice(0, 24)}
                className={`max-w-[58ch] text-base leading-relaxed text-muted lg:text-lg ${
                  i === 0 ? "" : "mt-6"
                }`}
              >
                {paragraph}
              </p>
            ))}
          </Reveal>

          <Reveal index={2}>
            <ul className="mt-9 flex flex-col gap-3">
              {OWNER.credentials.map((credential) => (
                <li key={credential} className="flex items-start gap-3">
                  <Check
                    size={18}
                    weight="bold"
                    className="mt-1 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span className="text-base text-ink">{credential}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal index={3}>
            <p className="mt-9 text-base text-muted">
              Reach Nat:{" "}
              <a
                href={REACH.href}
                className="text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
              >
                {REACH.label}
              </a>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
