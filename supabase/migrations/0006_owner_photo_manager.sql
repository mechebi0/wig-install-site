-- ============================================================================
-- CROWNED BY NAT - 0006 - the owner's photo manager
-- ============================================================================
-- Lets Nat add, edit, reorder and remove gallery photographs herself from
-- /admin/photos/, with the files in Supabase Storage and the descriptions in
-- the gallery tables 0002 already created for exactly this.
--
-- Apply it after 0001-0005, the same way: Supabase dashboard -> SQL editor ->
-- paste -> Run (or `supabase db push`). Re-running it is harmless. Re-running
-- 0001 AFTER this file puts back the older is_admin() and
-- protect_profile_columns(); if you ever do that, run this file again.
--
-- ----------------------------------------------------------------------------
-- NOTHING NEW DECIDES WHO IS NAT
-- ----------------------------------------------------------------------------
-- Every write below is gated by public.is_admin() from 0001, which reads
-- profiles.role inside Postgres. There is no second list of admins and no
-- email address in a policy. The browser can hide or show the photo manager,
-- but only these policies decide what a request may change, so a visitor
-- holding the public anon key can read published photographs and nothing
-- else, and a signed-in customer can do no more than a visitor.
--
-- What this file changes about that model, and why:
--
--   1. protect_profile_columns() refused EVERY role change made without an
--      admin's JWT, including the documented promotion run from the SQL
--      editor, which has no JWT at all. Nat could therefore never be made an
--      admin. It now trusts sessions that carry no end-user JWT (the SQL
--      editor, migrations, Supabase's own services) and the service role.
--      A browser always carries a JWT, so nothing changes for one.
--
--   2. is_admin() now also requires the session behind the JWT to still
--      exist. An access token is otherwise valid until it expires (an hour),
--      even after "Log out" or after the account's sessions are revoked.
--      With this check, logging out ends admin rights immediately, and so
--      does revoking the sessions in promote_studio_owner() below.
--
--   3. promote_studio_owner() replaces the bare UPDATE from 0001. Promoting
--      an account by email has a known gap: anyone can sign up with Nat's
--      address and a password of their choosing BEFORE she first signs in.
--      They cannot confirm it, but when Nat confirms it with her sign-in code
--      the account becomes hers AND theirs, because Supabase keeps the
--      password they set (verified against GoTrue v2.197 while writing this).
--      The function therefore replaces any password with a random one nobody
--      knows and ends every session at the moment it grants the role.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. protect_profile_columns(): let a trusted session change a role
-- ----------------------------------------------------------------------------
-- Same body as 0001, plus the second early return. auth.role() reads the role
-- claim of the request's JWT: 'anon' or 'authenticated' for anything that came
-- through the public API, the service role for server code holding the secret
-- key, and NULL when there is no JWT at all.
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

  if coalesce(auth.role(), 'service_role') = 'service_role' then
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


-- ----------------------------------------------------------------------------
-- 2. is_admin(): the role, held by a session that still exists
-- ----------------------------------------------------------------------------
-- Compared as text rather than cast to uuid, so a token without a session_id
-- claim reads as "not an admin" instead of raising a cast error mid-policy.
-- The same goes for any token that does not belong to a live sign-in, such as
-- one minted by hand for testing: it carries no admin rights.
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
  )
  and exists (
    select 1
    from auth.sessions s
    where s.user_id = auth.uid()
      and s.id::text = (auth.jwt() ->> 'session_id')
      and (s.not_after is null or s.not_after > now())
  );
$fn$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. promote_studio_owner(): the one way to make Nat an admin
-- ----------------------------------------------------------------------------
-- Run from the SQL editor, once, after she has signed in at /admin/login/:
--
--   select public.promote_studio_owner('crownedbynattt@gmail.com');
--
-- It refuses an address that has not been confirmed, because a confirmed
-- address is the only proof that the account belongs to whoever reads that
-- inbox. It is not callable through the API: execute is revoked from every
-- API role below, and the function checks for itself as well.
create or replace function public.promote_studio_owner(p_email text)
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions, pg_temp
as $fn$
declare
  target auth.users%rowtype;
begin
  if coalesce(auth.role(), 'service_role') <> 'service_role' then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  select * into target
    from auth.users u
   where lower(u.email) = lower(btrim(p_email));

  if target.id is null then
    raise exception 'There is no account for % yet. Sign in once at /admin/login/ first.', p_email;
  end if;

  if target.email_confirmed_at is null then
    raise exception '% has not been confirmed yet. Finish signing in at /admin/login/ with the emailed code first.', target.email;
  end if;

  insert into public.profiles (id, email, role)
  values (target.id, target.email, 'admin')
  on conflict (id) do update
    set role = 'admin',
        updated_at = now();

  -- The owner signs in with an emailed code, never a password. Whatever
  -- password the account has, including one an impostor set before Nat
  -- confirmed the address, stops working here.
  update auth.users
     set encrypted_password = extensions.crypt(
           encode(extensions.gen_random_bytes(32), 'hex'),
           extensions.gen_salt('bf')
         ),
         updated_at = now()
   where id = target.id;

  -- Ends every existing sign-in, so the role is only ever held by a session
  -- that starts after this point. (Refresh tokens cascade from sessions.)
  delete from auth.sessions where user_id = target.id;

  return format(
    '%s is now the studio owner. Earlier sign-ins have been ended: sign in again at /admin/login/.',
    target.email
  );
end
$fn$;

revoke all on function public.promote_studio_owner(text) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. gallery_items: what an uploaded photograph needs
-- ----------------------------------------------------------------------------
-- 0002 left two things for this moment: `src` was written to hold either a
-- path under public/images/ or a Storage object key, and the shape was kept
-- free of anything the admin screen had not yet asked for. The screen now
-- asks for a short title and for the install type, which is a separate axis
-- from the collections (lib/collections.ts explains why).
alter table public.gallery_items
  add column if not exists title        text,
  add column if not exists install_type text;

alter table public.gallery_items drop constraint if exists gallery_items_title_check;
alter table public.gallery_items add constraint gallery_items_title_check
  check (title is null or length(btrim(title)) between 1 and 80);

alter table public.gallery_items drop constraint if exists gallery_items_alt_length_check;
alter table public.gallery_items add constraint gallery_items_alt_length_check
  check (length(alt) <= 300);

-- The install types in lib/taxonomy.ts. Null means "not established", the
-- same as a photograph in the bundle whose frame does not prove either.
alter table public.gallery_items drop constraint if exists gallery_items_install_type_check;
alter table public.gallery_items add constraint gallery_items_install_type_check
  check (install_type is null or install_type in ('frontal', 'closure', 'wig-touch-up'));

-- One row per file. Deleting a row deletes its file from Storage, so two rows
-- sharing a key would mean removing one photograph broke the other.
create unique index if not exists gallery_items_src_key on public.gallery_items (src);
create index if not exists gallery_items_order_idx
  on public.gallery_items (display_order, created_at desc);

comment on column public.gallery_items.src is
  'A Storage object key in the website-photos bucket (e.g. gallery/<uuid>.webp), or a site path starting with "/". The -600 and -1600 widths sit beside it under the same stem.';
comment on column public.gallery_items.active is
  'Published. Inactive rows are invisible to the public API.';


-- ----------------------------------------------------------------------------
-- 5. Grants for the three gallery tables
-- ----------------------------------------------------------------------------
-- Explicit, rather than relying on the project default of exposing every
-- table to every API role. RLS from 0002 still decides which ROWS: published
-- ones for everybody, everything for is_admin().
revoke all on public.gallery_items, public.gallery_categories, public.gallery_item_categories
  from anon, authenticated;
grant select on public.gallery_items, public.gallery_categories, public.gallery_item_categories
  to anon, authenticated;
grant insert, update, delete on public.gallery_items, public.gallery_categories, public.gallery_item_categories
  to authenticated;


-- ----------------------------------------------------------------------------
-- 6. Two small functions the photo manager calls
-- ----------------------------------------------------------------------------
-- SECURITY INVOKER: they run as the caller, so the RLS policies above apply to
-- every row they touch. The is_admin() check at the top only turns a silent
-- "nothing happened" into an error message.

-- Replaces a photograph's collections in one transaction, so a failure can
-- never leave it in none of them. Takes slugs, the stable names shared with
-- lib/collections.ts, rather than ids the browser would have to look up.
create or replace function public.set_gallery_item_categories(p_item_id uuid, p_slugs text[])
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  if exists (
    select 1 from unnest(coalesce(p_slugs, '{}')) as wanted(slug)
    where not exists (
      select 1 from public.gallery_categories c where c.slug = wanted.slug
    )
  ) then
    raise exception 'Unknown collection.' using errcode = '22023';
  end if;

  delete from public.gallery_item_categories where item_id = p_item_id;

  insert into public.gallery_item_categories (item_id, category_id)
  select p_item_id, c.id
    from public.gallery_categories c
   where c.slug = any (coalesce(p_slugs, '{}'));
end
$fn$;

revoke all on function public.set_gallery_item_categories(uuid, text[]) from public, anon;
grant execute on function public.set_gallery_item_categories(uuid, text[]) to authenticated;

-- Writes display_order from the order of the ids given: first id, first place.
create or replace function public.reorder_gallery_items(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  update public.gallery_items g
     set display_order = o.position::integer
    from unnest(p_ids) with ordinality as o(id, position)
   where g.id = o.id
     and g.display_order is distinct from o.position::integer;
end
$fn$;

revoke all on function public.reorder_gallery_items(uuid[]) from public, anon;
grant execute on function public.reorder_gallery_items(uuid[]) to authenticated;


-- ----------------------------------------------------------------------------
-- 7. The Storage bucket
-- ----------------------------------------------------------------------------
-- PUBLIC, so a published photograph has a plain, cacheable URL that needs no
-- key to load: /storage/v1/object/public/website-photos/<key>. Public here
-- means "readable by URL". It does NOT mean listable or writable; both of
-- those go through the policies below, and anon has none.
--
-- The browser resizes every photograph to at most 1600px wide and re-encodes
-- it as WebP (JPEG where the browser cannot write WebP) before uploading, so
-- 5 MB per file is several times what a real upload needs while still
-- refusing an original straight off a camera.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('website-photos', 'website-photos', true, 5242880, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ----------------------------------------------------------------------------
-- 8. Storage policies: Nat writes, nobody else does
-- ----------------------------------------------------------------------------
-- There is no SELECT policy for anon, so nobody can list the bucket and find
-- a hidden photograph's key. Public URLs keep working without one; the API's
-- public endpoint does not consult these policies.
--
-- Nat needs SELECT as well as DELETE, because Storage's remove() reads the
-- objects it is about to delete, and listing is how the photo manager finds
-- files left behind by an upload that failed halfway.
--
-- `(select public.is_admin())` rather than a bare call: the subquery form is
-- evaluated once per statement instead of once per object, which is
-- Supabase's own advice for policies on a table that grows. Same answer.
drop policy if exists "website-photos: admin reads"   on storage.objects;
drop policy if exists "website-photos: admin uploads" on storage.objects;
drop policy if exists "website-photos: admin updates" on storage.objects;
drop policy if exists "website-photos: admin deletes" on storage.objects;

create policy "website-photos: admin reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'website-photos' and (select public.is_admin()));

-- Uploads only land in gallery/, so nothing can be dropped at the bucket root
-- or under a path some other feature might later rely on.
create policy "website-photos: admin uploads"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'website-photos'
    and (storage.foldername(name))[1] = 'gallery'
    and (select public.is_admin())
  );

create policy "website-photos: admin updates"
  on storage.objects for update to authenticated
  using (bucket_id = 'website-photos' and (select public.is_admin()))
  with check (bucket_id = 'website-photos' and (select public.is_admin()));

create policy "website-photos: admin deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'website-photos' and (select public.is_admin()));


-- ----------------------------------------------------------------------------
-- Verify (each should return what the comment says)
-- ----------------------------------------------------------------------------
--   select id, public, file_size_limit from storage.buckets where id = 'website-photos';
--     -> one row, public = true
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and policyname like 'website-photos:%';
--     -> four rows: SELECT, INSERT, UPDATE, DELETE
--   select email, role from public.profiles where role = 'admin';
--     -> exactly one row, Nat's, once promote_studio_owner() has been run
