-- ============================================================================
-- CROWNED BY NAT - 0002 - gallery, reviews and business settings
-- ============================================================================
-- Phase two of the schema. 0001 covers profiles, locations, services and
-- appointments; this covers the content Nat should be able to change herself
-- without a deploy.
--
-- NOTHING IN THE SITE READS THESE TABLES YET, and that is deliberate. The
-- gallery is currently compiled into the bundle (see the note at the top of
-- lib/gallery.ts for why a static export wants it that way). This migration
-- exists so the shape is decided while the content it mirrors is still in
-- front of us, and so the admin dashboard has something to be built against.
--
-- Apply it the same way as 0001: Supabase dashboard -> SQL editor -> Run, or
-- `supabase db push`. It is safe to apply before any of it is used.
--
-- ----------------------------------------------------------------------------
-- THE SECURITY MODEL, WHICH IS THE SAME ONE AS 0001
-- ----------------------------------------------------------------------------
-- Row level security is ON for every table here, and the policies are the
-- authorization. Not the frontend, and specifically not the admin email
-- appearing anywhere in client code: anyone can read the JavaScript bundle and
-- anyone can send whatever they like to the API, so a check that lives in the
-- browser is decoration.
--
-- The shape of it:
--
--   anon + authenticated   SELECT only, and only rows that are switched on
--                          (active / published). Nothing else, ever.
--   admin                  everything, and only through is_admin(), which
--                          reads profiles.role in the database rather than
--                          trusting anything the client sent.
--
-- is_admin() is defined in 0001. It is SECURITY DEFINER with a pinned
-- search_path, so it cannot be shadowed by a table the caller controls.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- gallery_items - one photograph
-- ----------------------------------------------------------------------------
create table if not exists public.gallery_items (
  id            uuid primary key default gen_random_uuid(),

  -- Path under public/images/work/ today. Becomes a Storage object key if
  -- uploads are added later; the column does not care which.
  src           text not null,

  -- NOT NULL and no default, on purpose. A gallery managed through a form is
  -- exactly where alt text goes missing, and a photograph with no description
  -- is unusable to anyone browsing with a screen reader. The database is the
  -- only place that can make this non-negotiable.
  alt           text not null check (length(btrim(alt)) >= 10),

  width         integer not null check (width  > 0),
  height        integer not null check (height > 0),
  caption       text,
  taken_on      date,

  active        boolean not null default true,
  display_order integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- gallery_categories - one of the six collections
-- ----------------------------------------------------------------------------
create table if not exists public.gallery_categories (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  tagline          text not null default '',
  summary          text not null default '',
  description      text not null default '',
  meta_description text not null default '',

  -- The card image and the hover image. on delete set null rather than
  -- cascade: removing a photograph must never silently delete the collection
  -- it happened to be the cover of.
  hero_item_id     uuid references public.gallery_items (id) on delete set null,
  hover_item_id    uuid references public.gallery_items (id) on delete set null,

  active           boolean not null default true,
  display_order    integer not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- gallery_item_categories - a photograph can be in more than one collection
-- ----------------------------------------------------------------------------
-- This is a join table rather than a category_id column on the item, because
-- six of the current photographs genuinely belong to two collections at once:
-- a copper body wave is both Body Wave Glam and Color & Custom. Forcing one
-- category per photograph would mean either hiding the best example of one of
-- them or committing the same file twice.
create table if not exists public.gallery_item_categories (
  item_id       uuid not null references public.gallery_items (id)      on delete cascade,
  category_id   uuid not null references public.gallery_categories (id) on delete cascade,
  display_order integer not null default 0,
  primary key (item_id, category_id)
);

create index if not exists gallery_item_categories_category_idx
  on public.gallery_item_categories (category_id, display_order);

-- ----------------------------------------------------------------------------
-- reviews
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),

  -- First name or initial. A full name is a privacy decision that belongs to
  -- the client, not to the form.
  author        text not null,
  body          text not null,
  rating        smallint check (rating between 1 and 5),
  category_id   uuid references public.gallery_categories (id) on delete set null,

  -- FALSE by default, and this is the important line in the table. A review is
  -- a public claim about the business. The failure worth designing against is
  -- one going live before Nat has read it, so publishing is an explicit act.
  published     boolean not null default false,

  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- business_settings - key/value, so a new setting is not a new migration
-- ----------------------------------------------------------------------------
-- Known keys, and the compiled-in constant each one currently shadows:
--
--   active_location_ids   uuid[]    which chairs are open this week
--   announcement_lead     text      "Now booking in"
--   announcement_closed   text      shown when no chair is open
--   booking_url           text      STUDIO.bookingUrl in lib/content.ts
--   policies_are_draft    boolean   policiesAreDraft
--   reviews_are_draft     boolean   testimonialsArePlaceholder
create table if not exists public.business_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- ----------------------------------------------------------------------------
-- updated_at triggers, reusing the function defined in 0001
-- ----------------------------------------------------------------------------
drop trigger if exists gallery_items_touch      on public.gallery_items;
drop trigger if exists gallery_categories_touch on public.gallery_categories;
drop trigger if exists reviews_touch            on public.reviews;
drop trigger if exists business_settings_touch  on public.business_settings;

create trigger gallery_items_touch      before update on public.gallery_items      for each row execute function public.touch_updated_at();
create trigger gallery_categories_touch before update on public.gallery_categories for each row execute function public.touch_updated_at();
create trigger reviews_touch            before update on public.reviews            for each row execute function public.touch_updated_at();
create trigger business_settings_touch  before update on public.business_settings  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.gallery_items            enable row level security;
alter table public.gallery_categories       enable row level security;
alter table public.gallery_item_categories  enable row level security;
alter table public.reviews                  enable row level security;
alter table public.business_settings        enable row level security;

-- ---- public read, and only of rows that are switched on --------------------
drop policy if exists gallery_items_read_active on public.gallery_items;
create policy gallery_items_read_active
  on public.gallery_items for select
  to anon, authenticated
  using (active);

drop policy if exists gallery_categories_read_active on public.gallery_categories;
create policy gallery_categories_read_active
  on public.gallery_categories for select
  to anon, authenticated
  using (active);

-- A join row is visible only when BOTH ends are. Without the two exists()
-- checks, a deactivated photograph would still be listed under its category,
-- and a client asking for it by id would get the row back.
drop policy if exists gallery_item_categories_read_active on public.gallery_item_categories;
create policy gallery_item_categories_read_active
  on public.gallery_item_categories for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.gallery_items i
      where i.id = gallery_item_categories.item_id and i.active
    )
    and exists (
      select 1 from public.gallery_categories c
      where c.id = gallery_item_categories.category_id and c.active
    )
  );

drop policy if exists reviews_read_published on public.reviews;
create policy reviews_read_published
  on public.reviews for select
  to anon, authenticated
  using (published);

-- Settings are readable by anyone, because the announcement strip is read by
-- signed-out visitors. Nothing secret goes in this table: it holds which town
-- is open and what the strip says. Anything that must not be public belongs in
-- an Edge Function with its own secret, never here.
drop policy if exists business_settings_read on public.business_settings;
create policy business_settings_read
  on public.business_settings for select
  to anon, authenticated
  using (true);

-- ---- admin writes ----------------------------------------------------------
-- `for all` with both using and with check: `using` governs which existing
-- rows can be touched, `with check` governs what a row is allowed to look like
-- afterwards. Omitting the second lets an admin update a row into a state the
-- first would have refused.
drop policy if exists gallery_items_admin_all on public.gallery_items;
create policy gallery_items_admin_all
  on public.gallery_items for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists gallery_categories_admin_all on public.gallery_categories;
create policy gallery_categories_admin_all
  on public.gallery_categories for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists gallery_item_categories_admin_all on public.gallery_item_categories;
create policy gallery_item_categories_admin_all
  on public.gallery_item_categories for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists reviews_admin_all on public.reviews;
create policy reviews_admin_all
  on public.reviews for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists business_settings_admin_all on public.business_settings;
create policy business_settings_admin_all
  on public.business_settings for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- SEED - the six collections, matched by slug to lib/collections.ts
-- ============================================================================
-- Categories only. The photographs are NOT seeded, because their real source
-- is the files in public/images/work/ and inserting rows that point at them
-- would create a second place to keep alt text in step with no code reading
-- either one yet.
--
-- Slugs are the join between this table and the compiled-in array, exactly as
-- services.slug joins to SERVICES in lib/content.ts. Keep them identical.
insert into public.gallery_categories (slug, title, tagline, summary, display_order)
values
  ('deep-wave-glam',   'Deep Wave Glam', 'Texture. Movement. Glamour.', 'Long, textured, effortlessly glamorous.',     1),
  ('sleek-straight',   'Sleek Straight', 'Smooth. Precise. Polished.',  'Pressed flat, parted clean, finished sharp.', 2),
  ('signature-bob',    'Signature Bob',  'Sharp. Modern. Considered.',  'The cut that has to be right the first time.', 3),
  ('body-wave-glam',   'Body Wave Glam', 'Soft. Full. Luminous.',       'Wide, glossy waves with weight behind them.', 4),
  ('color-and-custom', 'Color & Custom', 'Blonde. Copper. Pink.',       'Explore custom colour inspiration.',          5),
  ('natural-lace',     'Natural Lace',   'Seamless. Quiet. Yours.',     'The install nobody can tell is an install.',  6)
on conflict (slug) do nothing;

-- Settings, seeded to match the constants the site ships with today.
insert into public.business_settings (key, value)
values
  ('announcement_lead',   '"Now booking in"'::jsonb),
  ('announcement_closed', '"The chair is between studios just now. New dates announced soon."'::jsonb),
  ('booking_url',         '""'::jsonb),
  ('policies_are_draft',  'true'::jsonb),
  ('reviews_are_draft',   'true'::jsonb)
on conflict (key) do nothing;
