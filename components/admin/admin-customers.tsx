"use client";

import { useEffect, useMemo, useState } from "react";
import { Envelope, MagnifyingGlass, Phone } from "@phosphor-icons/react/dist/ssr";
import { EmptyState, LoadingPanel, Notice } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/form";
import { fetchAppointments, fetchCustomers } from "@/lib/admin";
import { formatDateMedium } from "@/lib/format";
import type { AppointmentWithCustomer, Profile } from "@/lib/supabase/types";

/**
 * Who books with Crown by Nat.
 *
 * ---------------------------------------------------------------------------
 * TWO KINDS OF CUSTOMER, ONE LIST
 * ---------------------------------------------------------------------------
 * Someone with an account is a row in `profiles`. Someone who booked as a
 * guest is not: they exist only as the contact details on their appointment.
 * Showing only the first list would tell Nat she has four customers when she
 * has thirty, so guests are folded in from their bookings and deduplicated by
 * email address.
 *
 * A guest who later signs up with the same address stops being a guest here
 * automatically, because claim_guest_appointments() attaches their old
 * bookings to the new profile and the appointment's customer_id stops being
 * null. No merge step, no duplicate, nothing for Nat to tidy up.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SEARCH RUNS IN THE BROWSER
 * ---------------------------------------------------------------------------
 * The list is capped at a few hundred rows and is already in memory. A
 * round trip per keystroke would be slower, and the alternative that is worth
 * building (server-side search) only becomes worth building at a scale a one
 * chair studio will not reach for years. When it does, the query moves and
 * this component barely changes.
 *
 * This screen is read only. Editing a customer's details from here would mean
 * Nat writing to someone else's profile, which the RLS policy does permit for
 * an admin, but there is no reason to: they can edit their own, and a guest
 * has nothing to edit.
 */
type Row = {
  key: string;
  name: string;
  email: string;
  phone: string;
  hasAccount: boolean;
  since: string;
  bookings: number;
};

export function AdminCustomers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;

    Promise.all([fetchCustomers(), fetchAppointments("all")]).then(
      ([customerResult, appointmentResult]) => {
        if (!live) return;
        setProfiles(customerResult.customers);
        setAppointments(appointmentResult.appointments);
        setError(customerResult.error || appointmentResult.error);
        setLoading(false);
      },
    );

    return () => {
      live = false;
    };
  }, []);

  const rows = useMemo(() => {
    const byEmail = new Map<string, Row>();

    for (const profile of profiles) {
      if (profile.role === "admin") continue; // Nat is not her own customer.
      byEmail.set(profile.email.toLowerCase(), {
        key: profile.id,
        name: profile.full_name?.trim() || profile.email,
        email: profile.email,
        phone: profile.phone ?? "",
        hasAccount: true,
        since: profile.created_at,
        bookings: 0,
      });
    }

    for (const appointment of appointments) {
      const email = (
        appointment.profiles?.email ??
        appointment.guest_email ??
        ""
      ).toLowerCase();
      if (!email) continue;

      const existing = byEmail.get(email);
      if (existing) {
        existing.bookings += 1;
        // A guest row picks up a phone number from whichever booking has one.
        if (!existing.phone && appointment.guest_phone) {
          existing.phone = appointment.guest_phone;
        }
        continue;
      }

      byEmail.set(email, {
        key: `guest-${email}`,
        name: appointment.guest_name?.trim() || email,
        email,
        phone: appointment.guest_phone ?? "",
        hasAccount: false,
        since: appointment.created_at,
        bookings: 1,
      });
    }

    return [...byEmail.values()].sort(
      (a, b) => new Date(b.since).getTime() - new Date(a.since).getTime(),
    );
  }, [profiles, appointments]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        row.phone.replace(/\D/g, "").includes(needle.replace(/\D/g, "")),
    );
  }, [rows, query]);

  if (loading) return <LoadingPanel label="Loading your customers" />;

  const withAccounts = rows.filter((row) => row.hasAccount).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-ink lg:text-3xl">
          Customers
        </h2>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted">
          Everyone who has booked, whether they made an account or not.{" "}
          {rows.length > 0 ? (
            <>
              {withAccounts} of {rows.length} have an account.
            </>
          ) : null}
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="max-w-md">
        <TextField
          id="customer-search"
          label="Find someone"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, email or number"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "Nobody by that name." : "No customers yet."}
          body={
            query
              ? "Try part of an email address or a phone number instead."
              : "The first booking that comes in will show up here, guest or not."
          }
        />
      ) : (
        <>
          <p aria-live="polite" className="sr-only">
            {filtered.length} of {rows.length} customers shown
          </p>
          <ul className="overflow-hidden rounded-3xl border border-line-strong bg-surface">
            {filtered.map((row, index) => (
              <li
                key={row.key}
                className={`flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 lg:px-6 ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="min-w-0 flex-1 basis-56">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-base text-ink">{row.name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.1em] ${
                        row.hasAccount
                          ? "border-accent/30 text-accent"
                          : "border-line-strong text-muted"
                      }`}
                    >
                      {row.hasAccount ? "Account" : "Guest"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {row.bookings}{" "}
                    {row.bookings === 1 ? "appointment" : "appointments"} · since{" "}
                    {formatDateMedium(row.since.slice(0, 10))}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {row.phone ? (
                    <a
                      href={`tel:${row.phone.replace(/[^+\d]/g, "")}`}
                      aria-label={`Call ${row.name}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
                    >
                      <Phone size={15} weight="regular" aria-hidden="true" />
                      {row.phone}
                    </a>
                  ) : null}
                  <a
                    href={`mailto:${row.email}`}
                    aria-label={`Email ${row.name}`}
                    className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    <Envelope size={15} weight="regular" aria-hidden="true" />
                    <span className="truncate">{row.email}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="flex items-start gap-2 text-sm leading-relaxed text-muted">
        <MagnifyingGlass
          size={16}
          weight="regular"
          aria-hidden="true"
          className="mt-0.5 shrink-0"
        />
        Guests are matched by email address. When one of them makes an account
        with the same address, their old bookings move across on their own and
        the two rows become one.
      </p>
    </div>
  );
}
