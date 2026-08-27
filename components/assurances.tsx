import {
  ArrowsClockwise,
  HandHeart,
  HeartStraight,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal } from "@/components/reveal";
import { ASSURANCES } from "@/lib/content";

const ICONS = {
  hand: HandHeart,
  heart: HeartStraight,
  arrows: ArrowsClockwise,
} as const;

/**
 * Trust row, its own section directly under the hero rather than crammed into
 * it. A one chair studio has no client logos to wall, so the honest equivalent
 * is the three things a nervous first time client needs to know. No card
 * containers: hairlines and space do the grouping.
 */
export function Assurances() {
  return (
    <section className="border-y border-line bg-surface/70">
      <div className="mx-auto grid max-w-[1400px] gap-px bg-line sm:grid-cols-3">
        {ASSURANCES.map((item, i) => {
          const Icon = ICONS[item.icon];
          return (
            <Reveal
              key={item.title}
              index={i}
              className="bg-bg px-5 py-8 sm:px-8 sm:py-10"
            >
              <Icon
                size={24}
                weight="light"
                className="text-accent"
                aria-hidden="true"
              />
              <h2 className="mt-4 font-display text-lg tracking-tight text-ink">
                {item.title}
              </h2>
              <p className="mt-2 max-w-[38ch] text-sm leading-relaxed text-muted">
                {item.body}
              </p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
