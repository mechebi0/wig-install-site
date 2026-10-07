"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A modal for the photo manager: editing a photograph, and confirming its
 * removal.
 *
 * A native <dialog> opened with showModal(), for the same reasons the gallery
 * lightbox is one (components/gallery-lightbox.tsx): the platform supplies
 * the top layer, the focus trap, the inert page behind it, and focus going
 * back to the button that opened it. What it does not supply is handled here:
 * Escape is routed through `onClose` so the parent's state stays the source
 * of truth, and focus lands on `initialFocusId` rather than on whatever
 * happens to be first. For a destructive confirmation that is the Cancel
 * button, so a stray Enter can never remove a photograph.
 *
 * The element itself stays mounted while closed, and only its contents come
 * and go. Remounting an open dialog would drop it from the top layer without
 * close(), and focus would never find its way back to the page.
 *
 * The backdrop only closes it when asked to. A confirmation can be dismissed
 * by a tap outside it; a form with unsaved typing in it cannot.
 */
export function AdminDialog({
  open,
  onClose,
  titleId,
  descriptionId,
  initialFocusId,
  afterClose,
  closeOnBackdrop = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  descriptionId?: string;
  initialFocusId?: string;
  /**
   * Runs once the dialog has closed and the page behind it is interactive
   * again. For moving focus somewhere other than the button that opened it,
   * when that button no longer exists. Focusing anything on the page before
   * this point does nothing: the page is inert while the dialog is open.
   */
  afterClose?: () => void;
  closeOnBackdrop?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const afterCloseRef = useRef(afterClose);
  useEffect(() => {
    afterCloseRef.current = afterClose;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (open && !node.open) {
      node.showModal();
      if (initialFocusId) document.getElementById(initialFocusId)?.focus();
    }
    if (!open && node.open) {
      node.close();
      afterCloseRef.current?.();
    }
  }, [open, initialFocusId]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === ref.current) onClose();
      }}
      className="m-auto max-h-[calc(100svh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-0 text-ink shadow-lifted backdrop:bg-[rgb(var(--scrim)/0.5)] backdrop:backdrop-blur-[2px]"
    >
      {open ? <div className="p-6 sm:p-8">{children}</div> : null}
    </dialog>
  );
}
