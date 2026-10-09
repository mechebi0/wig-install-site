import { Check } from "@phosphor-icons/react/dist/ssr";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import type { Photo } from "@/lib/collections";
import { OWNER, REACH, STUDIO } from "@/lib/content";

/**
 * Nat's own portrait, exported at the three widths every photograph on this
 * site ships at (see the note in lib/collections.ts): 600 for phones, 1200 as
 * the default, and the untouched original as the largest - the source is
 * 1538x2048, so a wider export would be an upscale rather than a resize.
 */
const NAT_PORTRAIT: Photo = {
  src: "/images/crowned-by-nat-ceo-nat.jpg",
  small: "/images/crowned-by-nat-ceo-nat-600.jpg",
  large: "/images/crowned-by-nat-ceo-nat-1600.jpg",
  width: 1200,
  height: 1598,
  alt: "Nat, founder of Crowned by Nat",
};

/**
 * About Crowned by Nat. Portrait on the left, words on the right.
 *
 * This is the section the whole brief hangs on: one named person does the
 * work. The shape takes Nat's own words and her own photograph with no layout
 * change: the copy is OWNER (lib/content.ts), and the portrait below is her
 * own, in the slot that held the brand plate until it arrived. The container
 * owns the 4:5 shape, the rounding and the shadow; the photograph fills it
 * with object-cover, so nothing stretches and only the outer edges of the 3:4
 * frame give way - never her face.
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
      className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28"
    >
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl bg-surface-2 shadow-lifted">
            <Photograph
              photo={NAT_PORTRAIT}
              sizes="(min-width: 1024px) 40vw, calc(100vw - 2.5rem)"
              priority
              className="absolute inset-0 h-full w-full object-cover"
            />
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
