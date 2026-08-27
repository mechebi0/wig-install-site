"use client";

import { requireSupabase } from "@/lib/supabase/client";
import { appointmentErrorMessage } from "@/lib/appointments";
import type {
  AdminStats,
  Appointment,
  AppointmentStatus,
  AppointmentWithCustomer,
  Location,
  Profile,
  Service,
} from "@/lib/supabase/types";

/**
 * Everything the admin dashboard reads and writes.
 *
 * ---------------------------------------------------------------------------
 * NONE OF THIS CHECKS WHETHER THE CALLER IS NAT
 * ---------------------------------------------------------------------------
 * Not one function below asks. They are all ordinary queries, and if a
 * customer imported this file and called every one of them, they would get
 * empty arrays and permission errors rather than the studio's books.
 *
 * That is because `is_admin()` gates all of it inside Postgres:
 *
 *   fetchAllLocations / fetchAllServices   the public policy only exposes
 *                                          rows where active is true; the
 *                                          inactive ones a customer cannot see
 *                                          simply are not in the result
 *   fetchAppointments                      the select policy is
 *                                          `customer_id = auth.uid() OR
 *                                          is_admin()`, so a customer calling
 *                                          this gets their own bookings
 *   fetchCustomers                         same shape on profiles
 *   every write                            `using/with check (is_admin())`,
 *                                          which fails the statement
 *   fetchAdminStats                        the RPC raises 'Not authorised'
 *                                          itself rather than trusting anyone
 *
 * Adding a role check here would be a UX improvement at best and a dangerous
 * false comfort at worst, because the next person to add a function would
 * assume the check in the file is what does the work.
 */

// ---------------------------------------------------------------- overview ---

export async function fetchAdminStats(): Promise<{
  stats: AdminStats | null;
  error: string;
}> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) return { stats: null, error: appointmentErrorMessage(error) };
  return { stats: data as AdminStats, error: "" };
}

// --------------------------------------------------------------- locations ---

/** All of them, active or not. A customer calling this sees only the active. */
export async function fetchAllLocations(): Promise<{
  locations: Location[];
  error: string;
}> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return { locations: [], error: appointmentErrorMessage(error) };
  return { locations: (data as Location[]) ?? [], error: "" };
}

/**
 * Opens or closes a studio.
 *
 * This is the switch behind the homepage strip and the booking flow, and it is
 * the ONLY thing that changes when Nat moves. Existing appointments are
 * untouched: each one carries its own location_name_snapshot, written when it
 * was booked, so switching the site to Laurel does not relabel a single Towson
 * booking. That property is a column, not a convention.
 */
export async function setLocationActive(
  id: string,
  active: boolean,
): Promise<{ error: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("locations").update({ active }).eq("id", id);
  return { error: appointmentErrorMessage(error) };
}

// ---------------------------------------------------------------- services ---

export async function fetchAllServices(): Promise<{
  services: Service[];
  error: string;
}> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return { services: [], error: appointmentErrorMessage(error) };
  return { services: (data as Service[]) ?? [], error: "" };
}

export type ServicePatch = Partial<
  Pick<
    Service,
    | "name"
    | "description"
    | "price_cents"
    | "duration_minutes"
    | "pricing_confirmed"
    | "active"
    | "display_order"
  >
>;

export async function updateService(
  id: string,
  patch: ServicePatch,
): Promise<{ error: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("services").update(patch).eq("id", id);
  return { error: appointmentErrorMessage(error) };
}

// ------------------------------------------------------------ appointments ---

export type AppointmentScope = "upcoming" | "today" | "pending" | "past" | "all";

/**
 * The books.
 *
 * The customer profile is joined in rather than fetched separately, because
 * the guest columns are null for an authenticated booking and the name has to
 * come from somewhere. PostgREST resolves `profiles(...)` through the
 * appointments.customer_id foreign key; for a guest booking it comes back null
 * and the guest_* columns carry the details instead.
 *
 * Sorted ascending for upcoming views and descending for historical ones,
 * because "the next thing" and "the last thing" are the two questions being
 * asked and they want opposite ends of the list first.
 */
export async function fetchAppointments(scope: AppointmentScope): Promise<{
  appointments: AppointmentWithCustomer[];
  error: string;
}> {
  const supabase = requireSupabase();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("appointments")
    .select("*, profiles(id, full_name, email, phone)");

  switch (scope) {
    case "upcoming":
      query = query
        .gte("starts_at", nowIso)
        .in("status", ["pending", "confirmed", "rescheduled"])
        .order("starts_at", { ascending: true });
      break;
    case "today": {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      query = query
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at", { ascending: true });
      break;
    }
    case "pending":
      query = query
        .eq("status", "pending")
        .order("starts_at", { ascending: true });
      break;
    case "past":
      query = query
        .lt("starts_at", nowIso)
        .order("starts_at", { ascending: false });
      break;
    default:
      query = query.order("starts_at", { ascending: false });
  }

  const { data, error } = await query.limit(200);

  if (error) return { appointments: [], error: appointmentErrorMessage(error) };
  return { appointments: (data as AppointmentWithCustomer[]) ?? [], error: "" };
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<{ error: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id);
  return { error: appointmentErrorMessage(error) };
}

/**
 * Moves an appointment. Admin only, and the only place a date or time on an
 * existing appointment can change.
 *
 * `reschedule_requested_at` is cleared in the same statement: the request has
 * now been dealt with, and leaving the flag set would keep the "asked to move
 * it" badge on a booking that has already been moved. Status goes to
 * 'rescheduled' so the customer's own view says what happened.
 *
 * The no-overlap constraint applies to Nat exactly as it does to everyone
 * else, so moving one appointment on top of another is refused here too. That
 * is deliberate: the one person who should never accidentally double-book
 * herself is the person doing the work.
 */
export async function rescheduleAppointment(
  id: string,
  date: string,
  time: string,
): Promise<{ appointment: Appointment | null; error: string }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      appointment_date: date,
      appointment_time: time,
      status: "rescheduled" as AppointmentStatus,
      reschedule_requested_at: null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { appointment: null, error: appointmentErrorMessage(error) };
  return { appointment: data as Appointment, error: "" };
}

export async function setAdminNote(
  id: string,
  note: string,
): Promise<{ error: string }> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from("appointments")
    .update({ admin_note: note.trim() || null })
    .eq("id", id);
  return { error: appointmentErrorMessage(error) };
}

// --------------------------------------------------------------- customers ---

export async function fetchCustomers(): Promise<{
  customers: Profile[];
  error: string;
}> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return { customers: [], error: appointmentErrorMessage(error) };
  return { customers: (data as Profile[]) ?? [], error: "" };
}

/** Name to show for a booking, whoever made it. */
export function bookingName(appointment: AppointmentWithCustomer): string {
  return (
    appointment.profiles?.full_name?.trim() ||
    appointment.guest_name?.trim() ||
    appointment.profiles?.email ||
    appointment.guest_email ||
    "Unnamed booking"
  );
}

export function bookingEmail(appointment: AppointmentWithCustomer): string {
  return appointment.profiles?.email ?? appointment.guest_email ?? "";
}

export function bookingPhone(appointment: AppointmentWithCustomer): string {
  return appointment.profiles?.phone ?? appointment.guest_phone ?? "";
}

/** "Account" or "Guest". Nat asked to be able to tell them apart. */
export function bookingType(appointment: AppointmentWithCustomer): "Account" | "Guest" {
  return appointment.customer_id ? "Account" : "Guest";
}
