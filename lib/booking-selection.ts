"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  installTypeForPath,
  parseFinish,
  parseInstallType,
  type BookingSelection,
} from "@/lib/taxonomy";

/**
 * THE BOOKING SELECTION: which install, which finish, and what she typed
 * about the style she wants, kept for as long as the tab is open.
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
 * `styleDescription` never reaches the URL, and that is deliberate. It is
 * free text, and a Book button's href is meant to be short and shareable; a
 * paragraph baked into a query string would defeat both, and it is the one
 * field a scheduler does not need yet (see the note on it in
 * lib/taxonomy.ts). It lives in sessionStorage alone, which is still enough
 * to survive the same full page navigation everything else here survives.
 *
 * The three are merged field by field, so a homepage "Book Closure Install"
 * button (?install=closure) keeps the finish and the style notes chosen
 * earlier rather than wiping them.
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
 * one straight after, with no state to keep in step. The snapshot is a JSON
 * string of the whole selection rather than a pipe-joined pair: installType
 * and finish are closed enums that can never contain a pipe, but
 * styleDescription is whatever a visitor types, and a delimiter the value can
 * collide with is not a delimiter.
 *
 * ---------------------------------------------------------------------------
 * WRITING
 * ---------------------------------------------------------------------------
 * setBookingSelection() updates whichever fields it is given and tells every
 * reader, style notes included. The URL changes through history.replaceState,
 * which the Next router integrates with ("Native History API" in the Next
 * docs), so there is no navigation, no reload and no new history entry per
 * click or keystroke. On an install page the install is already in the path
 * (/installs/frontal/), so only ?finish= is written there and the address
 * stays clean; styleDescription is never written to it at all.
 */

const STORAGE_KEY = "crownedbynat.booking-selection";
const CHANGE_EVENT = "crownedbynat:booking-selection";

type Stored = {
  install?: unknown;
  finish?: unknown;
  styleDescription?: unknown;
};

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
    // sessionStorage only; the URL never carries this one. See the note above.
    styleDescription: asText(stored.styleDescription) ?? "",
  };
}

const EMPTY_SELECTION: BookingSelection = {
  installType: null,
  finish: null,
  styleDescription: "",
};

/*
  The only producer of a snapshot string is encode() itself, called on a
  BookingSelection that readSelection() already validated, so decode() can
  trust the shape it gets back without re-running parseInstallType/parseFinish
  a second time. It still falls back rather than throwing, on the outside
  chance a future change leaves a stale, differently-shaped string sitting in
  a snapshot somewhere.
*/
const encode = (selection: BookingSelection): string => JSON.stringify(selection);
const decode = (snapshot: string): BookingSelection => {
  try {
    return JSON.parse(snapshot) as BookingSelection;
  } catch {
    return EMPTY_SELECTION;
  }
};

function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
}

const clientSnapshot = () => encode(readSelection());
/*
  A single cached string rather than a fresh JSON.stringify() per call.
  Same-content strings compare equal either way, but a stable reference is
  what useSyncExternalStore's own docs ask a getServerSnapshot for.
*/
const SERVER_SNAPSHOT = encode(EMPTY_SELECTION);
const serverSnapshot = () => SERVER_SNAPSHOT;

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
 * install and the style notes as they are, and `{ finish: null }` clears the
 * finish alone.
 */
export function setBookingSelection(change: Partial<BookingSelection>): void {
  const next: BookingSelection = { ...readSelection(), ...change };

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        install: next.installType,
        finish: next.finish,
        styleDescription: next.styleDescription,
      }),
    );
  } catch {
    // Storage refused. The URL below still carries install/finish on this
    // page; the style notes exist only in the textarea's own value for now.
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
