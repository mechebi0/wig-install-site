import type { Photo } from "@/lib/collections";

/**
 * One photograph, at the right width for the slot it is in.
 *
 * WHY THIS IS A PLAIN <img> AND NOT next/image
 * next.config.ts sets `images.unoptimized` because the site is a static export
 * with no Node runtime to resize anything at request time. With that set,
 * next/image renders an <img> and a wrapper span and performs no optimisation
 * whatsoever: it costs a component boundary and buys nothing. Every photograph
 * here is already exported at three fixed widths by hand, so the browser has a
 * real srcSet to choose from either way.
 *
 * WHAT `sizes` IS FOR
 * The three files are 600w, 1200w and 1600w of the same 3:4 crop. Without a
 * `sizes` hint the browser assumes an image spans the whole viewport and pulls
 * the 1600 for a card that renders 300px wide. Every caller therefore passes
 * the CSS width the image will actually occupy, which is why `sizes` is
 * required rather than optional: a default here would silently be wrong at
 * most call sites.
 *
 * ASPECT RATIO
 * `width` and `height` are the real pixel dimensions of the 1200w file, so the
 * box is reserved before the bytes arrive and Cumulative Layout Shift stays at
 * zero. The wrapper decides the visible shape; `object-cover` does the rest.
 */
export function Photograph({
  photo,
  sizes,
  className = "",
  priority = false,
  /** Use the 1600w file as the `src` fallback. For heroes and the lightbox. */
  large = false,
  /**
   * Hide it from assistive technology and give it an empty alt.
   *
   * For the second photograph on a collection card, which cross-fades in under
   * the pointer. A screen reader has already been told about the picture
   * underneath and about where the card goes; announcing a second image it can
   * never trigger is noise, not information.
   */
  decorative = false,
  style,
}: {
  photo: Photo;
  sizes: string;
  className?: string;
  priority?: boolean;
  large?: boolean;
  decorative?: boolean;
  /**
   * Inline style, for the one case a utility class cannot cover: the hero's
   * slow drift, whose 14s duration is a constant shared with the JavaScript
   * that schedules the slide change and so has to be read from the same place.
   */
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={large ? photo.large : photo.src}
      srcSet={`${photo.small} 600w, ${photo.src} 1200w, ${photo.large} 1600w`}
      sizes={sizes}
      alt={decorative ? "" : photo.alt}
      aria-hidden={decorative || undefined}
      width={photo.width}
      height={photo.height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={className}
      style={style}
    />
  );
}
