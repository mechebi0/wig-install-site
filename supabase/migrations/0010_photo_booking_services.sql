-- ============================================================================
-- CROWNED BY NAT - 0010 - which booking pages show each photograph
-- ============================================================================
-- Every service now has its own booking page, /book/<service>/: the service
-- the visitor chose, photographs of it, and the Square scheduler. This adds
-- the one thing the database could not say yet: which of the seven services
-- a photograph shows.
--
-- It is a column of its own rather than a reading of what is already there.
-- The install type says frontal, closure or Reinstalls, which cannot tell a
-- plain frontal from a colour frontal, or a frontal reinstall from a closure
-- one, and has no word at all for Wig Touch Up. The collections are styles,
-- not services. So Nat ticks the services herself, under "Booking pages" in
-- the photo manager, and nothing is worked out from a file name or a title.
--
-- SAFE TO RUN AT ANY TIME, BEFORE OR AFTER THE SITE THAT READS IT. Until this
-- has run, the site places photographs by the same rule the seed below
-- writes (launchBookingServices in lib/site-photos.ts), so running it changes
-- nothing a visitor sees. What it changes is that Nat can then choose.
--
-- Apply it after 0007, the same way as the others: Supabase dashboard -> SQL
-- editor -> paste -> Run. Re-running it is harmless.
--
-- ----------------------------------------------------------------------------
-- WHO MAY CHANGE IT
-- ----------------------------------------------------------------------------
-- Nothing new. It is a column of gallery_items, so that table's policies
-- decide, exactly as they do for the install type beside it: the public
-- reads published rows, and only the owner (public.is_admin(), 0006) writes.
-- ============================================================================

do $guard$
begin
  if to_regclass('public.site_photo_slots') is null then
    raise exception 'Run 0007_website_photos.sql before this file.';
  end if;
end
$guard$;


-- ----------------------------------------------------------------------------
-- 1. The column
-- ----------------------------------------------------------------------------
-- services.slug values, the same words as SERVICES in lib/content.ts. Empty
-- means "on no booking page", which is where every photograph starts unless
-- the seed below places it.
alter table public.gallery_items
  add column if not exists booking_services text[] not null default '{}';

alter table public.gallery_items drop constraint if exists gallery_items_booking_services_check;
alter table public.gallery_items add constraint gallery_items_booking_services_check
  check (booking_services <@ array[
    'frontal-install', 'closure-install',
    'frontal-reinstall', 'closure-reinstall',
    'color-frontal-install', 'color-closure-install',
    'wig-touch-up'
  ]::text[]);

comment on column public.gallery_items.booking_services is
  'Services (services.slug) whose booking page, /book/<slug>/, shows this photograph. Chosen by the owner in the photo manager.';


-- ----------------------------------------------------------------------------
-- 2. Where each photograph starts, once
-- ----------------------------------------------------------------------------
-- The rule the site already uses while this column is missing, so nothing
-- moves when it arrives:
--
--   install type frontal   Frontal Install, or Color Frontal Install when the
--                          photograph is in Color & Custom
--   install type closure   Closure Install, or Color Closure Install, alike
--   anything else          nothing. A frame cannot say which of the two
--                          reinstalls it was (a reinstall page shows the
--                          Reinstalls photographs until Nat ticks one), and
--                          nothing says a photograph shows a Wig Touch Up
--
-- RUNS ONCE, EVER, for the reason 0007's seed does: run again after Nat had
-- taken a photograph off a booking page, it would quietly put it back. The
-- marker is written in the same transaction as the seed.
do $seed$
begin
  if exists (select 1 from public.business_settings where key = 'booking_services_seeded') then
    raise notice 'The booking pages were seeded before; leaving them as they are.';
    return;
  end if;

  update public.gallery_items g
     set booking_services = array[
           case
             when g.install_type = 'frontal' and colour.coloured then 'color-frontal-install'
             when g.install_type = 'frontal'                     then 'frontal-install'
             when colour.coloured                                then 'color-closure-install'
             else                                                     'closure-install'
           end
         ]::text[]
    from (
      select i.id,
             exists (
               select 1
                 from public.gallery_item_categories link
                 join public.gallery_categories c on c.id = link.category_id
                where link.item_id = i.id
                  and c.slug = 'color-and-custom'
             ) as coloured
        from public.gallery_items i
    ) as colour
   where colour.id = g.id
     and g.install_type in ('frontal', 'closure')
     and g.booking_services = '{}';

  insert into public.business_settings (key, value)
  values ('booking_services_seeded', to_jsonb(now()));
end
$seed$;


-- Tell the API about the new column now rather than on its next schema poll,
-- so the photo manager can save it the moment this finishes.
notify pgrst, 'reload schema';


-- ----------------------------------------------------------------------------
-- Verify (each should return what the comment says)
-- ----------------------------------------------------------------------------
--   select title, install_type, booking_services
--     from public.gallery_items order by display_order;
--     -> each frontal photograph on {frontal-install}, or on
--        {color-frontal-install} if it is in Color & Custom (at launch:
--        Burgundy Curl, Candy Pink, Platinum Straight); the same for any
--        closure photographs; everything else {}
--   select value from public.business_settings where key = 'booking_services_seeded';
--     -> one timestamp
