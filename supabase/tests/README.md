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
- Checks the booking pages a photograph is on (`booking_services`, 0010):
  nobody but the owner can change them, a value that is not a service is
  refused, and a hidden photograph never comes back for one.
- Re-runs migrations 0006 to 0010 on a database that already has them, and
  checks 0010's one-time seed does not run a second time.

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

## The content manager: `content-manager.mjs`

The same idea for the website's words (migration 0011,
`docs/content-manager.md`): attacks the draft and release tables and the
publishing functions as a visitor (client library and raw HTTP) and as a
signed-in customer, comparing both tables with a snapshot after every battery;
then, as the owner, saves drafts (including a save based on an old copy, which
must change nothing), publishes, refuses to publish over a release the
dashboard has not seen (HTTP 409) or with nothing to publish (422), checks the
public can read the current release and no other, and that the build's own
query (`next.config.ts`) gets it. It then stores a stand-in Cloudflare deploy
hook in Vault, pointing at a small server the suite starts on this machine
(`HOOK_PORT`, default 4599, reached from the database container as
`host.docker.internal`), and checks a publish sends exactly one request naming
the release, that the dashboard's status reports the answer (including a
refusal), that "ask again" is held to once a minute, and that a customer's
refused publish starts no rebuild. Last, a logged-out session's token, the
policies and grants as the database reports them, and re-running 0011.

Same variables as above (it needs no service-role key or JWT secret), plus
`CONTENT_MIGRATION=<path to 0011_website_content.sql>` for the re-run step:

```sh
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_ANON_KEY=<ANON_KEY> \
SUPABASE_DB_CONTAINER=supabase_db_<project_id> \
MAILPIT_URL=http://127.0.0.1:54324 \
CONTENT_MIGRATION=$PWD/supabase/migrations/0011_website_content.sql \
node supabase/tests/content-manager.mjs
```

It deletes every draft, release and stored deploy hook in the local database
it is pointed at, and refuses any non-local address.
