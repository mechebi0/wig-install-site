-- ===========================================================================
-- CROWNED BY NAT - accounts, locations, services and appointments
-- ===========================================================================
-- Run this once in the Supabase SQL editor (or `supabase db push`).
-- It is written to be re-runnable: every object is created with `if not
-- exists` or dropped first, so applying it twice is a no-op rather than a
-- pile of duplicate-object errors.
--
-- THE SECURITY MODEL IN ONE PARAGRAPH
-- The website is a static export. There is no server of ours between the
-- browser and the database, so the browser talks to PostgREST directly with
-- the anon key, and EVERY authorisation rule lives here rather than in the
-- React code. Hiding a button in the UI is a courtesy; these policies are the
-- actual control. Anything the policies below permit, a determined visitor
-- holding the anon key can do, and anything they forbid cannot be done from
-- the browser at all. That is the property the whole design is built around.
--
-- WHAT THE BROWSER IS TRUSTED WITH WHEN BOOKING
-- Almost nothing. A booking insert carries a service id, a location id, a
-- date, a time and contact details. The price, the duration, the display
-- names, the status and every timestamp are derived HERE by
-- before_appointment_write(), so a forged request cannot book an inactive
-- service, invent a short duration to slip past the overlap constraint, or
-- write itself straight to `confirmed`.
-- ===========================================================================

-- gen_random_uuid()
create extension if not exists pgcrypto with schema extensions;
-- btree_gist lets the no-double-booking EXCLUDE constraint combine a uuid
-- equality test with a time-range overlap test in one index.
create extension if not exists btree_gist with schema extensions;

-- Both live in `extensions`, which is the Supabase convention, and the
-- EXCLUDE constraint below needs btree_gist's uuid operator class to be
-- RESOLVABLE at the moment the constraint is created. Supabase's default
-- search_path for the postgres role already includes `extensions`, so this is
-- usually redundant; it is here because when it is not redundant the failure
-- is "data type uuid has no default operator class for access method gist",
-- which reads like a Postgres version problem rather than a search_path one
-- and would cost somebody an afternoon.
set search_path = public, extensions;


-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $enums$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('customer', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum (
      'pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'
    );
  end if;
end
$enums$;


-- ---------------------------------------------------------------------------
-- BUSINESS CONFIGURATION
-- ---------------------------------------------------------------------------
-- Both studios are in Maryland, so one zone covers the business. It is a
-- function rather than a literal sprinkled through the file because
-- `appointment_date` and `appointment_time` are wall-clock values: turning
-- them into an instant requires a zone, and that decision should exist in
-- exactly one place.
create or replace function public.business_timezone()
returns text
language sql
immutable
as $fn$ select 'America/New_York'::text $fn$;


-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
-- One row per authenticated user, created by trigger from auth.users. The
-- `role` column is the entire admin/customer distinction, which is why it is
-- defended in three separate places: the trigger that creates the row always
-- writes 'customer', an update trigger rejects any client-side change to it,
-- and no policy anywhere grants a customer write access to another row.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  phone      text,
  role       public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx  on public.profiles (role);


-- ---------------------------------------------------------------------------
-- LOCATIONS
-- ---------------------------------------------------------------------------
-- Where Crowned by Nat is currently taking appointments. `active` is the switch
-- the homepage strip and the booking flow both read; it is never hard-coded
-- into a page. All four states the brief asks for fall out of two booleans:
-- Towson only, Laurel only, both, neither.
create table if not exists public.locations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  city          text not null,
  state         text not null,
  active        boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------------------------
-- `price_cents` and `duration_minutes` are nullable on purpose: a service with
-- no confirmed price is a real state, and saying so is more honest than
-- fabricating a number. `pricing_confirmed` stays false until Nat confirms the
-- figure, and the admin UI shows an explicit "placeholder" badge while it is.
create table if not exists public.services (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  description       text not null default '',
  price_cents       integer check (price_cents is null or price_cents >= 0),
  duration_minutes  integer check (duration_minutes is null or duration_minutes between 15 and 600),
  pricing_confirmed boolean not null default false,
  active            boolean not null default true,
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- APPOINTMENTS
-- ---------------------------------------------------------------------------
-- Guest bookings and customer bookings are the same row shape. `customer_id`
-- is set for an authenticated booking and null for a guest one, and the check
-- constraint makes exactly one of those two identities mandatory.
--
-- WHY THE SNAPSHOT COLUMNS EXIST
-- `service_name_snapshot`, `location_name_snapshot` and `price_cents_snapshot`
-- are written once, at booking time, from the referenced rows. They are what
-- guarantees the rule that a Towson appointment stays a Towson appointment
-- after Nat switches the site to Laurel: the appointment carries its own
-- history and never derives it from the current global setting. The foreign
-- keys are `on delete restrict` for the same reason, so a location with
-- appointments against it cannot vanish out from under them.
create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  reference   text not null unique,

  -- Exactly one of these two identities. See appointments_identity_check.
  customer_id uuid references public.profiles (id) on delete set null,
  guest_name  text,
  guest_email text,
  guest_phone text,

  service_id  uuid not null references public.services  (id) on delete restrict,
  location_id uuid not null references public.locations (id) on delete restrict,

  -- Frozen at booking time. Never recomputed. See note above.
  service_name_snapshot  text not null,
  location_name_snapshot text not null,
  price_cents_snapshot   integer,

  appointment_date date not null,
  appointment_time time not null,
  duration_minutes integer not null default 60,

  -- Derived from the three columns above by before_appointment_write(), so the
  -- overlap constraint has real instants to work with.
  starts_at timestamptz not null,
  ends_at   timestamptz not null,

  status public.appointment_status not null default 'pending',
  notes  text,

  -- Rescheduling is a REQUEST, not a customer-side mutation. See the note on
  -- protect_appointment_columns() for why.
  reschedule_requested_at timestamptz,
  reschedule_note         text,

  admin_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint appointments_identity_check check (
    customer_id is not null
    or (
      guest_name is not null and length(btrim(guest_name)) >= 2
      and guest_email is not null
        and guest_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
      and guest_phone is not null
        and length(regexp_replace(guest_phone, '\D', '', 'g')) between 10 and 15
    )
  ),

  -- Half-hour grid inside plausible studio hours. The precise weekday grid
  -- lives in the app because it is business configuration that changes; this
  -- is the floor that stops a hand-rolled request booking 03:17.
  constraint appointments_slot_grid_check check (
    extract(minute from appointment_time) in (0, 30)
    and extract(second from appointment_time) = 0
    and appointment_time >= time '08:00'
    and appointment_time <= time '19:00'
  ),

  constraint appointments_range_check check (ends_at > starts_at)
);

create index if not exists appointments_customer_idx on public.appointments (customer_id);
create index if not exists appointments_date_idx     on public.appointments (appointment_date desc, appointment_time desc);
create index if not exists appointments_status_idx   on public.appointments (status);
create index if not exists appointments_guest_email_idx
  on public.appointments (lower(guest_email)) where customer_id is null;

-- THE DOUBLE-BOOKING GUARD.
-- Not advisory, not a client-side check: Postgres refuses the write. Two
-- appointments at the same location whose [starts_at, ends_at) ranges touch
-- cannot both exist while either is live. Cancelled and completed rows fall
-- out of the constraint, so cancelling a 2pm frees 2pm immediately.
do $overlap$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_no_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_overlap
      exclude using gist (
        location_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('pending', 'confirmed', 'rescheduled'));
  end if;
end
$overlap$;


-- ===========================================================================
-- FUNCTIONS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- is_admin()
-- ---------------------------------------------------------------------------
-- The single source of truth for "is the caller Nat". Every admin policy in
-- this file calls it and nothing else.
--
-- SECURITY DEFINER is load bearing twice over. It lets the function read
-- profiles without tripping the RLS policy that is itself defined in terms of
-- this function (infinite recursion otherwise), and it means a customer cannot
-- influence the answer by any means available to them: the only input is
-- auth.uid(), which comes from the JWT Supabase signed.
--
-- search_path is pinned so a caller cannot shadow `profiles` with a temp table
-- of their own and have the definer-privileged body read it instead.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$fn$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- generate_appointment_reference()
-- ---------------------------------------------------------------------------
-- The human-readable code on a booking confirmation, e.g. CBN-K7Q3MX.
--
-- Random rather than sequential, from an alphabet with the characters people
-- misread removed (no O/0, no I/1/L, no S/5, no B/8, no Z/2). 26^6 is about
-- 309 million, so guessing one is not a practical attack even if there were
-- something to guess it AT. There is not: no policy in this file grants read
-- access to an appointment by reference, precisely so this code can never
-- become a bearer token. It is a number to quote to Nat, nothing more.
create or replace function public.generate_appointment_reference()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $fn$
declare
  alphabet constant text := 'ACDEFGHJKMNPQRTUVWXY34679';
  candidate text;
begin
  loop
    candidate := 'CBN-';
    for i in 1 .. 6 loop
      candidate := candidate
        || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public.appointments a where a.reference = candidate
    );
  end loop;
  return candidate;
end
$fn$;

revoke all on function public.generate_appointment_reference() from public;


-- ---------------------------------------------------------------------------
-- touch_updated_at()
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;


-- ---------------------------------------------------------------------------
-- handle_new_user()
-- ---------------------------------------------------------------------------
-- Creates the profile row for a new signup.
--
-- `role` is the literal 'customer'. It is NOT read from raw_user_meta_data,
-- and that is the whole point: raw_user_meta_data is attacker-controlled (it
-- is whatever the browser passed to signUp), so a signup that posts
-- {"role":"admin"} gets a customer profile like everybody else. There is no
-- code path from the public signup form to an admin role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------------
-- sync_profile_email()
-- ---------------------------------------------------------------------------
-- Keeps profiles.email in step when a user changes their address in Supabase
-- Auth, so the admin customer list never shows a stale one.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  update public.profiles
     set email = new.email, updated_at = now()
   where id = new.id
     and email is distinct from new.email;
  return new;
end
$fn$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();


-- ---------------------------------------------------------------------------
-- claim_guest_appointments()
-- ---------------------------------------------------------------------------
-- ACCOUNT CONVERSION. Someone books as a guest in March, decides in June to
-- make an account, and expects March to be there. This attaches those rows to
-- the new profile instead of leaving a duplicate customer record behind.
--
-- WHY IT ONLY FIRES ON THE CONFIRMATION TRANSITION
-- Matching on email address means "prove you own the address" is the entire
-- security check, so it has to be a real proof. The trigger is AFTER UPDATE
-- and requires email_confirmed_at to have just gone from null to non-null,
-- which only happens when Supabase processed a click on a confirmation link
-- sent to that address.
--
-- If email confirmation is switched OFF in the Supabase dashboard, Supabase
-- sets email_confirmed_at during the INSERT instead, that transition never
-- occurs, and this trigger simply never runs. The failure mode is "old guest
-- bookings are not linked automatically", which is a mild inconvenience, and
-- NOT "anyone who types your email address inherits your appointment history".
-- Failing in that direction is the reason it is written this way.
create or replace function public.claim_guest_appointments()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.appointments a
       set customer_id = new.id,
           updated_at  = now()
     where a.customer_id is null
       and lower(a.guest_email) = lower(new.email);
  end if;
  return new;
end
$fn$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.claim_guest_appointments();


-- ---------------------------------------------------------------------------
-- protect_profile_columns()
-- ---------------------------------------------------------------------------
-- RLS grants access per ROW; it cannot say "this row, but not that column".
-- A customer legitimately needs to update their own profile (name, phone), and
-- that same policy would otherwise let them set role = 'admin' on themselves.
-- This trigger is the column-level half of the rule, and it is enforced in the
-- database rather than by omitting the field from a form.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  new.updated_at := now();

  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Account role cannot be changed.'
      using errcode = '42501';
  end if;

  -- Identity columns are owned by Supabase Auth, not by this table.
  new.id         := old.id;
  new.email      := old.email;
  new.created_at := old.created_at;

  return new;
end
$fn$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();


-- ---------------------------------------------------------------------------
-- before_appointment_write()
-- ---------------------------------------------------------------------------
-- Everything the browser is NOT trusted to tell us is decided here.
--
-- On insert the service and location are re-read from their own tables, so
-- the display names, the price and the duration on the appointment are the
-- real ones rather than whatever was posted. Both must be active, the slot
-- must be in the future, and the status is forced to 'pending' for anyone who
-- is not Nat. starts_at / ends_at are computed in the studio's timezone, which
-- is what the overlap constraint indexes.
create or replace function public.before_appointment_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  svc public.services%rowtype;
  loc public.locations%rowtype;
  caller_is_admin boolean := public.is_admin();
begin
  select * into svc from public.services  where id = new.service_id;
  select * into loc from public.locations where id = new.location_id;

  if svc.id is null then
    raise exception 'That service does not exist.' using errcode = '23503';
  end if;
  if loc.id is null then
    raise exception 'That location does not exist.' using errcode = '23503';
  end if;

  if tg_op = 'INSERT' then
    if not caller_is_admin then
      if not svc.active then
        raise exception 'That service is not currently bookable.'
          using errcode = '42501';
      end if;
      if not loc.active then
        raise exception 'That location is not currently taking appointments.'
          using errcode = '42501';
      end if;
      -- Nat can back-fill a walk-in she has already done; nobody else can
      -- book the past.
      new.status := 'pending';
    end if;

    new.reference              := public.generate_appointment_reference();
    new.service_name_snapshot  := svc.name;
    new.location_name_snapshot := loc.name || ', ' || loc.state;
    new.price_cents_snapshot   := svc.price_cents;
    new.duration_minutes       := coalesce(svc.duration_minutes, 60);
    new.created_at             := now();

    -- Closed Sunday and Monday. Kept here because it is stable business
    -- configuration; the per-day opening grid stays in the app where it can
    -- be edited without a migration. Nat is exempt: if she opens on a Sunday
    -- for one client, the database should not be the thing that argues.
    if not caller_is_admin
       and extract(isodow from new.appointment_date) in (7, 1) then
      raise exception 'The studio is closed on that day.' using errcode = '23514';
    end if;
  end if;

  new.starts_at := (new.appointment_date + new.appointment_time)
                     at time zone public.business_timezone();
  new.ends_at   := new.starts_at + make_interval(mins => new.duration_minutes);
  new.updated_at := now();

  if tg_op = 'INSERT' and not caller_is_admin and new.starts_at <= now() then
    raise exception 'That appointment time has already passed.'
      using errcode = '23514';
  end if;

  return new;
end
$fn$;


-- ---------------------------------------------------------------------------
-- protect_appointment_columns()
-- ---------------------------------------------------------------------------
-- The customer-side column guard, and the reason rescheduling is a REQUEST.
--
-- Letting a customer move their own appointment means letting the browser
-- write appointment_date and appointment_time. Two customers editing at once
-- would race the overlap constraint, one would get a raw Postgres error, and
-- Nat would find her day rearranged without being asked. So a customer may do
-- exactly three things to their own booking: cancel it, leave a note, and ask
-- for a different time. Nat performs the actual move from the admin dashboard,
-- where the overlap constraint is the same but the person deciding is the
-- person whose day it is.
--
-- Everything else is reset to its previous value rather than rejected, so a
-- client that sends the whole row back (which PostgREST clients do) is not
-- punished for sending unchanged fields.
create or replace function public.protect_appointment_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  cancel_cutoff constant interval := interval '24 hours';
begin
  if public.is_admin() then
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status <> 'cancelled' then
      raise exception 'An appointment can only be cancelled from your account.'
        using errcode = '42501';
    end if;
    if old.status not in ('pending', 'confirmed', 'rescheduled') then
      raise exception 'This appointment can no longer be cancelled.'
        using errcode = '42501';
    end if;
    if old.starts_at - now() < cancel_cutoff then
      raise exception 'Cancellations close 24 hours before the appointment. Call the studio.'
        using errcode = '42501';
    end if;
  end if;

  -- Frozen for anyone who is not Nat.
  new.id                     := old.id;
  new.reference              := old.reference;
  new.customer_id            := old.customer_id;
  new.guest_name             := old.guest_name;
  new.guest_email            := old.guest_email;
  new.guest_phone            := old.guest_phone;
  new.service_id             := old.service_id;
  new.location_id            := old.location_id;
  new.service_name_snapshot  := old.service_name_snapshot;
  new.location_name_snapshot := old.location_name_snapshot;
  new.price_cents_snapshot   := old.price_cents_snapshot;
  new.appointment_date       := old.appointment_date;
  new.appointment_time       := old.appointment_time;
  new.duration_minutes       := old.duration_minutes;
  new.starts_at              := old.starts_at;
  new.ends_at                := old.ends_at;
  new.admin_note             := old.admin_note;
  new.created_at             := old.created_at;

  return new;
end
$fn$;

-- Ordering matters and is bought with the names: Postgres fires BEFORE
-- triggers alphabetically, so `a_...` recomputes derived columns and `b_...`
-- then rolls back anything a customer was not allowed to touch.
drop trigger if exists a_appointments_before_write on public.appointments;
create trigger a_appointments_before_write
  before insert or update on public.appointments
  for each row execute function public.before_appointment_write();

drop trigger if exists b_appointments_protect_columns on public.appointments;
create trigger b_appointments_protect_columns
  before update on public.appointments
  for each row execute function public.protect_appointment_columns();

drop trigger if exists locations_touch_updated_at on public.locations;
create trigger locations_touch_updated_at
  before update on public.locations
  for each row execute function public.touch_updated_at();

drop trigger if exists services_touch_updated_at on public.services;
create trigger services_touch_updated_at
  before update on public.services
  for each row execute function public.touch_updated_at();


-- ---------------------------------------------------------------------------
-- booked_slots()
-- ---------------------------------------------------------------------------
-- The booking calendar has to know which times are gone, and the person using
-- it is usually not logged in. Opening appointments to anonymous SELECT would
-- hand every visitor the studio's client list, so instead this returns the
-- times and nothing else: no names, no emails, no phone numbers, no service,
-- no reference. SECURITY DEFINER because the caller has, correctly, no read
-- access to the table it reads.
create or replace function public.booked_slots(p_location_id uuid, p_date date)
returns table (slot_time time, slot_minutes integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select a.appointment_time, a.duration_minutes
  from public.appointments a
  where a.location_id = p_location_id
    and a.appointment_date = p_date
    and a.status in ('pending', 'confirmed', 'rescheduled');
$fn$;

revoke all on function public.booked_slots(uuid, date) from public;
grant execute on function public.booked_slots(uuid, date) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- create_guest_appointment()
-- ---------------------------------------------------------------------------
-- The entire anonymous write surface of this database, in one function.
--
-- A guest needs their confirmation code back, and a PostgREST insert only
-- returns the created row to a caller that also holds SELECT on the table.
-- Granting anon SELECT on appointments would publish the studio's client list,
-- so the guest path is a function instead: it inserts, and it returns the code
-- and the details of THAT booking and nothing else. No filter, no offset, no
-- way to ask it about a row you did not just create.
--
-- Every validation still applies. This function is SECURITY DEFINER, so it
-- does not go through RLS -- but the checks that matter were never in RLS to
-- begin with. before_appointment_write() re-reads the service and location and
-- refuses inactive ones, forces status to 'pending', derives the price,
-- duration and display names server-side, and rejects a past date. The table
-- constraints then enforce the contact details, the half-hour grid, and the
-- no-overlap rule. Nothing here trusts an argument it was handed.
create or replace function public.create_guest_appointment(
  p_service_id  uuid,
  p_location_id uuid,
  p_date        date,
  p_time        time,
  p_name        text,
  p_email       text,
  p_phone       text,
  p_notes       text default null
)
returns json
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $fn$
declare
  created      public.appointments%rowtype;
  clean_email  text := lower(btrim(coalesce(p_email, '')));
  clean_phone  text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  recent_count integer;
begin
  -- A public unauthenticated write is a spam surface. This is not a complete
  -- answer to that (see the note in supabase/README.md about Turnstile), but
  -- it does cap what a naive script achieves: three live requests per hour per
  -- email address or phone number, which is well above any real customer.
  select count(*) into recent_count
    from public.appointments a
   where a.customer_id is null
     and a.created_at > now() - interval '1 hour'
     and (
       lower(a.guest_email) = clean_email
       or regexp_replace(a.guest_phone, '\D', '', 'g') = clean_phone
     );

  if recent_count >= 3 then
    raise exception 'Too many booking requests from these details. Call the studio and Nat will sort it out.'
      using errcode = 'P0001';
  end if;

  insert into public.appointments (
    customer_id, guest_name, guest_email, guest_phone,
    service_id, location_id, appointment_date, appointment_time, notes,
    -- Placeholders. before_appointment_write() overwrites all five before the
    -- row is checked or stored; they exist only because the columns are NOT
    -- NULL and a BEFORE trigger cannot supply a value that was never in NEW.
    reference, service_name_snapshot, location_name_snapshot, starts_at, ends_at
  )
  values (
    null, btrim(p_name), clean_email, btrim(p_phone),
    p_service_id, p_location_id, p_date, p_time,
    nullif(btrim(coalesce(p_notes, '')), ''),
    '', '', '', now(), now() + interval '1 hour'
  )
  returning * into created;

  return json_build_object(
    'reference',   created.reference,
    'service',     created.service_name_snapshot,
    'location',    created.location_name_snapshot,
    'date',        created.appointment_date,
    'time',        created.appointment_time,
    'duration',    created.duration_minutes,
    'price_cents', created.price_cents_snapshot,
    'status',      created.status
  );
end
$fn$;

revoke all on function public.create_guest_appointment(uuid, uuid, date, time, text, text, text, text) from public;
grant execute on function public.create_guest_appointment(uuid, uuid, date, time, text, text, text, text)
  to anon, authenticated;


-- ---------------------------------------------------------------------------
-- admin_stats()
-- ---------------------------------------------------------------------------
-- Dashboard counters in one round trip instead of five. It is admin-only and
-- says so itself rather than relying on the caller to check first.
create or replace function public.admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  return json_build_object(
    'upcoming', (
      select count(*) from public.appointments
      where status in ('pending', 'confirmed', 'rescheduled')
        and starts_at >= now()
    ),
    'pending', (
      select count(*) from public.appointments where status = 'pending'
    ),
    'reschedule_requests', (
      select count(*) from public.appointments
      where reschedule_requested_at is not null
        and status in ('pending', 'confirmed', 'rescheduled')
    ),
    'completed_this_month', (
      select count(*) from public.appointments
      where status = 'completed'
        and starts_at >= date_trunc('month', now())
    ),
    'customers', (
      select count(*) from public.profiles where role = 'customer'
    ),
    'guest_bookings', (
      select count(*) from public.appointments where customer_id is null
    )
  );
end
$fn$;

revoke all on function public.admin_stats() from public;
grant execute on function public.admin_stats() to authenticated;


-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.profiles     enable row level security;
alter table public.locations    enable row level security;
alter table public.services     enable row level security;
alter table public.appointments enable row level security;

-- FORCE ROW LEVEL SECURITY is deliberately NOT set, and that is worth a note
-- so it does not get "fixed" later. FORCE subjects the table OWNER to the
-- policies as well. The owner here is `postgres`, which is also who runs
-- handle_new_user(), claim_guest_appointments() and create_guest_appointment()
-- -- all SECURITY DEFINER, all doing work no policy is written to allow
-- (creating a profile before the user has a session; attaching a guest row to
-- a newly confirmed account). Turning FORCE on breaks every one of them.
--
-- It costs nothing in the threat model that matters. `anon` and
-- `authenticated` are not the owner, so FORCE changes nothing for a browser;
-- the only thing it constrains is trusted server-side code that already had to
-- be reviewed by hand. ENABLE is what stops the internet. This is ENABLEd.

-- --- profiles ---------------------------------------------------------------
drop policy if exists "profiles: read own or admin"    on public.profiles;
drop policy if exists "profiles: insert self"          on public.profiles;
drop policy if exists "profiles: update own or admin"  on public.profiles;

create policy "profiles: read own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- A repair path only. The row is normally created by handle_new_user(); this
-- covers a profile that went missing without needing service-role access.
-- `role = 'customer'` in the check means it cannot be used to mint an admin.
create policy "profiles: insert self"
  on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'customer');

-- Column-level restriction is protect_profile_columns(), above.
create policy "profiles: update own or admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No delete policy at all. Removing a customer is done through Supabase Auth,
-- which cascades to this table.

-- --- locations --------------------------------------------------------------
drop policy if exists "locations: public reads active" on public.locations;
drop policy if exists "locations: admin reads all"     on public.locations;
drop policy if exists "locations: admin writes"        on public.locations;

-- The homepage strip and the booking flow both run before login, so this has
-- to reach `anon`. Only active rows: an inactive location is not something a
-- visitor should be able to see, and historical appointments read their
-- location from their own snapshot column instead.
create policy "locations: public reads active"
  on public.locations for select to anon, authenticated
  using (active = true);

create policy "locations: admin reads all"
  on public.locations for select to authenticated
  using (public.is_admin());

create policy "locations: admin writes"
  on public.locations for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- services ---------------------------------------------------------------
drop policy if exists "services: public reads active" on public.services;
drop policy if exists "services: admin reads all"     on public.services;
drop policy if exists "services: admin writes"        on public.services;

create policy "services: public reads active"
  on public.services for select to anon, authenticated
  using (active = true);

create policy "services: admin reads all"
  on public.services for select to authenticated
  using (public.is_admin());

create policy "services: admin writes"
  on public.services for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --- appointments -----------------------------------------------------------
drop policy if exists "appointments: read own or admin"   on public.appointments;
drop policy if exists "appointments: guest can book"      on public.appointments;
drop policy if exists "appointments: customer can book"   on public.appointments;
drop policy if exists "appointments: update own or admin" on public.appointments;
drop policy if exists "appointments: admin deletes"       on public.appointments;

-- THE ONE THAT MATTERS. `customer_id = auth.uid()` is why a customer cannot
-- read anybody else's booking, and there is no policy granting `anon` SELECT
-- at all, which is why a guest booking is not readable by the public even
-- with its reference in hand.
create policy "appointments: read own or admin"
  on public.appointments for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

-- There is NO anon policy on this table. Guests book through the
-- create_guest_appointment() RPC below instead, and the reasoning is worth
-- recording: a PostgREST insert only returns the new row if the caller also
-- holds SELECT, and SELECT for anon on appointments is exactly the thing that
-- must never exist. Rather than trade the guest's confirmation code away, the
-- guest path moves to a function that inserts and hands back only that code.
-- `anon` therefore has no direct privilege on this table in any direction.

create policy "appointments: customer can book"
  on public.appointments for insert to authenticated
  with check (
    (customer_id = auth.uid() or public.is_admin())
    and (status = 'pending' or public.is_admin())
    and (
      public.is_admin()
      or (
        appointment_date >= (now() at time zone public.business_timezone())::date
        and exists (select 1 from public.services  s where s.id = service_id  and s.active)
        and exists (select 1 from public.locations l where l.id = location_id and l.active)
      )
    )
  );

-- Column-level restriction is protect_appointment_columns(), above: this
-- policy decides WHICH rows, that trigger decides WHICH COLUMNS.
create policy "appointments: update own or admin"
  on public.appointments for update to authenticated
  using (customer_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or public.is_admin());

-- Customers cancel, they do not delete. History is the point.
create policy "appointments: admin deletes"
  on public.appointments for delete to authenticated
  using (public.is_admin());


-- ===========================================================================
-- GRANTS
-- ===========================================================================
-- RLS narrows what a role can reach; it does not grant the underlying table
-- privilege. These are the coarse grants, and every one of them is filtered by
-- a policy above. Note what is absent: no select for anon on appointments, and
-- no delete for anyone but through the admin policy.
grant usage on schema public to anon, authenticated;

-- anon gets exactly two tables, read only, and both are filtered to `active`
-- rows by policy. It gets NOTHING on profiles and NOTHING on appointments.
grant select on public.locations, public.services to anon;

grant select on public.locations, public.services to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant insert, update, delete on public.locations, public.services to authenticated;


-- ===========================================================================
-- SEED
-- ===========================================================================
-- The two Maryland locations. Towson starts active and Laurel starts inactive
-- purely so the site has a coherent state the moment the migration lands; Nat
-- changes both from the admin dashboard and this block never runs again.
insert into public.locations (slug, name, city, state, active, display_order)
values
  ('towson', 'Towson', 'Towson', 'MD', true,  1),
  ('laurel', 'Laurel', 'Laurel', 'MD', false, 2)
on conflict (slug) do nothing;

-- The four services already on the site, carried over verbatim from
-- lib/content.ts including its PLACEHOLDER prices and durations. They are
-- seeded with pricing_confirmed = false, which is what makes the admin
-- dashboard show a "placeholder" badge beside each one. Confirm the real
-- figures with Nat and flip that flag; do not treat these as her prices.
insert into public.services
  (slug, name, description, price_cents, duration_minutes, pricing_confirmed, active, display_order)
values
  ('frontal', 'Full frontal install',
   'Lace tinted to your skin, knots bleached, hairline plucked and cut. Includes the style you leave in.',
   18000, 120, false, true, 1),
  ('closure', 'Closure install',
   'Less lace to manage, lower upkeep, and gentler on a tender scalp.',
   14000, 90, false, true, 2),
  ('custom', 'Customization only',
   'Plucking, tinting, and bleaching on a unit you already own. Drop it off or wait for it.',
   9500, 75, false, true, 3),
  ('refresh', 'Reinstall and refresh',
   'Full takedown, scalp cleanse, and a fresh lay on the same unit.',
   7000, 60, false, true, 4)
on conflict (slug) do nothing;


-- ===========================================================================
-- ADMIN PROMOTION
-- ===========================================================================
-- Nat's account is promoted here rather than anywhere in the application,
-- because a signup form that can produce an admin is a signup form an attacker
-- can produce an admin with. There is deliberately no UI, no API and no
-- self-service path for this: the only way to become an admin is for someone
-- with database access to run this statement.
--
-- It is a no-op until the account exists. ORDER OF OPERATIONS:
--   1. Nat signs up at /signup with crownedbynattt@gmail.com
--   2. she confirms the address from her inbox
--   3. run the statement below (SQL editor -> Run). Re-running is harmless.
--
-- If you applied this migration before Nat signed up, that is fine and
-- expected: come back and run just this one statement afterwards.
update public.profiles
   set role = 'admin', updated_at = now()
 where lower(email) = lower('crownedbynattt@gmail.com')
   and role <> 'admin';

-- Verify (should return exactly one row, role = admin):
--   select email, role from public.profiles where role = 'admin';
