"use client";

import { Photograph } from "@/components/photo";
import { useSiteView } from "@/components/site-photos";
import { getInstallType, type InstallTypeId } from "@/lib/taxonomy";

/**
 * An install type's photograph: the `install-<id>` place in the photo
 * manager, or its stand-in (resolveSite in lib/gallery.ts).
 *
 * Client components so the photograph follows Nat's changes once the page
 * has loaded, as every other photograph on the site does; the rest of the
 * install page is static words and stays a server component.
 */

/** The photograph at the top of an install's own page, with its caption. */
export function InstallLeadFigure({ installType }: { installType: InstallTypeId }) {
  const placed = useSiteView().installs[installType];
  if (!placed) return null;
  const type = getInstallType(installType);

  return (
    <figure>
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-surface-3 lg:aspect-[5/6]">
        <Photograph
          photo={placed.item.image}
          sizes="(min-width: 1024px) 48vw, calc(100vw - 2.5rem)"
          large
          priority
          style={{ objectPosition: placed.focal }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      {/*
        Says what is visible in the frame. On the frontal page that is also
        the proof it is a frontal; on the closure page it is the look a
        closure is built around, stated as a look. Written about the launch
        photograph, so it is left off once Nat puts another one here.
      */}
      {placed.original ? (
        <figcaption className="mt-4 max-w-[52ch] text-sm leading-relaxed text-on-accent/65">
          {type.imageCaption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * The photograph on an install's card elsewhere: the cross-links at the foot
 * of the other install pages. Decorative there, because the words beside it
 * already name where the card goes. Empty, the cell keeps its blush ground.
 */
export function InstallCardPhoto({
  installType,
  sizes,
  className,
}: {
  installType: InstallTypeId;
  sizes: string;
  className: string;
}) {
  const placed = useSiteView().installs[installType];
  if (!placed) return null;
  return (
    <Photograph
      photo={placed.item.image}
      sizes={sizes}
      decorative
      style={{ objectPosition: placed.focal }}
      className={className}
    />
  );
}
