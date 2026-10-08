-- ============================================================================
-- CROWNED BY NAT - 0008 - rebuild the website after Nat changes its photos
-- ============================================================================
-- OPTIONAL, and harmless on its own: nothing is sent anywhere until the
-- Cloudflare deploy hook below has been stored in Vault.
--
-- The site is a static export (next.config.ts). Visitors see Nat's changes
-- from the photo manager straight away, because every page checks Supabase
-- once it has loaded (components/site-photos.tsx). What a page holds BEFORE
-- its JavaScript runs, which is what search engines index, what link
-- previews show and what a visitor sees for the first moment, is written at
-- each deployment. Until the next one, a removed photograph is still in that
-- saved copy, and its Storage files are kept so the copy does not break
-- (lib/photo-admin.ts).
--
-- This file makes the next deployment happen by itself: once Nat has made a
-- change and then left the photo manager alone for two minutes, the database
-- asks Cloudflare Pages to rebuild the site, which takes a few minutes. One
-- editing session, one rebuild, however many changes it held.
--
-- Apply it after 0007. Re-running it is harmless.
--
-- ----------------------------------------------------------------------------
-- TO SWITCH IT ON (once)
-- ----------------------------------------------------------------------------
--   1. Cloudflare dashboard -> Workers & Pages -> wig-install-site ->
--      Settings -> Builds -> Deploy hooks -> Add deploy hook.
--      Name: "Photo manager", branch: main. Copy the URL it shows.
--   2. Supabase dashboard -> SQL editor, with that URL pasted in:
--        select vault.create_secret(
--          'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...',
--          'cloudflare_pages_deploy_hook',
--          'Rebuilds crownedbynat.com after a photo change (migration 0008)'
--        );
--
-- The URL is a secret in the plain sense: anyone holding it can start builds.
-- It lives only in Vault, encrypted, readable by the database itself and not
-- through the API. It is never written into this repository, the site, or
-- Cloudflare's environment variables.
--
-- To switch it off again:
--   delete from vault.secrets where name = 'cloudflare_pages_deploy_hook';
-- ============================================================================

do $guard$
begin
  if to_regclass('public.site_photo_slots') is null then
    raise exception 'Run 0007_website_photos.sql before this file.';
  end if;
end
$guard$;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;


-- ----------------------------------------------------------------------------
-- 1. When the photographs last changed, and when a rebuild was last asked for
-- ----------------------------------------------------------------------------
-- In a schema the API does not serve, so no request from the website can read
-- or touch it. One row.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.site_rebuild (
  id           boolean primary key default true check (id),
  changed_at   timestamptz,
  requested_at timestamptz
);
insert into private.site_rebuild (id) values (true) on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- 2. Every change to the photographs is noted
-- ----------------------------------------------------------------------------
-- Per changed ROW, deliberately not per statement. A statement trigger fires
-- even when row level security let the statement touch nothing, so any
-- signed-up account could keep "changing" the photographs with refused
-- requests and start a rebuild every few minutes, until Cloudflare's monthly
-- build allowance ran out. A row trigger only fires for a row that really
-- changed, which only the owner can do. (Reordering eighteen photographs
-- records the same time eighteen times; it is still one rebuild.)
--
-- SECURITY DEFINER so Nat's own requests can record the time in a table they
-- otherwise have no access to.
create or replace function private.note_photo_change()
returns trigger
language plpgsql
security definer
set search_path = private, pg_temp
as $fn$
begin
  update private.site_rebuild set changed_at = now() where id;
  return null;
end
$fn$;

revoke all on function private.note_photo_change() from public, anon, authenticated;

drop trigger if exists gallery_items_rebuild           on public.gallery_items;
drop trigger if exists gallery_item_categories_rebuild on public.gallery_item_categories;
drop trigger if exists gallery_categories_rebuild      on public.gallery_categories;
drop trigger if exists site_photo_slots_rebuild        on public.site_photo_slots;

create trigger gallery_items_rebuild
  after insert or update or delete on public.gallery_items
  for each row execute function private.note_photo_change();
create trigger gallery_item_categories_rebuild
  after insert or update or delete on public.gallery_item_categories
  for each row execute function private.note_photo_change();
create trigger gallery_categories_rebuild
  after insert or update or delete on public.gallery_categories
  for each row execute function private.note_photo_change();
create trigger site_photo_slots_rebuild
  after insert or update or delete on public.site_photo_slots
  for each row execute function private.note_photo_change();


-- ----------------------------------------------------------------------------
-- 3. Once things have been quiet for two minutes, ask Cloudflare to rebuild
-- ----------------------------------------------------------------------------
-- Run every minute by pg_cron. It does nothing unless there is a change newer
-- than the last request, that change is at least two minutes old (Nat has
-- finished, rather than paused between photographs), and the deploy hook is
-- in Vault. pg_net sends the request in the background; Cloudflare queues the
-- build, so a change made while one is running is picked up by the next.
create or replace function private.request_site_rebuild()
returns boolean
language plpgsql
security definer
set search_path = private, pg_temp
as $fn$
declare
  state private.site_rebuild%rowtype;
  hook  text;
begin
  select * into state from private.site_rebuild where id;
  if state.changed_at is null
     or state.changed_at <= coalesce(state.requested_at, '-infinity'::timestamptz)
     or state.changed_at > now() - interval '2 minutes' then
    return false;
  end if;

  select decrypted_secret into hook
    from vault.decrypted_secrets
   where name = 'cloudflare_pages_deploy_hook'
   limit 1;
  if hook is null or btrim(hook) = '' then
    return false;
  end if;

  perform net.http_post(
    url     := btrim(hook),
    body    := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  update private.site_rebuild set requested_at = now() where id;
  return true;
end
$fn$;

revoke all on function private.request_site_rebuild() from public, anon, authenticated;

-- Named, so running this file again updates the job instead of adding one.
select cron.schedule(
  'rebuild-website-after-photo-changes',
  '* * * * *',
  'select private.request_site_rebuild()'
);


-- ----------------------------------------------------------------------------
-- Verify (each should return what the comment says)
-- ----------------------------------------------------------------------------
--   select jobname, schedule, active from cron.job
--    where jobname = 'rebuild-website-after-photo-changes';
--     -> one row, '* * * * *', true
--   select name from vault.decrypted_secrets where name = 'cloudflare_pages_deploy_hook';
--     -> one row once switched on
--   select changed_at, requested_at from private.site_rebuild;
--     -> after a change in the photo manager and two quiet minutes,
--        requested_at catches up with changed_at
--   select status_code, created from net._http_response order by created desc limit 3;
--     -> 200 for the most recent rebuild request
