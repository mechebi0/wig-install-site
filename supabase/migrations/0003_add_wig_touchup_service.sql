-- ============================================================================
-- CROWNED BY NAT - 0003 - add the Wig Touch-up service
-- ============================================================================
-- Frontal Install and Closure Install were the only two INSTALL TYPES in
-- lib/taxonomy.ts (fresh installs, each with a required finish). Wig Touch-up
-- joins them as a third: a restyle on a unit already installed, not a fresh
-- one, but booked the same way (a required finish, an optional style note).
-- See the note at the top of lib/taxonomy.ts for why it lives in that same
-- type rather than a parallel one.
--
-- This migration only matters once a Supabase project is actually connected
-- and its `services` table is what the live site reads (see lib/catalog.ts).
-- Until then lib/content.ts's SERVICES array, which already carries this row,
-- is the only thing the static build shows. Apply it the same way as 0001 and
-- 0002: Supabase dashboard -> SQL editor -> Run, or `supabase db push`. It is
-- re-runnable, like the other two.
-- ============================================================================

-- Same placeholder-pricing rule as 0001's seed: carried over verbatim from
-- lib/content.ts, seeded with pricing_confirmed = false so the admin
-- dashboard badges it and nobody mistakes it for a figure Nat has confirmed.
insert into public.services
  (slug, name, description, price_cents, duration_minutes, pricing_confirmed, active, display_order)
values
  ('wig-touch-up', 'Wig Touch-up',
   'Curls reset, waves refreshed, or a new style on a unit you already have.',
   5500, 45, false, true, 3)
on conflict (slug) do nothing;

-- Frontal (1) and Closure (2) keep their places; Wig Touch-up takes 3, the
-- same position it holds in lib/content.ts's SERVICES array, and the two
-- services outside that array move down to keep one shared order across the
-- static fallback and the live table. Written as updates rather than a fresh
-- seed so this is safe to run against a database that already has real rows
-- (and, just as safe, a no-op if 0001's seed was skipped entirely).
update public.services set display_order = 4 where slug = 'custom';
update public.services set display_order = 5 where slug = 'refresh';
