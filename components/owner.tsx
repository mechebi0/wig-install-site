import Image from "next/image";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { OWNER, STUDIO } from "@/lib/content";
import { OWNER_IMAGE } from "@/lib/images";

/**
 * The owner section, image on the left. The hero put its image on the right
 * and several sections sit between them, so the page never runs a third
 * consecutive image plus text split.
 *
 * This is the section the whole brief hangs on: one person does the work.
 */
export function Owner() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-5">
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl bg-surface-2 shadow-lifted">
            <Image
              src={OWNER_IMAGE.src}
              alt={OWNER_IMAGE.alt}
              width={OWNER_IMAGE.width}
              height={OWNER_IMAGE.height}
              loading="lazy"
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>

        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal index={1}>
            <h2 className="max-w-[16ch] font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl lg:text-5xl">
              {OWNER.heading}
            </h2>

            {OWNER.paragraphs.map((paragraph) => (
              <p
                key={paragraph.slice(0, 24)}
                className="mt-6 max-w-[58ch] text-base leading-relaxed text-muted lg:text-lg"
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
              Studio line:{" "}
              <a
                href={`tel:${STUDIO.phone.replace(/[^+\d]/g, "")}`}
                className="text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
              >
                {STUDIO.phone}
              </a>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
