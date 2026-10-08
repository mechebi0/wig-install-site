"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  PHOTO_SELECT,
  photoSetFromRows,
  photoSetKey,
  type PhotoRow,
  type PhotoSet,
} from "@/lib/site-photos";
import { resolveSite, type SiteView } from "@/lib/gallery";

/**
 * The website's photographs, for every component that shows one.
 *
 * ---------------------------------------------------------------------------
 * THE FIRST FRAME IS THE BUILD, THEN THE DATABASE
 * ---------------------------------------------------------------------------
 * The root layout fetches the published photographs while the static pages
 * are built and hands them in as `initial`, so every page is in the HTML
 * complete: photographs, alt text, the lot, before any JavaScript runs.
 *
 * Once a page that shows photographs has loaded, this asks Supabase once for
 * the current set. If Nat has changed something since the site was last
 * built (replaced a photograph, hidden one, chosen a new cover) the page
 * redraws with her change; if nothing has changed, which is nearly always,
 * nothing redraws at all (photoSetKey in lib/site-photos.ts). If Supabase is
 * not configured or does not answer, the page simply keeps what it was built
 * with. A visitor never sees an error for this.
 *
 * Pages with no photographs on them (the FAQ, reviews) never send the
 * request: it waits until a component actually asks for the photographs.
 *
 * Which rows come back is decided by row level security: the public can read
 * published photographs and nothing else. The `active` filter only matters
 * when Nat herself is browsing the site signed in, since she can read her
 * hidden photographs too.
 */

type Context = {
  /** What this deployment was built with. */
  built: PhotoSet;
  view: SiteView;
  /** Called by any component that shows photographs. */
  want: () => void;
};

const SitePhotosContext = createContext<Context | null>(null);

/*
  One request per page load, however many components ask. A failure clears
  it so a later page load tries again.
*/
let pending: Promise<PhotoSet | null> | null = null;

function fetchCurrent(): Promise<PhotoSet | null> {
  const supabase = getSupabase();
  if (!supabase) return Promise.resolve(null);
  if (!pending) {
    pending = Promise.resolve(
      supabase
        .from("gallery_items")
        .select(PHOTO_SELECT)
        .eq("active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(500),
    ).then(
      ({ data, error }) => {
        if (error || !data) {
          pending = null;
          return null;
        }
        return photoSetFromRows(data as unknown as PhotoRow[]);
      },
      () => {
        pending = null;
        return null;
      },
    );
  }
  return pending;
}

export function SitePhotosProvider({
  initial,
  children,
}: {
  initial: PhotoSet;
  children: ReactNode;
}) {
  const [current, setCurrent] = useState(initial);
  const [wanted, setWanted] = useState(false);
  const want = useCallback(() => setWanted(true), []);

  useEffect(() => {
    if (!wanted || !isSupabaseConfigured) return;
    let live = true;
    void fetchCurrent().then((found) => {
      if (!live || !found) return;
      setCurrent((was) => (photoSetKey(was) === photoSetKey(found) ? was : found));
    });
    return () => {
      live = false;
    };
  }, [wanted]);

  const view = useMemo(() => resolveSite(current), [current]);
  const value = useMemo(() => ({ built: initial, view, want }), [initial, view, want]);

  return <SitePhotosContext.Provider value={value}>{children}</SitePhotosContext.Provider>;
}

function useSitePhotosContext(): Context {
  const context = useContext(SitePhotosContext);
  if (!context) {
    throw new Error("Photographs are read inside SitePhotosProvider, which the root layout renders.");
  }
  return context;
}

/** What the site shows: collections, slideshow, install pages, and the rest. */
export function useSiteView(): SiteView {
  const { view, want } = useSitePhotosContext();
  useEffect(want, [want]);
  return view;
}

/**
 * What the deployed pages were built with. The photo manager uses it to tell
 * which stored files the live HTML still points at, so it never deletes one
 * a page in the current deployment would then show as broken.
 */
export function useBuiltPhotoSet(): PhotoSet {
  return useSitePhotosContext().built;
}
