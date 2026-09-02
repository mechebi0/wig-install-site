import { ArrowRight, CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import { ButtonLink } from "@/components/button";
import { Photograph } from "@/components/photo";
import {
  focalFor,
  lookCount,
  type StyleCollection,
} from "@/lib/collections";
import { CTA, bookingTarget } from "@/lib/content";

/**
 * One collection, as a card. The single card component for the whole site:
 * the homepage showcase, the /gallery directory and the related rail at the
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
 * One anchor wrapping the photograph and the words, rather than a linked
 * heading plus a linked "View collection". Two links to one destination is two
 * tab stops and two announcements for one thing. The "View collection" line is
 * therefore drawn inside the anchor as text, not marked up as a second link.
 *
 * ---------------------------------------------------------------------------
 * AND WHY THE BOOK BUTTON SITS OUTSIDE IT
 * ---------------------------------------------------------------------------
 * `booking` adds a second action to the card, going to a different place, so
 * it cannot live inside the anchor: an <a> inside an <a> is invalid HTML and
 * browsers recover from it by splitting the markup, which loses the button.
 *
 * The alternative was the stretched-link pattern (container goes inert, the
 * heading carries the real link, a pseudo-element covers the card, the button
 * sits above it on z-index). That works, but it would have meant rewriting
 * every hover and focus rule on this card to key off a different element, to
 * end up looking identical. Instead the anchor is left exactly as it was and
 * the button is appended after it, which is one extra tab stop in the natural
 * reading order and no change at all to the card that already worked.
 *
 * A consequence worth knowing: `group` stays on the anchor, so hovering Book
 * does not cross-fade the photograph. That is the honest signal. The two
 * actions go to two different places and hovering one should not light up the
 * other.
 */

const ASPECT = {
  /** Homepage, three up. Taller than 4:5 so a three-column row still reads. */
  compact: "aspect-[3/4]",
  /** /gallery, two up. Wider cells, so a shallower crop keeps the row calm. */
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
  booking = false,
}: {
  collection: StyleCollection;
  variant?: keyof typeof ASPECT;
  /** Position in the grid. Only the first two cards load eagerly. */
  index?: number;
  /**
   * Draw the Book button under the card.
   *
   * Off by default, and on for the grid (see components/collection-grid.tsx),
   * which is what the homepage and /gallery render. The one place that builds
   * cards without the grid is the related rail at the foot of a collection
   * page, and that page already closes on a full booking band; a third ask
   * three inches above it would be the page repeating itself.
   */
  booking?: boolean;
}) {
  const editorial = variant === "editorial";

  return (
    <div>
      <a
        href={`/gallery/${collection.slug}/`}
        className="group block focus-visible:outline-none"
      >
        <div
          className={`relative isolate overflow-hidden rounded-3xl bg-surface-3 ${ASPECT[variant]} group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-accent`}
        >
          <Photograph
            photo={collection.hero}
            sizes={SIZES[variant]}
            priority={index < 2}
            style={{ objectPosition: focalFor(collection.hero) }}
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
            style={{ objectPosition: focalFor(collection.hoverImage) }}
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

          {/*
            Only the finish collection carries a badge. Tagging all six "Style"
            or "Finish" would put a chip on every card for the sake of one, and
            the five hairstyles are self-evidently hairstyles; the odd one out
            is the only one that needs saying.
          */}
          {collection.dimension === "finish" ? (
            <p className="label absolute right-5 top-5 z-[1] rounded-full bg-[rgb(var(--scrim)/0.55)] px-3 py-1.5 text-on-accent/90 backdrop-blur-sm">
              Finish
            </p>
          ) : null}
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

      {/*
        The booking action. Second in the tab order, after the collection link,
        which is the order the eye reads them in: see the style, then book it.

        The visible label is one word because six cards each shouting "Book
        Your Chair" is a wall rather than a grid, but the accessible name is
        "Book Deep Wave Glam" via the hidden suffix, so a screen reader and a
        voice-control user both get told which of the six they are on. Visible
        text is a subset of the accessible name, which is what WCAG 2.5.3 asks
        for.

        The calendar glyph is the same one the mobile booking bar uses, so
        "booking" looks the same wherever it appears, and it is what separates
        this at a glance from the arrow above it, which means "explore". It is
        aria-hidden because the word next to it already says the thing.
      */}
      {booking ? (
        <div className="mt-5">
          <ButtonLink variant="card" {...bookingTarget(collection.slug)}>
            <CalendarCheck size={15} weight="regular" aria-hidden="true" />
            {CTA.bookStyle}
            <span className="sr-only"> {collection.title}</span>
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
