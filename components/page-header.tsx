import { Reveal } from "@/components/reveal";

/**
 * The opening block on every page that is not the homepage.
 *
 * Deliberately typographic and image free. The homepage opens on a full bleed
 * photograph, so the inner pages open on space instead: it is what tells you
 * at a glance that you have moved off the landing experience and into the
 * detail, without anything having to say so.
 *
 * The top padding clears the sticky nav and then some. The kicker is the same
 * `.label` used in the hero, so the two openings are visibly the same family.
 */
export function PageHeader({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="border-b border-line bg-surface-2/40">
      <div className="mx-auto max-w-[1400px] px-5 pb-14 pt-16 sm:px-8 lg:pb-20 lg:pt-24">
        <Reveal>
          <p className="label text-accent">{kicker}</p>
        </Reveal>

        <Reveal index={1}>
          <h1 className="mt-6 max-w-[16ch] font-display text-4xl leading-[1.03] tracking-tight text-ink md:text-5xl lg:text-6xl">
            {title}
          </h1>
        </Reveal>

        <Reveal index={2}>
          <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted">
            {lede}
          </p>
        </Reveal>
      </div>
    </header>
  );
}
