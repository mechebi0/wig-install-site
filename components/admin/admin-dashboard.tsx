"use client";

import { useState } from "react";
import {
  CalendarBlank,
  Gauge,
  MapPin,
  Scissors,
  SignOut,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { Guarded } from "@/components/auth/guarded";
import { Wordmark } from "@/components/wordmark";
import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminAppointments } from "@/components/admin/admin-appointments";
import { AdminLocations } from "@/components/admin/admin-locations";
import { AdminServices } from "@/components/admin/admin-services";
import { AdminCustomers } from "@/components/admin/admin-customers";
import { signOut } from "@/lib/auth/session";
import { ADMIN_PATH, leaveTo } from "@/lib/auth/redirect";
import { formatLocationList, useActiveLocations } from "@/lib/catalog";

/**
 * Nat's dashboard.
 *
 * ---------------------------------------------------------------------------
 * A BUSINESS PORTAL, NOT A STARTER TEMPLATE
 * ---------------------------------------------------------------------------
 * The generic version of this screen is a dark sidebar, four gradient stat
 * cards with sparklines nobody reads, and a table with a search box. It looks
 * like every admin panel because it IS every admin panel, and the brief rules
 * it out twice.
 *
 * What is here instead:
 *   - the same blush paper, wine ink and single rose accent as the public
 *     site. Nat's back office should look like her business, not like a
 *     different product she also has to log into
 *   - the display serif for headings and numbers, so the dashboard reads as
 *     Crowned by Nat before it reads as software
 *   - density where density is useful (the appointment list) and space where
 *     it is not (the overview). An operations screen earns its density by
 *     being scanned twenty times a day; a summary read once does not
 *   - no charts. Nat has, at most, a few appointments a day. A line graph of
 *     six data points is decoration pretending to be insight
 *
 * ---------------------------------------------------------------------------
 * WHY THE TAB LIVES IN THE URL HASH
 * ---------------------------------------------------------------------------
 * So that a refresh, a bookmark or a shared link lands back on the right
 * panel. It has to be the hash rather than a query string or a route segment,
 * for two reasons: `useSearchParams` needs a Suspense boundary under
 * `output: "export"` and returns nothing useful on a static page anyway, and
 * five real routes would mean five prerendered HTML files of a dashboard that
 * renders nothing until it has a session.
 *
 * The hash is never trusted as anything but a tab name. It is matched against
 * the known list and ignored otherwise, so `#<img onerror=...>` selects the
 * overview like any other unrecognised value.
 */
const TABS = [
  { id: "overview", label: "Overview", Icon: Gauge },
  { id: "appointments", label: "Appointments", Icon: CalendarBlank },
  { id: "locations", label: "Locations", Icon: MapPin },
  { id: "services", label: "Services", Icon: Scissors },
  { id: "customers", label: "Customers", Icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function AdminDashboard() {
  return (
    /*
      A neutral heading. It is the h1 an uninvited visitor sees, so it says the
      brand and nothing about what is behind it: no "Admin", no "Dashboard", no
      confirmation that a privileged area exists here at all.
    */
    <Guarded requireAdmin returnTo={ADMIN_PATH} heading="Crowned by Nat">
      {() => <Portal />}
    </Guarded>
  );
}

function Portal() {
  /*
    Read straight out of the URL in the initialiser rather than synced in an
    effect, so the correct panel is in the FIRST render instead of appearing
    after a flash of the overview.

    Safe to touch `window` here even though the site is statically exported:
    Portal only mounts once Guarded has a session, which is strictly after
    hydration, so this render never has to match a prerendered one. The
    `typeof` check covers the case of somebody rendering it somewhere else.

    The hash is matched against the known ids and ignored otherwise, so it is
    never treated as anything but a tab name.
  */
  const [tab, setTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "overview";
    const fromHash = window.location.hash.replace(/^#/, "");
    return isTabId(fromHash) ? fromHash : "overview";
  });
  const { locations, status: locationsStatus } = useActiveLocations();

  function goTo(next: TabId) {
    setTab(next);
    // replaceState, not a hash assignment: this should not stack five history
    // entries between Nat and the page she came from.
    window.history.replaceState(null, "", `#${next}`);
  }

  const activeLabel =
    locationsStatus !== "ready"
      ? "—"
      : locations.length > 0
        ? formatLocationList(locations)
        : "None open";

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:pb-28 lg:pt-14">
      {/* ------------------------------------------------------- header --- */}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
        {/*
          One h1, carrying both lines. The wordmark alone is not a heading and
          "Admin dashboard" alone is not the brand, so the two are one element
          and a screen reader gets "Crowned by Nat, Admin dashboard" as the page
          title rather than a decorative span followed by an orphaned label.
        */}
        <h1>
          <Wordmark className="text-2xl text-ink" />
          <span className="label mt-3 block text-accent">Admin dashboard</span>
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
          >
            View the site
          </a>
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => leaveTo("/"));
            }}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm text-muted transition-colors hover:text-accent"
          >
            <SignOut size={17} weight="regular" aria-hidden="true" />
            Log out
          </button>
        </div>
      </header>

      <div className="grid gap-8 pt-8 lg:grid-cols-[15rem_1fr] lg:gap-12 lg:pt-10">
        {/* ------------------------------------------------------ nav --- */}
        {/*
          min-w-0, and it is load bearing on a phone. A grid track sized `auto`
          takes its minimum from the min-content of its items rather than from
          the container, so the five nowrap tab buttons inside measured 663px
          and pushed the whole dashboard 328px past a 375px viewport. The
          horizontally scrolling <ul> below did not save it, because the track
          had already been sized around it.

          This is the same trap the hero grid documents; the panel beside this
          one already carried min-w-0 and was being stretched by this column.
        */}
        <div className="min-w-0">
          {/*
            Sticky at desktop, offset by the site nav's own height so it never
            slides underneath it. Scrolling a hundred appointments should not
            take the navigation away with it.
          */}
          <nav
            aria-label="Dashboard"
            className="lg:sticky lg:top-[calc(72px+1.5rem)]"
          >
            {/*
              A horizontal rail below lg. Real tabs, kept scrollable rather
              than wrapped, so the row height never changes as the labels grow.
            */}
            <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
              {TABS.map(({ id, label, Icon }) => {
                const current = tab === id;
                return (
                  <li key={id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => goTo(id)}
                      aria-current={current ? "page" : undefined}
                      className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full px-4 text-sm transition-colors duration-200 lg:px-4 ${
                        current
                          ? "bg-accent text-on-accent"
                          : "text-muted hover:bg-surface-2 hover:text-ink"
                      }`}
                    >
                      <Icon size={17} weight="regular" aria-hidden="true" />
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/*
              The one number Nat needs on every screen, because it is the one
              that changes what the public site says about her business.
            */}
            <div className="mt-6 hidden rounded-3xl border border-line-strong bg-surface p-5 lg:block">
              <p className="label text-muted">Now serving</p>
              <p className="mt-3 font-display text-xl leading-snug tracking-tight text-ink">
                {activeLabel}
              </p>
              <button
                type="button"
                onClick={() => goTo("locations")}
                className="mt-4 cursor-pointer text-sm text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
              >
                Change
              </button>
            </div>
          </nav>
        </div>

        {/* -------------------------------------------------- the panel --- */}
        <div className="min-w-0">
          {tab === "overview" ? <AdminOverview onGoTo={goTo} /> : null}
          {tab === "appointments" ? <AdminAppointments /> : null}
          {tab === "locations" ? <AdminLocations /> : null}
          {tab === "services" ? <AdminServices /> : null}
          {tab === "customers" ? <AdminCustomers /> : null}
        </div>
      </div>
    </div>
  );
}

export type AdminTabId = TabId;
