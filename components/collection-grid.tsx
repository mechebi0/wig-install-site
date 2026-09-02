import { CollectionCard } from "@/components/collection-card";
import { Reveal } from "@/components/reveal";
import type { StyleCollection } from "@/lib/collections";
import { listCollections } from "@/lib/gallery";

/**
 * The six collections, as a grid. Two layouts, one component.
 *
 * ---------------------------------------------------------------------------
 * WHY TWO LAYOUTS RATHER THAN ONE GRID USED TWICE
 * ---------------------------------------------------------------------------
 * The homepage and /gallery are answering different questions, so they cannot
 * be the same grid at two widths.
 *
 *   compact    the homepage. This is a DIRECTORY. Its job is to fit all six
 *              collections into roughly one and a half screens so the page
 *              stays short, and to get the visitor out to a collection page.
 *              Three up at desktop, one line of copy each.
 *
 *   editorial  /gallery. This is the DESTINATION. There is nothing below it
 *              competing for the scroll, so the cells get large, the copy runs
 *              to a full paragraph, and two up is the right density.
 *
 * ---------------------------------------------------------------------------
 * THE STAGGER
 * ---------------------------------------------------------------------------
 * Every second cell drops by a few rem on wide screens. Six identical
 * rectangles locked to a baseline is a product listing; the same six with a
 * half-cell offset is an editorial spread, and it costs one utility class.
 *
 * It is applied with `lg:mt-*` on odd children rather than by making the grid
 * itself irregular, so the DOM order, the tab order and the reading order stay
 * exactly the array order. Below `lg` the offset is dropped entirely, because
 * on a phone a staggered single column is just inconsistent gaps.
 */
export function CollectionGrid({
  collections = listCollections(),
  variant = "compact",
  booking = true,
}: {
  collections?: StyleCollection[];
  variant?: "compact" | "editorial";
  /**
   * Give every card its own Book button. On by default, because both places
   * that render this grid (the homepage showcase and /gallery) are the
   * visitor choosing a style, and the moment they have chosen one is the
   * moment to let them book it rather than making them find the CTA at the
   * foot of the page and then say which style they wanted from memory.
   *
   * The slug rides along on the link, so the choice survives the click. See
   * bookingTarget() in lib/content.ts.
   */
  booking?: boolean;
}) {
  const editorial = variant === "editorial";

  return (
    <ul
      className={
        editorial
          ? "grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2 lg:gap-x-12 lg:gap-y-20"
          : "grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16"
      }
    >
      {collections.map((collection, index) => (
        <Reveal
          as="li"
          key={collection.slug}
          index={index % 3}
          className={
            editorial
              ? index % 2 === 1
                ? "md:mt-20"
                : undefined
              : index % 3 === 1
                ? "lg:mt-16"
                : undefined
          }
        >
          <CollectionCard
            collection={collection}
            variant={variant}
            index={index}
            booking={booking}
          />
        </Reveal>
      ))}
    </ul>
  );
}
