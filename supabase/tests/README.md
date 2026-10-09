# Owner-only tests

`owner-only.mjs` checks, against a real local Supabase, that only the studio
owner can change the website's photographs and that nobody else can get round
that by calling the API directly. It is the evidence behind the "Who can do
what" table in `docs/photo-manager.md`.

**It is for a LOCAL stack only.** It creates and deletes accounts, photographs
and files, and it refuses to start unless `SUPABASE_URL` is `localhost` or
`127.0.0.1`. Never point it at the hosted project.

## What it does

- Attacks as a visitor holding only the public key (through the client library
  and through raw HTTP), as a signed-in customer, as a stranger who got an
  account through the owner sign-in endpoint, and as look-alike addresses
  (`crownedbynattt+evil@gmail.com`, `crowned.bynattt@gmail.com`). Each attack
  is a valid request, so a refusal can only come from a policy or a grant.
  After every battery the database and the bucket are compared with a snapshot
  taken before it.
- Tries to escalate: updating its own role, upserting an admin profile, putting
  `role: admin` in user metadata, changing its email to the owner's.
- Signs in as the owner (typed in mixed case), checks the account is **not**
  admin until `promote_studio_owner()` is run, then runs every operation the
  photo manager performs.
- Logs out; expires a session; revokes a session; presents a validly signed
  token that belongs to no session; presents a tampered token.
- Reads the policies and grants from the database itself.
- Feeds the REAL error responses of the local GoTrue (rate limit, wrong code,
  an unreachable server) through `lib/auth/owner-errors.ts`.
- Re-runs migrations 0006 to 0009 on a database that already has them.

## Running it

You need Docker, the Supabase CLI, and a project directory holding the
migrations (any directory with `supabase/migrations/` copied from this repo and
a `config.toml` whose `[auth.email]` section has `enable_confirmations = true`
and the templates in `supabase/templates/` configured, so the emails carry the
6-digit code).

```sh
supabase start -x studio,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta,imgproxy
supabase status -o env        # prints the local URL and keys
```

Then, from this repository:

```sh
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=<ANON_KEY or PUBLISHABLE_KEY> \
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY> \
SUPABASE_JWT_SECRET=<JWT_SECRET> \
SUPABASE_DB_CONTAINER=supabase_db_<project_id> \
MAILPIT_URL=http://127.0.0.1:54324 \
MIGRATIONS_DIR=$PWD/supabase/migrations \
node supabase/tests/owner-only.mjs
```

The keys are the local stack's own throwaway demo keys. The service-role key is
used only to clear leftover test files, and the JWT secret only to forge a
token for the "forged token" check (it is skipped if unset). Neither is a
production credential, and neither belongs in a committed file.

Output is one `PASS` / `FAIL` line per check and a summary; the exit code is
non-zero if anything failed. Two `NOTE` lines are expected: the hidden-photo
file is reachable by exact URL (accepted, documented), and some escalation
attempts are accepted by the API but change nothing (the snapshot proves it).

Windows note: Docker Desktop reserves some port ranges, so the default `543xx`
ports can fail with "access permissions". Remap them in `config.toml`.

Everything else in `npm test` needs no Supabase.
