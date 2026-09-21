"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  installTypeForPath,
  parseFinish,
  parseInstallType,
  type BookingSelection,
} from "@/lib/taxonomy";

/**
 * THE BOOKING SELECTION: which install and which finish the visitor has
 * chosen, kept for as long as the tab is open.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE CHOICE LIVES
 * ---------------------------------------------------------------------------
 * Two places, read in this order:
 *
 *   1. the URL    ?install=frontal&finish=curls
 *   2. this tab   sessionStorage, written on every choice
 *
 * The URL wins, because it is what a Book button hands over and what a shared
 * or refreshed link carries. The tab copy is what stops the choice getting
 * lost everywhere else. Every page on this site is a full page load (see
 * components/button.tsx), and most booking buttons are server-rendered, so
 * they cannot know what was picked two pages ago. With the choice kept here,
 * /book reads it back whichever button the visitor used to get there, and
 * nothing picked on an install page silently disappears on the way.
 *
 * The two are merged field by field, so a homepage "Book Closure Install"
 * button (?install=closure) keeps the finish chosen earlier rather than
 * wiping it.
 *
 * sessionStorage rather than localStorage: a choice made today should not
 * preselect a booking a month from now. It ends with the tab. Every access is
 * wrapped, because Safari in a private window and some in-app browsers throw
 * on storage instead of returning null.
 *
 * ---------------------------------------------------------------------------
 * WHY useSyncExternalStore
 * ---------------------------------------------------------------------------
 * The reasoning is carried over from the ?install= reader this replaces. The
 * page is prerendered with no URL and no storage, so the server HTML has to
 * be the empty selection. useSearchParams needs a Suspense boundary under
 * `output: "export"` or the build fails (see readNextParam in
 * lib/auth/redirect.ts). Reading the URL during render would hand hydration
 * a different answer from the server's. An effect that copies the value into
 * state paints the empty selection first and then flips. useSyncExternalStore
 * renders the server snapshot while hydrating, then re-renders with the real
 * one straight after, with no state to keep in step. The snapshot is a
 * primitive ("frontal|curls"), so React compares it by value.
 *
 * ---------------------------------------------------------------------------
 * WRITING
 * ---------------------------------------------------------------------------
 * setBookingSelection() updates both halves and tells every reader. The URL
 * changes through history.replaceState, which the Next router integrates with
 * ("Native History API" in the Next docs), so there is no navigation, no
 * reload and no new history entry per click. On an install page the install
 * is already in the path (/installs/frontal/), so only ?finish= is written
 * there and the address stays clean.
 */

const STORAGE_KEY = "crownedbynat.booking-selection";
const CHANGE_EVENT = "crownedbynat:booking-selection";

type Stored = { install?: unknown; finish?: unknown };

function readStored(): Stored {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Stored) : {};
  } catch {
    return {};
  }
}

/** Storage is untrusted text like the URL is, so it is parsed the same way. */
const asText = (value: unknown) => (typeof value === "string" ? value : null);

function readSelection(): BookingSelection {
  const params = new URLSearchParams(window.location.search);
  const stored = readStored();
  return {
    installType:
      parseInstallType(params.get("install")) ??
      parseInstallType(asText(stored.install)),
    finish:
      parseFinish(params.get("finish")) ?? parseFinish(asText(stored.finish)),
  };
}

const encode = ({ installType, finish }: BookingSelection) =>
  `${installType ?? ""}|${finish ?? ""}`;

function decode(snapshot: string): BookingSelection {
  const [install, finish] = snapshot.split("|");
  return {
    installType: parseInstallType(install),
    finish: parseFinish(finish),
  };
}

function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
}

const clientSnapshot = () => encode(readSelection());
const serverSnapshot = () => "|";

/** The current selection. Empty on the server and during hydration. */
export function useBookingSelection(): BookingSelection {
  const snapshot = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  return useMemo(() => decode(snapshot), [snapshot]);
}

/**
 * Records a choice. Pass only what changed: `{ finish: "curls" }` keeps the
 * install as it is, and `{ finish: null }` clears the finish alone.
 */
export function setBookingSelection(change: Partial<BookingSelection>): void {
  const next: BookingSelection = { ...readSelection(), ...change };

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ install: next.installType, finish: next.finish }),
    );
  } catch {
    // Storage refused. The URL below still carries the choice on this page.
  }

  const url = new URL(window.location.href);
  const pathNamesInstall = installTypeForPath(url.pathname) !== null;
  writeParam(url.searchParams, "install", pathNamesInstall ? null : next.installType);
  writeParam(url.searchParams, "finish", next.finish);
  if (url.href !== window.location.href) {
    window.history.replaceState(null, "", url);
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function writeParam(params: URLSearchParams, key: string, value: string | null) {
  if (value) params.set(key, value);
  else params.delete(key);
}
