"use client";

import { Reveal } from "@/components/reveal";
import { useSiteView } from "@/components/site-photos";
import { StyleGallery } from "@/components/style-gallery";
import { installExamples } from "@/lib/gallery";
import type { InstallTypeId } from "@/lib/taxonomy";

/**
 * "The work" on an install page: the photographs that show this install.
 *
 * Up to six photographs Nat has labelled with this install in the photo
 * manager, a mix of styles, earliest in her order first (installExamples in
 * lib/gallery.ts). On the Closure and Reinstalls pages there are none until
 * she labels one (no frame can prove either; see the note in
 * components/install-page.tsx), and the section is left out rather than
 * shown empty.
 */
export function InstallExamples({
  installType,
  heading,
  note,
  galleryLabel,
}: {
  installType: InstallTypeId;
  heading: string;
  note: string;
  galleryLabel: string;
}) {
  const examples = installExamples(useSiteView(), installType);
  if (examples.length === 0) return null;

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
          <StyleGallery items={examples} label={galleryLabel} showInstallType={false} />
        </div>
      </div>
    </section>
  );
}
