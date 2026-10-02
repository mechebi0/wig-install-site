-- ============================================================================
-- CROWNED BY NAT - 0005 - the real service catalog, prices and booking hours
-- ============================================================================
-- The placeholder services seeded in 0001 and 0003 are replaced by the seven
-- services on the pricing reference Nat supplied, at the prices on it. This
-- migration is what brings a connected Supabase project in step with the
-- website, which has already been showing these prices from lib/content.ts.
--
-- THE SEVEN, AND WHAT HAPPENS TO THE OLD ROWS
-- The old slugs were frontal, closure, wig-touch-up, custom and refresh. The
-- new catalog files the same work under seven slugs:
--
--   frontal-install        was frontal        $100, 120 min (duration kept)
--   closure-install        was closure         $90,  90 min (duration kept)
--   wig-touch-up           was wig-touch-up    $35,  45 min (duration kept)
--   frontal-reinstall       new                $90,  no duration confirmed yet
--   closure-reinstall      new                $80,  no duration confirmed yet
--   color-frontal-install  new                $135, no duration confirmed yet
--   color-closure-install  new                $125, no duration confirmed yet
--
-- The two old rows that are not on the reference (custom, refresh) are
-- deactivated rather than deleted: an appointment already booked against one
-- of them keeps its foreign key, and Nat can reactivate either from the
-- dashboard if she ever offers them again.
--
-- The three that are kept are updated in place (same row, same uuid, new slug
-- and price), so any appointment already pointing at them is untouched.
--
-- pricing_confirmed is set to true for all seven. These are Nat's real
-- prices, not the stand-ins 0001 seeded, and the admin dashboard's
-- "placeholder" badge is for figures nobody has confirmed.
--
-- THE BOOKING HOURS
-- The slot grid floor moves from 08:00-19:00 to 08:00-23:00. The booking
-- window is now 10:00-21:00, and the two time-window add-ons book either side
-- of it (Early Bird before 10:00, After Hours after 21:00), so the floor has
-- to span the whole bookable day or it would refuse the after-hours slots the
-- calendar offers. The half-hour grid and the closed Sunday/Monday rule are
-- unchanged.
--
-- Re-runnable, like the other four. Apply it the same way: Supabase
-- dashboard -> SQL editor -> Run, or `supabase db push`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The booking window the calendar offers, as a coarse database floor.
-- ---------------------------------------------------------------------------
alter table public.appointments drop constraint if exists appointments_slot_grid_check;
alter table public.appointments add constraint appointments_slot_grid_check check (
  extract(minute from appointment_time) in (0, 30)
  and extract(second from appointment_time) = 0
  and appointment_time >= time '08:00'
  and appointment_time <= time '23:00'
);

-- ---------------------------------------------------------------------------
-- The three kept services: new slug, new price, confirmed.
-- ---------------------------------------------------------------------------
update public.services
   set slug = 'frontal-install',
       name = 'Frontal Install',
       description = 'Lace tinted to your skin, knots bleached, hairline plucked and cut. Includes the style you leave in.',
       price_cents = 10000,
       duration_minutes = 120,
       pricing_confirmed = true,
       display_order = 1,
       updated_at = now()
 where slug = 'frontal';

update public.services
   set slug = 'closure-install',
       name = 'Closure Install',
       description = 'Less lace to manage, lower upkeep, and gentler on a tender scalp.',
       price_cents = 9000,
       duration_minutes = 90,
       pricing_confirmed = true,
       display_order = 2,
       updated_at = now()
 where slug = 'closure';

-- The old wig-touch-up row was the generic reinstall. The reference splits
-- that into a frontal and a closure reinstall (inserted below) and files a
-- separate $35 Wig Touch Up under Services, so this row becomes that service.
update public.services
   set name = 'Wig Touch Up',
       description = 'Curls reset, waves refreshed, or a new style on a unit you already have.',
       price_cents = 3500,
       duration_minutes = 45,
       pricing_confirmed = true,
       display_order = 7,
       updated_at = now()
 where slug = 'wig-touch-up';

-- ---------------------------------------------------------------------------
-- The four new services.
--
-- display_order follows the order the customer sees them: the two wig
-- installs, the two reinstalls, the two colour services, then Wig Touch Up.
-- Durations are NULL where the reference does not supply one; the booking
-- flow reads that as its 60 minute default and the admin dashboard can fill
-- it in. A made-up duration would reserve the wrong length of slot.
-- ---------------------------------------------------------------------------
insert into public.services
  (slug, name, description, price_cents, duration_minutes, pricing_confirmed, active, display_order)
values
  ('frontal-reinstall', 'Frontal Reinstall',
   'A fresh lay on a unit you already have, with a frontal lace. The parting, melt and edges are all redone.',
   9000, null, true, true, 3),
  ('closure-reinstall', 'Closure Reinstall',
   'A fresh lay on a unit you already have, with a closure. Quicker than a frontal, with less lace to redo.',
   8000, null, true, true, 4),
  ('color-frontal-install', 'Color Frontal Install',
   'A frontal install with custom color, cut and finish. Bring a reference or describe the look you are after.',
   13500, null, true, true, 5),
  ('color-closure-install', 'Color Closure Install',
   'A closure install with custom color, cut and finish. Bring a reference or describe the look you are after.',
   12500, null, true, true, 6)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- The two services that are not on the reference: deactivated, not deleted.
-- ---------------------------------------------------------------------------
update public.services set active = false, updated_at = now() where slug = 'custom';
update public.services set active = false, updated_at = now() where slug = 'refresh';

-- ---------------------------------------------------------------------------
-- Laurel is open again (it was paused in 0001 and confirmed in lib/content.ts).
-- The site reads active rows, so this is what makes both towns bookable.
-- ---------------------------------------------------------------------------
update public.locations set active = true, updated_at = now() where slug = 'laurel';
