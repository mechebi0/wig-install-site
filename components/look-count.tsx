"use client";

import { useUploadedPhotos } from "@/lib/uploaded-photos";

/**
 * "6 looks", counting Nat's uploads as well as the built-in set.
 *
 * The built-in count is the first frame, so the prerendered HTML says what it
 * always said. Once the uploads for this collection arrive the number goes up
 * to match the gallery underneath it, rather than a card promising six looks
 * on a page that shows eight. The number is the only thing that changes; the
 * line keeps its place.
 */
export function LookCount({ slug, builtIn }: { slug: string; builtIn: number }) {
  const n = builtIn + useUploadedPhotos({ collection: slug }).length;
  return (
    <>
      {n} {n === 1 ? "look" : "looks"}
    </>
  );
}
