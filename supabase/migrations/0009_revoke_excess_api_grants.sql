-- ============================================================================
-- CROWNED BY NAT - 0009 - take back the privileges Supabase hands every table
-- ============================================================================
-- OPTIONAL HARDENING. Nothing is known to be exploitable without it, and
-- nothing on the website changes with it. Apply it the same way as the others:
-- Supabase dashboard -> SQL editor -> paste -> Run (or `supabase db push`).
-- Re-running it is harmless. It only REVOKES; it creates, alters and drops
-- nothing, and it touches no row level security policy.
--
-- ----------------------------------------------------------------------------
-- WHAT WAS FOUND
-- ----------------------------------------------------------------------------
-- Supabase creates every new table in `public` with its default privileges,
-- which on a project set up the usual way include INSERT, UPDATE, DELETE and
-- TRUNCATE for `anon`, and TRUNCATE, REFERENCES and TRIGGER for `authenticated`.
-- 0006 and 0007 already reset the photo tables to exactly what they need.
-- 0001 grants what its tables need but never takes the defaults away, although
-- its own comment says "anon gets exactly two tables, read only ... NOTHING on
-- profiles and NOTHING on appointments". On a fresh local Supabase the
-- defaults were still there on appointments, business_settings, locations,
-- profiles, reviews and services.
--
-- WHY IT WAS NEVER A HOLE
-- Row level security is on for every table in `public` and its policies only
-- let the owner write (is_admin()), so INSERT, UPDATE and DELETE by anon change
-- nothing: tested in supabase/tests/owner-only.mjs. TRUNCATE is the exception
-- worth closing. It is NOT subject to row level security, so the only thing
-- between a role holding it and an emptied table is that the REST API has no
-- way to send one. That is a property of the API's current verbs, not of the
-- database, so it is removed here rather than relied on.
--
-- WHAT THIS KEEPS
-- Every grant the site uses. anon keeps SELECT on the tables that publish
-- something (photographs, collections, places, reviews, locations, services,
-- settings), and keeps EXECUTE on the booking functions, which run as their
-- owner. authenticated keeps SELECT, INSERT, UPDATE and DELETE where 0001,
-- 0002, 0006 and 0007 granted them; each is still filtered by its policies.
-- ============================================================================

-- anon: read only. No write of any kind, and no TRUNCATE, on any table.
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public
  from anon;

-- Customer and owner accounts: the writes they need stay (and stay behind row
-- level security); the three that row level security cannot constrain go.
revoke truncate, references, trigger
  on all tables in schema public
  from authenticated;

-- 0001 documents that a visitor reads nothing from these two. The policies
-- already return no rows to anon; this removes the privilege as well.
revoke select on public.profiles, public.appointments from anon;


-- ----------------------------------------------------------------------------
-- Verify (each should return what the comment says)
-- ----------------------------------------------------------------------------
--   select table_name, privilege_type from information_schema.role_table_grants
--    where grantee = 'anon' and table_schema = 'public'
--      and privilege_type <> 'SELECT';
--     -> no rows
--   select table_name, privilege_type from information_schema.role_table_grants
--    where grantee = 'authenticated' and table_schema = 'public'
--      and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER');
--     -> no rows
--   select relname from pg_class
--    where relnamespace = 'public'::regnamespace and relkind = 'r'
--      and not relrowsecurity;
--     -> no rows (every table has row level security switched on)
