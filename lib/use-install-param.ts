"use client";

import { useSyncExternalStore } from "react";
import { parseInstallType, type InstallTypeId } from "@/lib/taxonomy";

/**
 * The install type named in the page URL's `?install=`, or null.
 *
 * This is the reading half of bookingTarget({ install }) in lib/content.ts:
 * every "Book Frontal Install" / "Book Closure Install" button carries the
 * choice in the query string, and /book uses this to open with that service
 * already selected.
 *
 * WHY useSyncExternalStore AND NOT useSearchParams OR AN EFFECT
 * Under `output: "export"` the page is prerendered with no URL, so the server
 * HTML always has to be the default, and the real query string only exists in
 * the browser. useSearchParams needs a Suspense boundary or the export build
 * fails (see the note on readNextParam in lib/auth/redirect.ts). Reading
 * `window.location` during render would hand hydration a different answer from
 * the server's and log a mismatch. An effect that copies the value into state
 * works but paints the default first and then flips it.
 *
 * useSyncExternalStore is the tool for exactly this: it renders the server
 * snapshot ("") while hydrating so the markup matches, then re-renders with
 * the real query string straight after, with no state to keep in step.
 *
 * The snapshot is the raw search string, a primitive, so React can compare it
 * by value and does not re-render on every read.
 */
function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
}

const clientSnapshot = () => window.location.search;
const serverSnapshot = () => "";

export function useInstallParam(): InstallTypeId | null {
  const search = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return parseInstallType(new URLSearchParams(search).get("install"));
}
