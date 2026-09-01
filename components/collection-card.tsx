import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Photograph } from "@/components/photo";
import { lookCount, type StyleCollection } from "@/lib/collections";

/**
 * One collection, as a card. The single card component for the whole site:
 * the homepage showcase, the /styles directory and the related rail at the
 * foot of every collection page all render this.
 *
 * ---------------------------------------------------------------------------
 * WHY THE CARD IS NOT A CARD
 * ---------------------------------------------------------------------------
 * There is no panel, no border, no shadow and no background behind it. A
 * "card" in the component-library sense is a container that separates its
 * contents from the page; that is the correct object for a dashboard tile and
 * the wrong one for a fashion collection, where the photograph IS the card and
 * anything drawn around it reads as packaging.
 *
 * So this is a photograph, a rule, a name and a line, and the only chrome is
 * the 24px radius the shape scale in globals.css mandates for media.
 *
 * ---------------------------------------------------------------------------
 * THE HOVER, AND WHY IT IS TWO PHOTOGRAPHS RATHER THAN A COLLAGE
 * ---------------------------------------------------------------------------
 * Each collection needs to show more than one look without the homepage
 * turning into six contact sheets. A second photograph stacked underneath and
 * cross-faded on hover gives two looks per card in the space of one, which is
 * the device every serious fashion house uses on a product grid.
 *
 * It is strictly an enhancement:
 *   - both photographs are in the collection gallery, so nothing is only
 *     reachable by hovering
 *   - the second image is aria-hidden and carries no alt text of its own,
 *     because to a screen reader it is a duplicate of a picture it has
 *     already been told about
 *   - a touch device never fires hover and simply sees one photograph
 *   - prefers-reduced-motion drops the cross-fade and the zoom entirely
 *
 * ---------------------------------------------------------------------------
 * THE WHOLE CARD IS ONE LINK
 * ---------------------------------------------------------------------------
 * One anchor wrapping everything, rather than a linked heading plus a linked
 * "View collection". Two links to one destination is two tab stops and two
 * announcements for one thing. The "View collection" line is therefore drawn
 * inside the anchor as text, not marked up as a second link.
 */

const ASPECT = {
  /** Homepage, three up. Taller than 4:5 so a three-column row still reads. */
  compact: "aspect-[3/4]",
  /** /styles, two up. Wider cells, so a shallower crop keeps the row calm. */
  editorial: "aspect-[4/5]",
} as const;

const SIZES = {
  compact:
    "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, calc(100vw - 2.5rem)",
  editorial: "(min-width: 768px) 46vw, calc(100vw - 2.5rem)",
} as const;

export function CollectionCard({
  collection,
  variant = "compact",
  index = 0,
}: {
  collection: StyleCollection;
  variant?: keyof typeof ASPECT;
  /** Position in the grid. Only the first two cards load eagerly. */
  index?: number;
}) {
  const editorial = variant === "editorial";

  return (
    <a
      href={`/styles/${collection.slug}/`}
      className="group block focus-visible:outline-none"
    >
      <div
        className={`relative isolate overflow-hidden rounded-3xl bg-surface-3 ${ASPECT[variant]} group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-accent`}
      >
        <Photograph
          photo={collection.hero}
          sizes={SIZES[variant]}
          priority={index < 2}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />

        {/*
          The second look. Sits on top at opacity 0 and is the only thing that
          changes on hover, which is why the transition can be slow enough to
          read as a dissolve rather than a swap.
        */}
        <Photograph
          photo={collection.hoverImage}
          sizes={SIZES[variant]}
          decorative
          className="absolute inset-0 h-full w-full scale-[1.04] object-cover opacity-0 transition-opacity duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-100 motion-reduce:hidden"
        />

        {/*
          A wash from the foot of the frame, tinted to the wine ink rather than
          to neutral grey so it reads as a duotone rather than a veil. It exists
          to hold the look count legible, and it deepens a little on hover so
          the frame settles rather than flashing.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--scrim)/0.55)] via-[rgb(var(--scrim)/0.08)] to-transparent transition-opacity duration-700 group-hover:opacity-90 motion-reduce:transition-none"
        />

        <p className="absolute bottom-5 left-6 z-[1] font-display text-sm italic text-on-accent/85">
          {lookCount(collection)}
        </p>
      </div>

      <div className="mt-6 flex items-start justify-between gap-6 border-t border-line pt-5 transition-colors duration-300 group-hover:border-line-strong">
        <div className="min-w-0">
          <h3
            className={`font-display leading-tight tracking-tight text-ink ${
              editorial ? "text-2xl lg:text-[1.75rem]" : "text-xl lg:text-2xl"
            }`}
          >
            {collection.title}
          </h3>
          <p
            className={`mt-2 text-muted ${
              editorial
                ? "max-w-[46ch] text-base leading-relaxed"
                : "max-w-[34ch] text-sm leading-relaxed"
            }`}
          >
            {editorial ? collection.description : collection.summary}
          </p>

          {/*
            Not a link, and not marked up as one. The whole card is the link;
            this is the label that tells you so. The rule under it wipes in from
            the left on hover, which is the same gesture the nav links use.
          */}
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
            View collection
            <span
              aria-hidden="true"
              className="mt-px block h-px w-0 bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-6 motion-reduce:transition-none"
            />
          </span>
        </div>

        <ArrowRight
          size={20}
          weight="light"
          aria-hidden="true"
          className="mt-1 shrink-0 text-muted transition-[transform,color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none"
        />
      </div>
    </a>
  );
}
