"use client";

import { Reveal } from "@/components/reveal";
import { StyleGallery } from "@/components/style-gallery";
import { useUploadedPhotos, type GalleryCell } from "@/lib/uploaded-photos";
import type { InstallTypeId } from "@/lib/taxonomy";

/**
 * "The work" on an install page: the photographs that show this install.
 *
 * The built-in examples render in the first frame exactly as before. On the
 * Closure and Reinstalls pages there are none (no frame in the bundle can
 * prove either; see the note in components/install-page.tsx), so until now
 * the section was left out. It now also appears there the moment Nat uploads
 * a photograph and labels it with that install type, which is the first way
 * those two pages can ever show real work without a code change.
 */
export function InstallExamples({
  installType,
  examples,
  heading,
  note,
  galleryLabel,
}: {
  installType: InstallTypeId;
  examples: GalleryCell[];
  heading: string;
  note: string;
  galleryLabel: string;
}) {
  const uploaded = useUploadedPhotos({ installType });
  if (examples.length === 0 && uploaded.length === 0) return null;

  return (
    <section
      aria-labelledby="examples-heading"
      className="border-t border-line bg-surface-2/50"
    >
      <div className="mx-auto max-w-[1400px] px-5 py-14 sm:px-8 sm:py-20 lg:py-28">
        <Reveal>
          <h2
            id="examples-heading"
            className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl"
          >
            {heading}
          </h2>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted">{note}</p>
        </Reveal>

        <div className="mt-10 lg:mt-14">
          {/* Every one of these is this install, so the per-photograph
              install tag would only repeat the page's own title. */}
          <StyleGallery
            items={examples}
            label={galleryLabel}
            showInstallType={false}
            uploads={{ installType }}
          />
        </div>
      </div>
    </section>
  );
}
