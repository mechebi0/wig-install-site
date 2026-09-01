"use client";

import { useCallback, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react/dist/ssr";
import { Photograph } from "@/components/photo";
import type { Photo } from "@/lib/collections";

/**
 * The gallery lightbox. Opened by StyleGallery, and only ever by StyleGallery.
 *
 * ---------------------------------------------------------------------------
 * NO DEPENDENCY
 * ---------------------------------------------------------------------------
 * There is a package for this and it would have been about 30kB of JavaScript
 * to show a bigger picture. What a lightbox actually has to get right is the
 * dialog contract, and that is a native element plus five effects. Written out
 * it is shorter than the configuration object the package would have needed.
 *
 * ---------------------------------------------------------------------------
 * WHY <dialog> RATHER THAN A DIV WITH role="dialog"
 * ---------------------------------------------------------------------------
 * `showModal()` gives us, from the platform, the four things a hand-rolled
 * modal usually gets wrong:
 *
 *   - the top layer, so nothing on the page can paint over it and there is no
 *     z-index to negotiate with the sticky nav or the mobile booking bar
 *   - a real focus trap, so Tab cannot escape into the page behind
 *   - inertness of everything outside it, for assistive technology
 *   - focus returned to the element that opened it on close, which is what
 *     makes keyboard browsing of a grid feel continuous rather than lossy
 *
 * What the platform does NOT give us and is handled below: Escape fires
 * `cancel` before `close`, background scroll is not locked, and the backdrop
 * is not a click target of its own.
 *
 * ---------------------------------------------------------------------------
 * THE CONTROLS
 * ---------------------------------------------------------------------------
 * Escape closes. Left and right arrows step. The backdrop closes on click. The
 * close button is a 44px target in the corner and is never the only way out.
 * Every control is a real <button> with a label, so none of this is
 * mouse-only.
 */
export function GalleryLightbox({
  photos,
  index,
  onClose,
  onStep,
  label,
}: {
  photos: Photo[];
  /** null while closed. The dialog is opened and closed off this prop. */
  index: number | null;
  onClose: () => void;
  onStep: (delta: number) => void;
  /** Names the dialog. "Deep Wave Glam gallery". */
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = index !== null;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  /*
    Background scroll lock. <dialog> does not do this, and without it the page
    behind scrolls under the picture on a trackpad or a touch screen, which on
    a phone means closing the lightbox drops you somewhere you never went.
  */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDialogElement>) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onStep(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onStep(-1);
      }
    },
    [onStep],
  );

  const photo = index === null ? null : photos[index];

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onKeyDown={onKeyDown}
      /* Escape. The platform fires `cancel` first; let it close, but tell the
         parent, or `index` stays set and the dialog cannot be reopened. */
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      /* The backdrop is not a child, so a click on it lands on the <dialog>
         itself. Comparing the target to the element is how you tell "clicked
         outside the picture" from "clicked the picture". */
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="fixed inset-0 m-0 h-full max-h-full w-full max-w-full bg-transparent p-0 backdrop:bg-[rgb(var(--scrim)/0.92)] backdrop:backdrop-blur-sm"
    >
      {photo ? (
        <div className="on-photo flex h-full w-full flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="font-display text-sm italic text-on-accent/70">
              {(index ?? 0) + 1} of {photos.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the gallery"
              className="tap -mr-2 inline-flex cursor-pointer items-center justify-center rounded-full text-on-accent/85 transition-colors hover:bg-on-accent/12 hover:text-on-accent"
            >
              <X size={24} weight="regular" />
            </button>
          </div>

          {/* min-h-0 lets this flex child actually shrink, which is what keeps
              a tall portrait inside the viewport instead of pushing the
              controls off the bottom of a short laptop screen. */}
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-2 sm:px-6">
            <Photograph
              key={photo.src}
              photo={photo}
              large
              sizes="(min-width: 1024px) 60vw, 100vw"
              priority
              className="max-h-full w-auto max-w-full rounded-2xl object-contain"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 px-4 pb-5 pt-3 sm:px-6">
            <Step
              onClick={() => onStep(-1)}
              label="Previous photograph"
              icon={<ArrowLeft size={20} weight="regular" />}
            />
            {/* The alt text, shown. It is a real description of the hair, so
                sighted visitors get the same information rather than it being
                filed away for screen readers only. */}
            <p className="hidden max-w-[52ch] text-center text-sm leading-relaxed text-on-accent/70 sm:block">
              {photo.alt}
            </p>
            <Step
              onClick={() => onStep(1)}
              label="Next photograph"
              icon={<ArrowRight size={20} weight="regular" />}
            />
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function Step({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-on-accent/25 text-on-accent/85 transition-colors hover:border-on-accent/60 hover:bg-on-accent/12 hover:text-on-accent"
    >
      {icon}
    </button>
  );
}
