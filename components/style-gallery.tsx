"use client";

import { useCallback, useState } from "react";
import { ArrowsOut } from "@phosphor-icons/react/dist/ssr";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import type { Photo } from "@/lib/collections";

/**
 * The gallery on a collection page. One component, all six collections.
 *
 * ---------------------------------------------------------------------------
 * A PLAIN GRID, ON PURPOSE
 * ---------------------------------------------------------------------------
 * Every photograph in the set is the same 3:4 crop, so this is a regular grid
 * rather than a masonry layout. Masonry over uniform images buys nothing but a
 * ragged bottom edge, and it is the thing that makes a gallery look assembled
 * by a script.
 *
 * The editorial move instead is a vertical offset on the middle column at
 * desktop, the same device the collection grid uses, so the two pages
 * recognisably belong to one site. It is dropped below `lg` where a stagger
 * would just read as uneven gaps.
 *
 * TWO COLUMNS ON A PHONE, not one. A single 3:4 column means one photograph
 * fills the screen and browsing six of them is six full scrolls; two lets you
 * take in a collection at a glance, which is what a gallery is for. The
 * lightbox is there for anyone who wants one big.
 *
 * ---------------------------------------------------------------------------
 * THE CELL IS A BUTTON
 * ---------------------------------------------------------------------------
 * Not a div with an onClick. It is keyboard reachable, it announces itself as
 * "View <description>, larger", and Enter or Space opens it, because a gallery
 * that only opens under a mouse is a gallery half the point of which is
 * missing. The expand glyph appears on hover as a hint, and is decoration
 * only: the accessible name never depends on it.
 */
export function StyleGallery({
  photos,
  /** Names the lightbox. "Deep Wave Glam gallery". */
  label,
}: {
  photos: Photo[];
  label: string;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      setOpen((current) => {
        if (current === null) return current;
        return (current + delta + photos.length) % photos.length;
      });
    },
    [photos.length],
  );

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {photos.map((photo, index) => (
          <Reveal
            as="li"
            key={`${photo.src}-${index}`}
            index={index % 3}
            className={index % 3 === 1 ? "lg:mt-12" : undefined}
          >
            <button
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`View larger: ${photo.alt}`}
              className="group relative block w-full cursor-pointer overflow-hidden rounded-3xl bg-surface-3 aspect-[3/4]"
            >
              <Photograph
                photo={photo}
                sizes="(min-width: 1024px) 30vw, 47vw"
                priority={index < 2}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />

              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[rgb(var(--scrim)/0.28)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
              />
              <span
                aria-hidden="true"
                className="absolute bottom-4 right-4 inline-flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-on-accent/90 text-accent opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
              >
                <ArrowsOut size={16} weight="regular" />
              </span>
            </button>
          </Reveal>
        ))}
      </ul>

      <GalleryLightbox
        photos={photos}
        index={open}
        label={label}
        onClose={() => setOpen(null)}
        onStep={step}
      />
    </>
  );
}
