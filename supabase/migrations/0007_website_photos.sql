-- ============================================================================
-- CROWNED BY NAT - 0007 - the website's own photographs, owner-managed
-- ============================================================================
-- Until now the photographs the site launched with were compiled into the
-- code (lib/collections.ts): seventeen in the galleries, plus the homepage's
-- opening photograph, which is in no gallery. Nat could add photographs of
-- her own from /admin/photos/, but those eighteen, which are also the
-- homepage slideshow, every collection's cover, the install pages, the
-- finish swatches, the /book menu and the link previews, could only be
-- changed by a developer.
--
-- This file makes them ordinary rows in the gallery tables 0002 and 0006
-- built for exactly this, so the photo manager can replace, hide, remove,
-- reorder and edit them like any upload, and records which photograph fills
-- each of those places, so they can be changed too. From here on the
-- database decides what the public site shows.
--
-- Apply it after 0001-0006, the same way: Supabase dashboard -> SQL editor ->
-- paste -> Run. Re-running it is harmless: the seed below runs once, ever,
-- and everything else is written to be repeated.
--
-- ----------------------------------------------------------------------------
-- THE IMAGE FILES DO NOT MOVE
-- ----------------------------------------------------------------------------
-- Each seeded row points at the file the site already serves from
-- public/images/work/ (`src` has held either a site path or a Storage key
-- since 0002, and the code has always told the two apart). So nothing a
-- visitor sees changes when this runs: same files, same crops, same order.
-- Moving the bytes into Storage needs an owner sign-in or the secret key,
-- and neither belongs in a migration. A photograph moves to Storage the
-- moment Nat replaces it, which uploads the new picture there and repoints
-- the row; the original file is then simply no longer used.
--
-- ----------------------------------------------------------------------------
-- WHO MAY CHANGE ANY OF IT
-- ----------------------------------------------------------------------------
-- Nothing new. Every table here is gated by public.is_admin() (0001, made
-- session-aware in 0006), and the new table gets the same two policies as
-- the others: the public reads what is published, the owner writes.
-- ============================================================================

do $guard$
begin
  if to_regprocedure('public.promote_studio_owner(text)') is null then
    raise exception 'Run 0006_owner_photo_manager.sql before this file.';
  end if;
end
$guard$;


-- ----------------------------------------------------------------------------
-- 1. gallery_items: what the website's own photographs carry
-- ----------------------------------------------------------------------------
-- Four things the compiled-in set had and an upload did not:
--
--   focal_position      the CSS object-position that keeps the face and the
--                       hairline in a cropped cell, measured per photograph.
--                       Null means the default for a phone portrait, which
--                       is what an upload or a replacement gets.
--   featured            shown in the homepage's recent-work rail
--   finish_attributes   the lace details named in the gallery caption.
--                       Natural Lace is not one of them: it is a collection
--                       (gallery_item_categories), so it is stored once.
--   primary_collection  the collection a photograph is filed under where one
--                       label has to be chosen: the homepage rail's caption
--                       and link, and the mix of styles on an install page.
--                       Null means "the first of its collections".
alter table public.gallery_items
  add column if not exists focal_position     text,
  add column if not exists featured           boolean not null default false,
  add column if not exists finish_attributes  text[]  not null default '{}',
  add column if not exists primary_collection text;

alter table public.gallery_items drop constraint if exists gallery_items_focal_position_check;
alter table public.gallery_items add constraint gallery_items_focal_position_check
  check (focal_position is null or focal_position ~ '^(left|center|right|[0-9]{1,3}%) [0-9]{1,3}%$');

alter table public.gallery_items drop constraint if exists gallery_items_finish_attributes_check;
alter table public.gallery_items add constraint gallery_items_finish_attributes_check
  check (finish_attributes <@ array['melted-hairline', 'hd-lace', 'custom-hairline']::text[]);

alter table public.gallery_items drop constraint if exists gallery_items_primary_collection_fkey;
alter table public.gallery_items add constraint gallery_items_primary_collection_fkey
  foreign key (primary_collection) references public.gallery_categories (slug)
  on update cascade on delete set null;

comment on column public.gallery_items.focal_position is
  'CSS object-position for cropped cells, e.g. "center 70%". Null: the default for an upload.';
comment on column public.gallery_items.finish_attributes is
  'Lace details shown in the gallery caption. Natural Lace is a collection, not listed here.';
comment on column public.gallery_items.primary_collection is
  'The collection used where one label is needed (homepage rail, install pages). Null: the first of its collections.';


-- ----------------------------------------------------------------------------
-- 2. site_photo_slots: which photograph fills each fixed place on the site
-- ----------------------------------------------------------------------------
-- The collection covers already have their columns (gallery_categories
-- .hero_item_id and .hover_item_id, from 0002). Everything else that shows
-- one particular photograph is a row here:
--
--   home-1 .. home-6        the homepage slideshow, in order. home-1 is also
--                           the picture in the site's link previews.
--   install-<type>          each install page's photograph (also its link
--                           preview, and its card on the other install pages)
--   finish-<finish>         the finish swatches on the install pages
--   book                    the photograph in the services menu on /book
--   sign-in                 the photograph beside the sign-in forms
--
-- `on delete set null`, like the cover columns: removing a photograph must
-- never remove the place it filled. The site fills an empty or hidden place
-- with another photograph instead (lib/gallery.ts says which).
create table if not exists public.site_photo_slots (
  slot       text primary key,
  item_id    uuid references public.gallery_items (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.site_photo_slots drop constraint if exists site_photo_slots_slot_check;
alter table public.site_photo_slots add constraint site_photo_slots_slot_check
  check (slot in (
    'home-1', 'home-2', 'home-3', 'home-4', 'home-5', 'home-6',
    'install-frontal', 'install-closure', 'install-wig-touch-up',
    'finish-curls', 'finish-wand-curls', 'finish-crimps',
    'book', 'sign-in'
  ));

create index if not exists site_photo_slots_item_idx on public.site_photo_slots (item_id);

drop trigger if exists site_photo_slots_touch on public.site_photo_slots;
create trigger site_photo_slots_touch before update on public.site_photo_slots
  for each row execute function public.touch_updated_at();

alter table public.site_photo_slots enable row level security;

-- Readable when the photograph in it is published, like a collection link
-- (0002): a place filled by a hidden photograph does not even give away
-- that photograph's id.
drop policy if exists site_photo_slots_read_published on public.site_photo_slots;
create policy site_photo_slots_read_published
  on public.site_photo_slots for select
  to anon, authenticated
  using (
    item_id is null
    or exists (
      select 1 from public.gallery_items i
      where i.id = site_photo_slots.item_id and i.active
    )
  );

drop policy if exists site_photo_slots_admin_all on public.site_photo_slots;
create policy site_photo_slots_admin_all
  on public.site_photo_slots for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Explicit grants, as in 0006: this project does not expose new tables to
-- the API by default. RLS above decides which rows.
revoke all on public.site_photo_slots from anon, authenticated;
grant select on public.site_photo_slots to anon, authenticated;
grant insert, update, delete on public.site_photo_slots to authenticated;


-- ----------------------------------------------------------------------------
-- 3. The eighteen photographs, once
-- ----------------------------------------------------------------------------
-- Generated from lib/collections.ts as it stood at launch, so every title,
-- description, tag, measured crop and position is the one the site shows.
--
-- RUNS ONCE, EVER, and that is a safety property rather than a shortcut. The
-- marker below is written in the same transaction as the seed. Without it,
-- running this file a second time after Nat had removed a photograph would
-- quietly put it back on the website, which is the one outcome a removal
-- must never have.
--
-- Any photographs already uploaded keep their order among themselves and
-- move after the eighteen, which is where the site has always shown them.
do $seed$
begin
  if exists (select 1 from public.business_settings where key = 'website_photos_seeded') then
    raise notice 'The website photographs were seeded before; leaving them as they are.';
    return;
  end if;

  with ranked as (
    select id, row_number() over (order by display_order, created_at desc) as position
      from public.gallery_items
  )
  update public.gallery_items g
     set display_order = 18 + ranked.position::integer
    from ranked
   where g.id = ranked.id;

  insert into public.gallery_items
    (src, alt, title, caption, width, height, install_type, active,
     display_order, focal_position, featured, finish_attributes, primary_collection)
  values
    ('/images/work/deep-wave-middle-part.jpg',
     'A waist-length deep-wave install parted in the centre, the lace melted flat at the parting and the edges laid in soft swirls',
     'Waist-Length Deep Wave', 'A centre-parted deep wave taken to the waist, the lace melted flat at the parting and the edges laid in soft swirls.',
     1200, 1600, 'frontal', true, 1, 'center 70%', false, array['melted-hairline', 'custom-hairline']::text[], 'deep-wave-glam'),
    ('/images/work/deep-wave-melted-part.jpg',
     'A long deep-wave install seen straight on, the centre parting sitting flat to the scalp with no visible lace edge',
     'Melted Centre Part', 'A long deep wave seen straight on, the parting sitting flat to the scalp with no visible lace edge.',
     1200, 1600, null, true, 2, 'center 90%', true, array['melted-hairline', 'hd-lace']::text[], 'deep-wave-glam'),
    ('/images/work/deep-wave-crimped-lengths.jpg',
     'A long deep-wave install in natural black, parted down the middle and falling well past the shoulders in tight, defined crimp',
     'Crimped Lengths', 'Natural black deep wave parted down the middle, falling well past the shoulders in a tight, defined crimp.',
     1200, 1600, 'frontal', true, 3, 'center 80%', true, array['melted-hairline', 'custom-hairline']::text[], 'deep-wave-glam'),
    ('/images/work/deep-wave-braided-front.jpg',
     'A deep-wave install with the front section braided back off the face and the baby hairs laid in fine curves along the hairline',
     'Braided Front', 'The front section braided back off the face, with the baby hairs laid in fine curves along the hairline.',
     1200, 1600, 'frontal', true, 4, 'center 40%', false, array['custom-hairline']::text[], 'deep-wave-glam'),
    ('/images/work/deep-wave-long-layers.jpg',
     'A long deep-wave install cut into soft layers, the texture falling forward over both shoulders',
     'Long Layers', 'A long deep wave cut into soft layers, the texture falling forward over both shoulders.',
     1200, 1600, null, true, 5, 'center 75%', false, array['melted-hairline']::text[], 'deep-wave-glam'),
    ('/images/work/deep-wave-shoulder-sweep.jpg',
     'A shoulder-length deep-wave install with a centre parting, the wave pattern loosening from the root down through the ends',
     'Shoulder Sweep', 'A shoulder-length deep wave with a centre parting, the wave pattern loosening from the root through the ends.',
     1200, 1600, null, true, 6, 'center 45%', false, array['melted-hairline']::text[], 'deep-wave-glam'),
    ('/images/work/straight-glass-finish.jpg',
     'A waist-length straight install with a glass-smooth finish, the centre parting laid flat and the ends kept blunt',
     'Glass Finish', 'A waist-length straight install pressed to a glass-smooth finish, the centre parting laid flat and the ends kept blunt.',
     1200, 1600, null, true, 7, 'center 100%', false, array['melted-hairline']::text[], 'sleek-straight'),
    ('/images/work/straight-side-swoop.jpg',
     'A straight install with a deep side parting, one moulded swoop set across the forehead and the edges laid along the hairline',
     'Side Swoop', 'A deep side parting with one moulded swoop set across the forehead and the edges laid along the hairline.',
     1200, 1600, 'frontal', true, 8, 'center 75%', true, array['custom-hairline']::text[], 'sleek-straight'),
    ('/images/work/straight-centre-part.jpg',
     'A long sleek straight install in natural black, pressed smooth from a clean centre parting down to a blunt baseline',
     'Clean Centre Part', 'Pressed smooth from a clean centre parting down to a blunt baseline.',
     1200, 1600, 'frontal', true, 9, 'center 70%', false, array['melted-hairline', 'custom-hairline']::text[], 'sleek-straight'),
    ('/images/work/bob-soft-lob.jpg',
     'A soft lob curved under at the ends, parted at the side, with the baby hairs laid in fine waves',
     'Soft Lob', 'A soft lob curved under at the ends and parted at the side, with the baby hairs laid in fine waves.',
     1200, 1600, 'frontal', true, 10, 'center 70%', false, array['custom-hairline']::text[], 'signature-bob'),
    ('/images/work/bob-blunt-side-part.jpg',
     'A blunt shoulder-skimming bob in natural black, side parted, with a straight and sharply cut baseline',
     'Blunt Bob', 'A blunt shoulder-skimming bob, side parted, cut to a straight and sharply defined baseline.',
     1200, 1600, 'frontal', true, 11, 'center 80%', false, array['custom-hairline']::text[], 'signature-bob'),
    ('/images/work/bob-burgundy-curl.jpg',
     'A chin-length bob in a deep burgundy brown, set into a soft curl and swept away from the face',
     'Burgundy Curl', 'A chin-length bob in a deep burgundy brown, set into a soft curl and swept away from the face.',
     1200, 1600, 'frontal', true, 12, 'center 75%', true, array['melted-hairline']::text[], 'signature-bob'),
    ('/images/work/body-wave-copper.jpg',
     'A bright copper body-wave install with a deep side parting, set into large glossy waves',
     'Copper Body Wave', 'A bright copper body wave with a deep side parting, set into large glossy waves.',
     1200, 1600, null, true, 13, 'center 55%', false, array['melted-hairline']::text[], 'body-wave-glam'),
    ('/images/work/body-wave-side-sweep.jpg',
     'A body-wave install with a deep side parting, the front section moulded into an S-wave across the forehead',
     'S-Wave Side Sweep', 'A deep side parting with the front section moulded into an S-wave across the forehead.',
     1200, 1600, 'frontal', true, 14, 'center 55%', true, array['custom-hairline']::text[], 'body-wave-glam'),
    ('/images/work/colour-pink-straight.jpg',
     'A long straight install in candy pink with a deep side parting, cut to a blunt baseline',
     'Candy Pink', 'A long straight install in candy pink with a deep side parting, cut to a blunt baseline.',
     1200, 1600, 'frontal', true, 15, 'center 100%', false, array['melted-hairline']::text[], 'color-and-custom'),
    ('/images/work/colour-blonde-straight.jpg',
     'A long platinum blonde straight install parted down the middle, the lace tinted to blend away at the parting',
     'Platinum Straight', 'A long platinum blonde straight install parted down the middle, the lace tinted to blend away at the parting.',
     1200, 1600, 'frontal', true, 16, 'center 55%', false, array['melted-hairline', 'hd-lace']::text[], 'color-and-custom'),
    ('/images/work/colour-copper-centre-part.jpg',
     'A warm copper install with a centre parting, worn straight through the lengths with a soft bend at the ends',
     'Warm Copper', 'A warm copper install with a centre parting, worn straight through the lengths with a soft bend at the ends.',
     1200, 1600, null, true, 17, 'center 85%', true, array['melted-hairline']::text[], 'color-and-custom'),
    -- The homepage's opening photograph. In no gallery, as at launch: only
    -- the slideshow and the link previews show it. Its crop is the
    -- slideshow's measured one.
    ('/images/work/deep-wave-front-swirl.jpg',
     'A long deep-wave install in natural black, centre parted, with the baby hairs swirled along a melted hairline',
     'Front Swirl', null,
     1200, 1600, null, true, 18, 'center 55%', false, array[]::text[], null)
  on conflict (src) do nothing;

  insert into public.gallery_item_categories (item_id, category_id)
  select i.id, c.id
    from (values
      ('/images/work/deep-wave-middle-part.jpg', 'deep-wave-glam'),
      ('/images/work/deep-wave-middle-part.jpg', 'natural-lace'),
      ('/images/work/deep-wave-melted-part.jpg', 'deep-wave-glam'),
      ('/images/work/deep-wave-melted-part.jpg', 'natural-lace'),
      ('/images/work/deep-wave-crimped-lengths.jpg', 'deep-wave-glam'),
      ('/images/work/deep-wave-braided-front.jpg', 'deep-wave-glam'),
      ('/images/work/deep-wave-braided-front.jpg', 'natural-lace'),
      ('/images/work/deep-wave-long-layers.jpg', 'deep-wave-glam'),
      ('/images/work/deep-wave-shoulder-sweep.jpg', 'deep-wave-glam'),
      ('/images/work/straight-glass-finish.jpg', 'sleek-straight'),
      ('/images/work/straight-glass-finish.jpg', 'natural-lace'),
      ('/images/work/straight-side-swoop.jpg', 'sleek-straight'),
      ('/images/work/straight-side-swoop.jpg', 'natural-lace'),
      ('/images/work/straight-centre-part.jpg', 'sleek-straight'),
      ('/images/work/bob-soft-lob.jpg', 'signature-bob'),
      ('/images/work/bob-soft-lob.jpg', 'natural-lace'),
      ('/images/work/bob-blunt-side-part.jpg', 'signature-bob'),
      ('/images/work/bob-burgundy-curl.jpg', 'signature-bob'),
      ('/images/work/bob-burgundy-curl.jpg', 'color-and-custom'),
      ('/images/work/body-wave-copper.jpg', 'body-wave-glam'),
      ('/images/work/body-wave-copper.jpg', 'color-and-custom'),
      ('/images/work/body-wave-side-sweep.jpg', 'body-wave-glam'),
      ('/images/work/colour-pink-straight.jpg', 'color-and-custom'),
      ('/images/work/colour-pink-straight.jpg', 'sleek-straight'),
      ('/images/work/colour-blonde-straight.jpg', 'color-and-custom'),
      ('/images/work/colour-blonde-straight.jpg', 'sleek-straight'),
      ('/images/work/colour-blonde-straight.jpg', 'natural-lace'),
      ('/images/work/colour-copper-centre-part.jpg', 'color-and-custom'),
      ('/images/work/colour-copper-centre-part.jpg', 'sleek-straight')
    ) as m (src, slug)
    join public.gallery_items      i on i.src  = m.src
    join public.gallery_categories c on c.slug = m.slug
  on conflict do nothing;

  -- Each collection's cover (its card, page photograph and link preview)
  -- and the second photograph its card fades to on hover.
  update public.gallery_categories c
     set hero_item_id  = cover.id,
         hover_item_id = second.id
    from (values
      ('deep-wave-glam',   '/images/work/deep-wave-middle-part.jpg', '/images/work/deep-wave-crimped-lengths.jpg'),
      ('sleek-straight',   '/images/work/straight-glass-finish.jpg', '/images/work/straight-side-swoop.jpg'),
      ('signature-bob',    '/images/work/bob-soft-lob.jpg',          '/images/work/bob-blunt-side-part.jpg'),
      ('body-wave-glam',   '/images/work/body-wave-copper.jpg',      '/images/work/body-wave-side-sweep.jpg'),
      ('color-and-custom', '/images/work/colour-pink-straight.jpg',  '/images/work/body-wave-copper.jpg'),
      ('natural-lace',     '/images/work/deep-wave-melted-part.jpg', '/images/work/straight-glass-finish.jpg')
    ) as m (slug, cover_src, second_src)
    join public.gallery_items cover  on cover.src  = m.cover_src
    join public.gallery_items second on second.src = m.second_src
   where c.slug = m.slug;

  insert into public.site_photo_slots (slot, item_id)
  select m.slot, i.id
    from (values
      ('home-1',               '/images/work/deep-wave-front-swirl.jpg'),
      ('home-2',               '/images/work/straight-glass-finish.jpg'),
      ('home-3',               '/images/work/bob-burgundy-curl.jpg'),
      ('home-4',               '/images/work/deep-wave-crimped-lengths.jpg'),
      ('home-5',               '/images/work/colour-pink-straight.jpg'),
      ('home-6',               '/images/work/bob-soft-lob.jpg'),
      ('install-frontal',      '/images/work/straight-side-swoop.jpg'),
      ('install-closure',      '/images/work/deep-wave-melted-part.jpg'),
      ('install-wig-touch-up', '/images/work/deep-wave-long-layers.jpg'),
      ('finish-curls',         '/images/work/bob-burgundy-curl.jpg'),
      ('finish-crimps',        '/images/work/deep-wave-crimped-lengths.jpg'),
      ('book',                 '/images/work/body-wave-side-sweep.jpg'),
      ('sign-in',              '/images/work/straight-glass-finish.jpg')
    ) as m (slot, src)
    join public.gallery_items i on i.src = m.src
  on conflict (slot) do nothing;

  insert into public.business_settings (key, value)
  values ('website_photos_seeded', to_jsonb(now()));
end
$seed$;


-- Tell the API about the new table and columns now rather than on its next
-- schema poll, so the site can read them the moment this finishes.
notify pgrst, 'reload schema';


-- ----------------------------------------------------------------------------
-- Verify (each should return what the comment says)
-- ----------------------------------------------------------------------------
--   select count(*) from public.gallery_items where src like '/images/work/%';
--     -> 18 (fewer only if Nat has since replaced or removed some)
--   select slot, i.title from public.site_photo_slots s
--     left join public.gallery_items i on i.id = s.item_id order by slot;
--     -> 13 rows, each with a title
--   select slug, h.title as cover, v.title as second from public.gallery_categories c
--     left join public.gallery_items h on h.id = c.hero_item_id
--     left join public.gallery_items v on v.id = c.hover_item_id order by c.display_order;
--     -> six collections, each with both
--   select value from public.business_settings where key = 'website_photos_seeded';
--     -> one timestamp
