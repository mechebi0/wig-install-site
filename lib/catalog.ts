"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Location, Service } from "@/lib/supabase/types";
import {
  SERVICES as STATIC_SERVICES,
  SERVICE_CATEGORIES,
  type ServiceEntry,
} from "@/lib/content";
import type { InstallTypeId } from "@/lib/taxonomy";

/**
 * Locations and services: the two things the public site reads before anyone
 * has logged in.
 *
 * ---------------------------------------------------------------------------
 * WHY THE STATIC LIST IS STILL HERE
 * ---------------------------------------------------------------------------
 * The database is the authority. It is not the only source.
 *
 * This is a static export, so there is no server render to fetch during: the
 * HTML ships first and the query runs afterwards in the browser. If the
 * services list rendered empty until that query came back, /book would open on
 * a blank price panel and a search engine would index a page with no prices on
 * it. So the five services in lib/content.ts are the FIRST FRAME, matched to
 * the seed rows by slug, and the live rows replace them as soon as they land.
 * `live` says which of the two you are looking at.
 *
 * Locations get no such fallback, and the asymmetry is deliberate. A stale
 * service description is cosmetic. A stale LOCATION is the site telling
 * someone a town is open when it is not, which is exactly the failure the
 * brief asks to eliminate. Where the location is unknown the UI shows nothing
 * rather than a guess.
 */

export type CatalogService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number | null;
  duration_minutes: number | null;
  pricing_confirmed: boolean;
  active: boolean;
  display_order: number;
  /** False while this is the built-in fallback rather than a database row. */
  live: boolean;
  /** The category this service is filed under on the site. "" when unknown. */
  category: string;
  /**
   * The finish axis this service belongs to, or null when it has no finish to
   * choose. What decides whether the booking flow asks for a finish.
   */
  installType: InstallTypeId | null;
};

/**
 * The compiled-in services, in the CatalogService shape.
 *
 * `id` falls back to the slug, which is safe precisely because it is NOT a
 * uuid: it can never be mistaken for a real primary key, and any attempt to
 * book against one is rejected by the foreign key. The booking flow refuses to
 * submit while `live` is false for that reason.
 */
export const FALLBACK_SERVICES: CatalogService[] = STATIC_SERVICES.map(
  (service, index) => ({
    id: service.id,
    slug: service.id,
    name: service.name,
    description: service.body,
    price_cents: service.priceCents,
    duration_minutes: service.durationMinutes,
    pricing_confirmed: false,
    active: true,
    display_order: index + 1,
    live: false,
    category: service.category,
    installType: service.installType,
  }),
);

function toCatalogService(row: Service): CatalogService {
  /*
    The database row carries no install type or category of its own, so both
    are recovered from the compiled-in catalog by slug. The slugs are seeded
    from this same array (see supabase/migrations), so a live row's slug is a
    catalog id and the lookup matches. A service Nat adds from the dashboard
    later has no catalog entry and reads as no-category, no-finish, which is
    the honest default for something this file has never seen.
  */
  const entry: ServiceEntry | undefined = STATIC_SERVICES.find(
    (service) => service.id === row.slug,
  );
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price_cents: row.price_cents,
    duration_minutes: row.duration_minutes,
    pricing_confirmed: row.pricing_confirmed,
    active: row.active,
    display_order: row.display_order,
    live: true,
    category: entry?.category ?? "",
    installType: entry?.installType ?? null,
  };
}

/**
 * Services grouped under the categories the customer sees, in SERVICE_CATEGORIES
 * order, each keeping the catalog's own order inside it.
 *
 * Anything without a known category (a row Nat adds from the dashboard, or a
 * live row from before migration 0005 renamed the slugs) goes in a trailing
 * group with category "" rather than being dropped, so the menu can never
 * quietly hide a service the database says is bookable.
 */
export function groupByCategory(
  services: CatalogService[],
): { category: string; items: CatalogService[] }[] {
  const groups = SERVICE_CATEGORIES.map((category) => ({
    category,
    items: services.filter((service) => service.category === category),
  }));
  const other = services.filter(
    (service) => !SERVICE_CATEGORIES.includes(service.category),
  );
  return [...groups, { category: "", items: other }].filter(
    (group) => group.items.length > 0,
  );
}

/**
 * Active services, starting from the static list and upgrading to live rows.
 *
 * Only `active` rows come back, and that is enforced by policy rather than by
 * this filter: anon and authenticated can only SELECT services where active is
 * true. The `.eq` below is a hint to the query planner, not the control.
 */
export function useServices() {
  const supabase = useMemo(() => getSupabase(), []);
  const [services, setServices] = useState<CatalogService[]>(FALLBACK_SERVICES);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let live = true;

    supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data, error: queryError }) => {
        if (!live) return;
        if (queryError) {
          // Keep the fallback on screen. A visitor should still see the menu.
          setError(queryError.message);
        } else if (data && data.length > 0) {
          setServices((data as Service[]).map(toCatalogService));
        }
        setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [supabase]);

  return { services, loading, error };
}

/**
 * Active locations.
 *
 * `status` is what callers branch on, and the four states are all real:
 *   loading       the query is in flight, show nothing rather than a guess
 *   unconfigured  no Supabase project; the feature is simply not on
 *   ready         locations.length is 0, 1 or 2 and all of them are open
 *   error         could not reach the database, say so rather than imply closed
 */
export type LocationsStatus = "loading" | "unconfigured" | "ready" | "error";

export function useActiveLocations() {
  const supabase = useMemo(() => getSupabase(), []);
  const [locations, setLocations] = useState<Location[]>([]);
  const [status, setStatus] = useState<LocationsStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );

  useEffect(() => {
    if (!supabase) return;
    let live = true;

    supabase
      .from("locations")
      .select("*")
      .eq("active", true)
      .order("display_order", { ascending: true })
      .then(({ data, error }) => {
        if (!live) return;
        if (error) {
          setStatus("error");
          return;
        }
        setLocations((data as Location[]) ?? []);
        setStatus("ready");
      });

    return () => {
      live = false;
    };
  }, [supabase]);

  return { locations, status };
}

/**
 * "Towson, MD" for one, "Towson & Laurel, MD" for two sharing a state.
 *
 * The shared-state case is why this is not a join on a template string: the
 * brief's own example is "TOWSON & LAUREL, MD", singular state, and printing
 * "Towson, MD & Laurel, MD" instead reads like a directory listing rather than
 * a piece of brand copy.
 */
export function formatLocationList(
  locations: ReadonlyArray<Pick<Location, "name" | "state">>,
): string {
  if (locations.length === 0) return "";

  const states = new Set(locations.map((location) => location.state));
  if (states.size === 1) {
    const names = locations.map((location) => location.name);
    const joined =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
    return `${joined}, ${locations[0].state}`;
  }

  return locations
    .map((location) => `${location.name}, ${location.state}`)
    .join(" & ");
}

/*
  The announcement stripe used to read the `locations` table here too. It now
  prints the locations published from the dashboard, built into the page
  (components/announcement-marquee.tsx), the same list as the footer and /book,
  so the public site no longer reads this table at all. useActiveLocations
  stays for the dormant booking flow.
*/
