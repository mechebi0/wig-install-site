-- ============================================================================
-- CROWNED BY NAT - 0011 - the website's words, edited and published by Nat
-- ============================================================================
-- Lets Nat change the site's text, business details, locations, services and
-- prices, FAQs and reviews from the dashboard at /admin/, without a developer.
--
-- TWO TABLES, TWO STATES
--   site_content_drafts     what she is working on: one row per section of
--                           the dashboard (lib/cms/defaults.ts lists them).
--                           Only the owner can read or write it. Nothing a
--                           visitor can reach ever reads it.
--   site_content_releases   what she has published: an immutable snapshot of
--                           every section, one row per Publish. Exactly one
--                           row is current, and that row is the only one the
--                           public can read. Earlier rows are her history,
--                           which she can copy back into drafts and publish
--                           again; nothing ever edits or deletes a release.
--
-- HOW A RELEASE REACHES THE SITE
-- The site is a static export (next.config.ts). Each build reads the current
-- release once and writes it into the pages, so a published change is live
-- when the site has been rebuilt, not when it was saved. Publishing asks
-- Cloudflare Pages for that rebuild straight away, through the same deploy
-- hook 0008 uses, kept in Vault as `cloudflare_pages_deploy_hook`. Without
-- the hook the release still exists, and the site catches up at its next
-- deployment; the dashboard says which of the two is happening and checks
-- /content-version.json to say when the site actually carries it.
--
-- WHO MAY DO WHAT
-- Every write, and every read of a draft or an old release, is gated by
-- public.is_admin() (0001, tightened in 0006: the admin role AND a sign-in
-- that still exists). The public may read the current release and nothing
-- else, through PostgREST, with the anon key. Publishing runs in one
-- function that checks is_admin() itself before touching anything.
--
-- Apply it after 0006 (0007-0010 are not needed for it), the same way as the
-- others: Supabase dashboard -> SQL editor -> paste -> Run. Re-running it is
-- harmless and keeps every draft and release. It changes nothing a visitor
-- sees until Nat publishes.
-- ============================================================================

do $guard$
begin
  if to_regprocedure('public.promote_studio_owner(text)') is null then
    raise exception 'Run 0006_owner_photo_manager.sql before this file.';
  end if;
end
$guard$;

-- Sends the rebuild request. Installed by 0008 too; harmless on its own, as
-- nothing is sent until the deploy hook is in Vault. Should a project refuse
-- it, publishing still works and the website updates at its next deployment
-- (request_content_rebuild() below checks for it each time).
do $net$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net is not available (%): releases will wait for the next deployment.', sqlerrm;
end
$net$;


-- ----------------------------------------------------------------------------
-- 1. Drafts
-- ----------------------------------------------------------------------------
-- `section` is a top-level key of DEFAULT_CONTENT ("business", "faq",
-- "serviceBooking"); `content` is that section's fields as the dashboard
-- holds them. The site never reads this table.
create table if not exists public.site_content_drafts (
  section    text primary key,
  content    jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

alter table public.site_content_drafts drop constraint if exists site_content_drafts_section_check;
alter table public.site_content_drafts add constraint site_content_drafts_section_check
  check (section ~ '^[a-z][a-zA-Z0-9]{1,39}$');

alter table public.site_content_drafts drop constraint if exists site_content_drafts_content_check;
alter table public.site_content_drafts add constraint site_content_drafts_content_check
  check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000);

-- Who saved last and when, set by the database rather than trusted from the
-- browser. The dashboard compares updated_at before saving, so a section
-- edited on two devices at once is caught rather than silently overwritten.
create or replace function public.touch_site_content_draft()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end
$fn$;

drop trigger if exists site_content_drafts_touch on public.site_content_drafts;
create trigger site_content_drafts_touch
  before insert or update on public.site_content_drafts
  for each row execute function public.touch_site_content_draft();


-- ----------------------------------------------------------------------------
-- 2. Releases
-- ----------------------------------------------------------------------------
-- `content` holds every section published so far (a release is the previous
-- one with the newly published sections laid over it), so the current row
-- alone is the whole published site. `sections` names the ones this release
-- changed, for the dashboard's history.
create table if not exists public.site_content_releases (
  id           bigint generated always as identity primary key,
  content      jsonb not null,
  sections     text[] not null default '{}',
  is_current   boolean not null default false,
  published_at timestamptz not null default now()
);

alter table public.site_content_releases drop constraint if exists site_content_releases_content_check;
alter table public.site_content_releases add constraint site_content_releases_content_check
  check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 500000);

-- One current release, at most, enforced by the database itself.
create unique index if not exists site_content_releases_one_current
  on public.site_content_releases (is_current) where is_current;

comment on table public.site_content_releases is
  'Published website content (lib/cms). One row is_current; the public reads only that row. Rows are never edited or deleted.';


-- ----------------------------------------------------------------------------
-- 3. Row level security and grants
-- ----------------------------------------------------------------------------
alter table public.site_content_drafts   enable row level security;
alter table public.site_content_releases enable row level security;

drop policy if exists "site_content_drafts: admin reads"   on public.site_content_drafts;
drop policy if exists "site_content_drafts: admin writes"  on public.site_content_drafts;
drop policy if exists "site_content_releases: public reads current" on public.site_content_releases;
drop policy if exists "site_content_releases: admin reads all"      on public.site_content_releases;

create policy "site_content_drafts: admin reads"
  on public.site_content_drafts for select to authenticated
  using ((select public.is_admin()));

create policy "site_content_drafts: admin writes"
  on public.site_content_drafts for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- The website, at build time, with the anon key. Only the current release:
-- an older one is not what the site says, so it is not the public's to read.
create policy "site_content_releases: public reads current"
  on public.site_content_releases for select to anon, authenticated
  using (is_current);

create policy "site_content_releases: admin reads all"
  on public.site_content_releases for select to authenticated
  using ((select public.is_admin()));

-- No insert, update or delete policy on releases, for anyone: a release is
-- only ever written by publish_site_content() below, which runs as the
-- table's owner after checking is_admin() itself.

revoke all on public.site_content_drafts, public.site_content_releases from anon, authenticated;
grant select on public.site_content_releases to anon, authenticated;
grant select, insert, update, delete on public.site_content_drafts to authenticated;


-- ----------------------------------------------------------------------------
-- 4. The rebuild request, and its log
-- ----------------------------------------------------------------------------
-- In a schema the API does not serve (0008 creates it too).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.site_content_rebuilds (
  id           bigint generated always as identity primary key,
  release_id   bigint,
  requested_at timestamptz not null default now(),
  requested_by uuid,
  -- pg_net's id for the request, to read Cloudflare's answer back.
  request_id   bigint,
  -- requested | not_configured | unavailable
  outcome      text not null
);

-- Asks Cloudflare Pages to rebuild the site, if the deploy hook is in Vault
-- and pg_net is installed, and notes what happened. Never raises: a release
-- is published whether or not the request could be sent, and the dashboard
-- reports the outcome.
create or replace function private.request_content_rebuild(p_release bigint)
returns text
language plpgsql
security definer
set search_path = private, pg_temp
as $fn$
declare
  hook    text;
  request bigint;
  outcome text := 'not_configured';
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute $q$select decrypted_secret from vault.decrypted_secrets
               where name = 'cloudflare_pages_deploy_hook' limit 1$q$
      into hook;
  end if;

  if hook is not null and btrim(hook) <> '' then
    if exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'net' and p.proname = 'http_post'
    ) then
      begin
        execute 'select net.http_post(url := $1, body := $2, headers := $3)'
          into request
          using btrim(hook),
                jsonb_build_object('release', p_release),
                '{"Content-Type": "application/json"}'::jsonb;
        outcome := 'requested';
      exception when others then
        outcome := 'unavailable';
      end;
    else
      outcome := 'unavailable';
    end if;
  end if;

  insert into private.site_content_rebuilds (release_id, requested_by, request_id, outcome)
  values (p_release, auth.uid(), request, outcome);
  return outcome;
end
$fn$;

revoke all on function private.request_content_rebuild(bigint) from public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. Publish
-- ----------------------------------------------------------------------------
-- Takes every draft (or only `p_sections`), lays them over the current
-- release as a new current release, removes those drafts, and asks for a
-- rebuild, in one transaction.
--
-- `p_expected_release` is the release the dashboard was showing. If another
-- device has published since, this refuses rather than publishing over words
-- Nat has not seen; she reloads and looks first. Null means "nothing was
-- published yet".
create or replace function public.publish_site_content(
  p_expected_release bigint,
  p_sections text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  current_row public.site_content_releases%rowtype;
  taken       jsonb;
  names       text[];
  merged      jsonb;
  new_id      bigint;
  new_at      timestamptz;
  rebuild     text;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  -- One publish at a time.
  perform pg_advisory_xact_lock(hashtext('public.publish_site_content'));

  select * into current_row from public.site_content_releases where is_current;

  -- PT409 / PT422: PostgREST answers these as HTTP 409 and 422, and the
  -- dashboard turns each into its own sentence (lib/cms/admin.ts).
  if current_row.id is distinct from p_expected_release then
    raise exception 'The website was published from somewhere else in the meantime.'
      using errcode = 'PT409', hint = 'Reload the dashboard and review the changes again.';
  end if;

  with removed as (
    delete from public.site_content_drafts
     where p_sections is null or section = any (p_sections)
    returning section, content
  )
  select jsonb_object_agg(section, content), array_agg(section order by section)
    into taken, names
    from removed;

  if names is null then
    raise exception 'There is nothing to publish.' using errcode = 'PT422';
  end if;

  merged := coalesce(current_row.content, '{}'::jsonb) || taken;

  update public.site_content_releases set is_current = false where is_current;
  insert into public.site_content_releases (content, sections, is_current)
  values (merged, names, true)
  returning id, published_at into new_id, new_at;

  rebuild := private.request_content_rebuild(new_id);

  return jsonb_build_object(
    'release', new_id,
    'published_at', new_at,
    'sections', to_jsonb(names),
    'rebuild', rebuild
  );
end
$fn$;

revoke all on function public.publish_site_content(bigint, text[]) from public, anon;
grant execute on function public.publish_site_content(bigint, text[]) to authenticated;


-- ----------------------------------------------------------------------------
-- 6. Status, for the dashboard
-- ----------------------------------------------------------------------------
-- Whether automatic publishing is switched on, and what the last rebuild
-- request came to: pg_net keeps Cloudflare's answer for a few hours.
-- SECURITY DEFINER to read Vault and the private log; admin only.
create or replace function public.site_content_status()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  current_row public.site_content_releases%rowtype;
  last_req    private.site_content_rebuilds%rowtype;
  hooked      boolean := false;
  netted      boolean;
  answer      jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  select * into current_row from public.site_content_releases where is_current;
  select * into last_req from private.site_content_rebuilds order by id desc limit 1;

  if to_regclass('vault.decrypted_secrets') is not null then
    execute $q$select exists (select 1 from vault.decrypted_secrets
               where name = 'cloudflare_pages_deploy_hook'
                 and btrim(coalesce(decrypted_secret, '')) <> '')$q$
      into hooked;
  end if;

  netted := exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'net' and p.proname = 'http_post'
  );

  if last_req.request_id is not null and to_regclass('net._http_response') is not null then
    execute $q$select jsonb_build_object('status_code', status_code, 'timed_out', timed_out,
                                         'error', error_msg)
                 from net._http_response where id = $1$q$
      into answer
      using last_req.request_id;
  end if;

  return jsonb_build_object(
    'release', current_row.id,
    'published_at', current_row.published_at,
    'drafts', (select count(*) from public.site_content_drafts),
    'auto_publish', hooked and netted,
    'last_rebuild', case when last_req.id is null then null else jsonb_build_object(
      'release', last_req.release_id,
      'requested_at', last_req.requested_at,
      'outcome', last_req.outcome,
      'response', answer
    ) end
  );
end
$fn$;

revoke all on function public.site_content_status() from public, anon;
grant execute on function public.site_content_status() to authenticated;


-- ----------------------------------------------------------------------------
-- 7. Ask again
-- ----------------------------------------------------------------------------
-- For when a rebuild request failed or a build did not finish: asks for a
-- rebuild of the current release once more. At most once a minute, so a
-- double tap cannot queue a second build.
create or replace function public.retry_site_content_rebuild()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  current_id bigint;
  last_at    timestamptz;
  outcome    text;
begin
  if not public.is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  select max(requested_at) into last_at from private.site_content_rebuilds;
  if last_at is not null and last_at > now() - interval '60 seconds' then
    return jsonb_build_object('rebuild', 'too_soon');
  end if;

  select id into current_id from public.site_content_releases where is_current;
  outcome := private.request_content_rebuild(current_id);
  return jsonb_build_object('release', current_id, 'rebuild', outcome);
end
$fn$;

revoke all on function public.retry_site_content_rebuild() from public, anon;
grant execute on function public.retry_site_content_rebuild() to authenticated;


-- ----------------------------------------------------------------------------
-- Verify (each should return what the comment says)
-- ----------------------------------------------------------------------------
--   select to_regclass('public.site_content_releases') is not null;
--     -> true
--   select policyname, cmd, roles from pg_policies
--    where tablename in ('site_content_drafts', 'site_content_releases');
--     -> four rows: drafts admin reads/writes, releases public reads current,
--        releases admin reads all
--   select id, sections, is_current, published_at from public.site_content_releases
--    order by id desc limit 5;
--     -> empty until Nat publishes; then one is_current row
--   select release_id, requested_at, outcome from private.site_content_rebuilds
--    order by id desc limit 3;
--     -> 'requested' once the deploy hook is in Vault (see 0008)
