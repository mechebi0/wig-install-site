import { HeroCarousel } from "@/components/hero-carousel";
import { LocationStrip } from "@/components/location-strip";

/**
 * The location strip and the hero carousel, sized as one thing.
 *
 * WHY A WRAPPER RATHER THAN JUST STACKING THEM
 * The hero's whole job is to fill the viewport below the nav, which it did
 * with `min-h-[calc(100svh-4rem)]`. Putting a band above it and leaving that
 * calculation alone pushes the fold down by the height of the band, and the
 * page gains a scrollbar that only exists because of an announcement.
 *
 * Subtracting a hardcoded strip height instead would be worse: the strip
 * wraps to two lines on a narrow phone when both studios are open, and it
 * renders at zero height when Supabase is not configured at all, so there is
 * no constant to subtract.
 *
 * So the viewport calculation moves up here onto a flex column, the strip
 * takes its natural height, and the hero takes whatever is left via `flex-1`.
 * It is exact at every width, in all four states of the strip, with no
 * measurement and no JavaScript.
 *
 * `flex-1` is deliberately NOT paired with `min-h-0`. A flex item's default
 * `min-height: auto` is what stops it shrinking below its own content, and the
 * hero's content is real text that must not be clipped on a short landscape
 * phone. The floor is a minimum, not a fixed height.
 *
 * This is a server component. Only the strip inside it is interactive.
 */
export function HeroStage() {
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-ink lg:min-h-[calc(100svh-72px)] lg:max-h-[880px]">
      <LocationStrip />
      <HeroCarousel />
    </div>
  );
}
