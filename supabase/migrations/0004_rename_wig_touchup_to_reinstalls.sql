-- ============================================================================
-- CROWNED BY NAT - 0004 - rename the Wig Touch-up service to Reinstalls
-- ============================================================================
-- The customer-facing name of the third install type changes; its key does
-- not. 'wig-touch-up' stays the identifier everywhere it is one - the services
-- row, /installs/wig-touch-up/, lib/taxonomy.ts's InstallTypeId - so nothing
-- that books against it or links to it can break. This migration only touches
-- the word a visitor reads, in the one place the database owns that word: the
-- `services` row 0003 seeds, which lib/catalog.ts serves to /book and to the
-- booking flow once a Supabase project is connected (see lib/catalog.ts).
--
-- The static fallback in lib/content.ts is already renamed in the same change
-- and needs no migration; it is what the site shows until the live rows land.
--
-- Re-runnable, like the other three. Apply it the same way: Supabase
-- dashboard -> SQL editor -> Run, or `supabase db push`. Safe to run against a
-- database that never applied 0003, since the update matches no rows then.
-- ============================================================================

update public.services
  set name = 'Reinstalls'
  where slug = 'wig-touch-up';
