"use client";

import type { PostgrestError } from "@supabase/supabase-js";
import { requireSupabase } from "@/lib/supabase/client";
import type {
  Appointment,
  AppointmentStatus,
  BookedSlot,
  GuestBookingReceipt,
} from "@/lib/supabase/types";

/**
 * Every write and read against `appointments`, in one file.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT HERE
 * ---------------------------------------------------------------------------
 * Authorisation. Not one function below checks who is calling, and that is
 * correct rather than an oversight: the checks live in the row level security
 * policies and the trigger functions in supabase/migrations/, where they apply
 * to any caller rather than only to callers who came through this file. A
 * customer asking for another customer's appointment gets an empty result
 * because Postgres filtered it, not because a line here declined to ask.
 *
 * This file's job is the other half: turning a database refusal back into a
 * sentence a person can act on.
 */

/**
 * Postgres speaks in SQLSTATE codes and constraint names. Customers do not.
 *
 * Two categories are handled differently on purpose:
 *
 *   messages this codebase wrote     raised by our own trigger functions with
 *                                    RAISE EXCEPTION, already in plain English
 *                                    ("Cancellations close 24 hours before the
 *                                    appointment"), so they are passed through
 *
 *   messages Postgres wrote          "new row for relation appointments
 *                                    violates check constraint
 *                                    appointments_slot_grid_check", which tells
 *                                    a customer nothing and tells an attacker
 *                                    the shape of the schema. Replaced.
 *
 * 23P01 is the one worth knowing by name. It is the exclusion constraint that
 * enforces no double booking, and it fires when two people pick the same slot
 * within the same second. Both of them saw it as free; one of them is about to
 * find out otherwise, and this is the sentence they get.
 */
export function appointmentErrorMessage(error: PostgrestError | null): string {
  if (!error) return "";

  const raw = error.message ?? "";
  const looksInternal =
    /violates|constraint|relation|row-level security|permission denied|duplicate key/i.test(
      raw,
    );

  switch (error.code) {
    case "23P01":
      return "Someone just took that slot. Pick another time and it will go straight through.";
    case "23505":
      return "That booking looks like it already went through. Check your email before trying again.";
    case "23514":
      return "That date and time are outside the studio's hours. Pick another slot.";
    case "23503":
      return "That service or location is no longer available. Start again and you will see what is open.";
    case "42501":
    case "P0001":
      // Our own RAISE EXCEPTION text, unless Postgres wrote it.
      return looksInternal
        ? "That is not something this account can do."
        : raw;
    case "PGRST301":
    case "401":
      return "Your session has expired. Log in again and your appointments will be here.";
    default:
      if (!raw || looksInternal) {
        return "That did not save. Try again, or call the studio and Nat will sort it out.";
      }
      return raw;
  }
}

export type BookingInput = {
  serviceId: string;
  locationId: string;
  /** "2026-09-18" */
  date: string;
  /** "14:00" */
  time: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
};

/**
 * Guest booking, through the create_guest_appointment RPC.
 *
 * The RPC exists because `anon` has no privilege on the appointments table at
 * all, in either direction, and a plain insert could therefore never return
 * the confirmation reference. See the long note on that function in the
 * migration.
 */
export async function bookAsGuest(
  input: BookingInput,
): Promise<{ receipt: GuestBookingReceipt | null; error: string }> {
  const supabase = requireSupabase();

  const { data, error } = await supabase.rpc("create_guest_appointment", {
    p_service_id: input.serviceId,
    p_location_id: input.locationId,
    p_date: input.date,
    p_time: input.time,
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone,
    p_notes: input.notes ?? null,
  });

  if (error) return { receipt: null, error: appointmentErrorMessage(error) };
  return { receipt: data as GuestBookingReceipt, error: "" };
}

/**
 * Booking as a signed-in customer, through a direct insert.
 *
 * Unlike the guest path this CAN come straight back, because an authenticated
 * customer has a SELECT policy covering their own rows. `customer_id` is sent,
 * but sending someone else's would be refused by the insert policy's
 * `customer_id = auth.uid()` check, so the value here is a convenience rather
 * than a claim being trusted.
 *
 * Notice what is NOT sent: no price, no duration, no service or location name,
 * no status, no timestamps. before_appointment_write() derives every one of
 * them from the referenced rows, which is why a customer cannot book a two
 * hour frontal in a one hour gap by lying about the duration.
 */
export async function bookAsCustomer(
  customerId: string,
  input: BookingInput,
): Promise<{ appointment: Appointment | null; error: string }> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      customer_id: customerId,
      service_id: input.serviceId,
      location_id: input.locationId,
      appointment_date: input.date,
      appointment_time: input.time,
      notes: input.notes?.trim() || null,
      // Placeholders. The trigger overwrites all five before the row is
      // stored; they exist because the columns are NOT NULL.
      reference: "",
      service_name_snapshot: "",
      location_name_snapshot: "",
      starts_at: new Date().toISOString(),
      ends_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { appointment: null, error: appointmentErrorMessage(error) };
  return { appointment: data as Appointment, error: "" };
}

/** Which times at this location on this day are already spoken for. */
export async function fetchBookedSlots(
  locationId: string,
  date: string,
): Promise<BookedSlot[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("booked_slots", {
    p_location_id: locationId,
    p_date: date,
  });
  if (error) return [];
  return (data as BookedSlot[]) ?? [];
}

/**
 * The signed-in customer's own appointments.
 *
 * There is no `.eq("customer_id", ...)` here, and its absence is deliberate:
 * the SELECT policy already restricts this to `customer_id = auth.uid()`, so
 * adding the filter would imply the filter is what provides the security. It
 * is not. Remove the policy and this query returns everything; remove this
 * line and it returns exactly the same rows.
 */
export async function fetchMyAppointments(): Promise<{
  appointments: Appointment[];
  error: string;
}> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  if (error) return { appointments: [], error: appointmentErrorMessage(error) };
  return { appointments: (data as Appointment[]) ?? [], error: "" };
}

/**
 * Cancels an appointment.
 *
 * The 24 hour cutoff and the "only cancellation is permitted" rule are both
 * enforced by protect_appointment_columns(), so a customer editing this call
 * in devtools to set 'confirmed' instead gets an exception rather than a
 * confirmed appointment.
 */
export async function cancelAppointment(
  id: string,
): Promise<{ error: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" as AppointmentStatus })
    .eq("id", id);

  return { error: appointmentErrorMessage(error) };
}

/**
 * Asks Nat for a different time.
 *
 * A REQUEST, not a move. The customer never writes appointment_date or
 * appointment_time; the trigger resets both to their old values for anyone who
 * is not an admin. The reasoning is written up on that trigger, and it comes
 * down to this: two customers rescheduling into the same gap would race the
 * overlap constraint and one would meet a raw database error, and Nat would
 * find her day rearranged by someone who cannot see the rest of it.
 */
export async function requestReschedule(
  id: string,
  note: string,
): Promise<{ error: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("appointments")
    .update({
      reschedule_requested_at: new Date().toISOString(),
      reschedule_note: note.trim() || null,
    })
    .eq("id", id);

  return { error: appointmentErrorMessage(error) };
}

/** Cancelling closes 24 hours out. Mirrors the cutoff in the SQL trigger. */
export const CANCEL_CUTOFF_HOURS = 24;

export function canCancel(appointment: Appointment): boolean {
  if (!["pending", "confirmed", "rescheduled"].includes(appointment.status)) {
    return false;
  }
  const lead = new Date(appointment.starts_at).getTime() - Date.now();
  return lead > CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;
}
