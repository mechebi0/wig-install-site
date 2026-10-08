"use client";

import { useSiteView } from "@/components/site-photos";
import { findResolved } from "@/lib/gallery";

/**
 * "6 looks": how many published photographs a collection holds.
 *
 * Read from the same photographs as the gallery underneath it, so a card
 * never promises six looks on a page that shows eight. The prerendered HTML
 * carries the count the site was built with; if Nat has added or hidden a
 * photograph since, the number changes once the page has loaded and the line
 * keeps its place.
 */
export function LookCount({ slug }: { slug: string }) {
  const n = findResolved(useSiteView(), slug)?.items.length ?? 0;
  return (
    <>
      {n} {n === 1 ? "look" : "looks"}
    </>
  );
}
