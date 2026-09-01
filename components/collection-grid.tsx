import { CollectionCard } from "@/components/collection-card";
import { Reveal } from "@/components/reveal";
import { COLLECTIONS_IN_ORDER, type StyleCollection } from "@/lib/collections";

/**
 * The six collections, as a grid. Two layouts, one component.
 *
 * ---------------------------------------------------------------------------
 * WHY TWO LAYOUTS RATHER THAN ONE GRID USED TWICE
 * ---------------------------------------------------------------------------
 * The homepage and /styles are answering different questions, so they cannot
 * be the same grid at two widths.
 *
 *   compact    the homepage. This is a DIRECTORY. Its job is to fit all six
 *              collections into roughly one and a half screens so the page
 *              stays short, and to get the visitor out to a collection page.
 *              Three up at desktop, one line of copy each.
 *
 *   editorial  /styles. This is the DESTINATION. There is nothing below it
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
  collections = COLLECTIONS_IN_ORDER,
  variant = "compact",
}: {
  collections?: StyleCollection[];
  variant?: "compact" | "editorial";
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
          />
        </Reveal>
      ))}
    </ul>
  );
}
