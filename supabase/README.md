# Crowned by Nat — Supabase setup

Everything in this file is a **manual step that has not been done for you**. The
code is complete and the site builds and deploys without any of it, but until
these are finished the account and booking screens will honestly report that
the booking system is not connected.

Work through it in order. It takes about fifteen minutes.

---

## Why Supabase, and why the site still works without it

The site is a **static export** (`output: "export"` in `next.config.ts`) served
by Cloudflare Pages. There is no Node server, no API route, no server action and
no middleware anywhere in the deployment, and there must not be — adding one
breaks the build command Cloudflare is configured with.

That rules out every "put the secret on the server" pattern, because there is no
server. What is left is a database the browser can talk to directly, where the
authorization rules live **in the database** rather than in the client. That is
exactly what Supabase is: Postgres, an auth service, and Row Level Security
deciding what each request is allowed to see.

If the two environment variables are missing, `lib/supabase/client.ts` reports
the project as unconfigured, `/book` falls back to the email request form the
site had before, and `/account` and `/admin` say so plainly. Nothing crashes and
nothing pretends to work.

---

## 1. Create the project

1. <https://supabase.com/dashboard> → **New project**
2. Name it something like `crown-by-nat`. Pick the region closest to Maryland
   (`us-east-1`).
3. Save the database password somewhere safe. You will not need it for this
   site, but you will need it if you ever use the Supabase CLI.

---

## 2. Apply the schema

1. Dashboard → **SQL Editor** → **New query**
2. Paste the entire contents of
   `supabase/migrations/0001_crown_by_nat_foundation.sql`
3. **Run**
4. Repeat for every later file in `supabase/migrations/`, each in its own
   query, in order, through
   `0006_owner_photo_manager.sql` (the photo manager's storage bucket,
   policies and owner functions) and
   `0007_website_photos.sql` (the website's own photographs as rows Nat
   manages, and which one fills each place on the site). See
   `docs/photo-manager.md`.
5. Optional: `0008_rebuild_site_on_photo_change.sql` rebuilds the site by
   itself after Nat changes photographs. It does nothing until a Cloudflare
   deploy hook is stored in Vault; `docs/photo-manager.md` has both steps.
6. Optional: `0009_revoke_excess_api_grants.sql` takes back table privileges
   Supabase grants by default and nothing here uses (it only revokes; the site
   does not change). `docs/photo-manager.md`, "Who can do what", says why and
   how to check whether a project needs it.

Each should finish with no errors. On a fresh project that is the whole job.

### Which migrations to run

There is no record of which files have been run: the SQL editor keeps none
(only `supabase db push` fills `supabase_migrations.schema_migrations`). So
before running anything on a project that might already have some of them,
ask the database. This only reads:

```sql
select
  to_regclass('public.appointments')  is not null                  as "0001",
  to_regclass('public.gallery_items') is not null                  as "0002",
  to_regprocedure('public.promote_studio_owner(text)') is not null as "0006",
  to_regclass('public.site_photo_slots') is not null               as "0007",
  to_regprocedure('private.request_site_rebuild()') is not null    as "0008";
```

If `0001` is true, this tells 0003, 0004 and 0005 apart:

```sql
select slug, name, price_cents, active from public.services order by slug;
```

| What the services list shows | Applied |
| --- | --- |
| `frontal-install` ... and `wig-touch-up` named **Wig Touch Up**, 3500 | 0003, 0004 and 0005 |
| `frontal` and `closure`, `wig-touch-up` named **Reinstalls**, 5500 | 0003 and 0004, not 0005 |
| `frontal` and `closure`, `wig-touch-up` named **Wig Touch-up** | 0003, not 0004 |
| `frontal` and `closure`, no `wig-touch-up` | 0001 only |

Run only the files that are missing, in order. If the result matches none of
these rows, stop and work out why before running anything.

**Re-running an older file over a newer one does damage.** No file errors
when run twice, but these were checked against a local Supabase with all six
applied (2026-10-08):

- **0001** again can put back the two placeholder services 0005 renamed away
  (*Full frontal install* $180 and *Closure install* $140, both bookable),
  after which 0005 fails with a duplicate key and cannot clean them up. It
  also restores the older `is_admin()` (no check that the sign-in still
  exists) and `protect_profile_columns()` (which blocks
  `promote_studio_owner()`), until 0006 is run again.
- **0004** again renames the $35 *Wig Touch Up* to *Reinstalls*.
- **0005** again switches Laurel back on, switches *Customization only* and
  *Reinstall and refresh* back off, and resets Wig Touch Up's name, price and
  description, whatever was set from the dashboard since.

0002, 0003, 0006, 0007, 0008 and 0009 are harmless to repeat. 0007 seeds the
website's photographs exactly once, ever (it records that it did), so running
it again never brings back a photograph Nat has removed.

**What it creates**

| Object | What it is |
| --- | --- |
| `profiles` | One row per account. Holds the `role` (`customer` / `admin`). |
| `locations` | Towson (active) and Laurel (inactive since 2026-09-02), each with an `active` switch. Only active rows are readable by `anon`, so an inactive town is not advertised and cannot be booked. |
| `services` | The four services, seeded from the website copy. |
| `appointments` | Guest and customer bookings in one table. |
| RLS policies | The actual security. See §7. |
| `is_admin()` | The single source of truth for "is this Nat". |
| `booked_slots()` | Returns which times are taken, and nothing else. |
| `create_guest_appointment()` | The only write an anonymous visitor can make. |
| `admin_stats()` | Dashboard counters. Refuses non-admins itself. |
| Triggers | Derive prices/durations/names server-side, protect the `role` column, freeze customer-editable fields, and enforce the no-double-booking rule. |

**Verify it worked.** In the SQL editor:

```sql
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
 order by tablename;
```

All four tables must show `rowsecurity = true`. If any shows `false`, stop and
re-run the migration — the site is not safe to use until they are all true.

---

## 3. Authentication settings

Dashboard → **Authentication** → **Sign In / Providers**

- **Email** provider: **enabled**
- **Confirm email**: **ON** ← *this one matters, see below*
- Leave every other provider off. Nothing in this project uses OAuth.

### Why "Confirm email" must be on

Guest bookings are matched to new accounts by email address
(`claim_guest_appointments()` in the migration). The trigger only fires when
Supabase records that a confirmation link was actually clicked, so with
confirmation ON, "prove you own this address" is a real proof.

With confirmation OFF, the trigger never fires at all — it is written to fail
closed. Nothing breaks, but a customer who booked as a guest and later signs up
will not see their old appointment, and you would have to link it by hand.

Dashboard → **Authentication** → **URL Configuration**

- **Site URL**: `https://crownedbynat.com`
- **Redirect URLs**: add every origin the site runs on, each with `/**`:

```
https://crownedbynat.com/**
https://wig-install-site.pages.dev/**
http://localhost:3000/**
```

The site only ever asks to come back to three paths: `/admin/login/` (the
owner's sign-in email), `/account/` (customer sign-up confirmation) and
`/reset-password/` (customer password reset). Exact entries for those three
on each origin work as well as the wildcards.

**This allowlist is not optional.** It is what stops the password-reset flow
being an open redirect: Supabase refuses to send anyone to a URL that is not on
it. If a reset link "does nothing", the origin is missing from this list.

### Email templates (required for the photo manager)

Dashboard → **Authentication** → **Email Templates**. Replace these two with
the branded versions in `supabase/templates/`:

| Template | Subject | Body |
| --- | --- | --- |
| Magic Link | `Your Crowned by Nat sign-in code` | `templates/magic-link.html` |
| Confirm signup | `Confirm your email for Crowned by Nat` | `templates/confirmation.html` |

Nat signs in to the photo manager with a 6-digit code, and the default
templates do not contain one (`{{ .Token }}`). Both new templates keep the
link as well, so customer sign-up confirmation works exactly as before.

### Email delivery (required)

Supabase's built-in email service **only delivers to members of the Supabase
organization's team** ("Email address not authorized" for anyone else), and is
rate-limited to a handful of messages per hour. Before launch, set up a real
SMTP provider under **Authentication → Emails → SMTP Settings**, or customer
confirmations, password resets and Nat's sign-in codes will fail. As a
stop-gap for Nat alone, invite `crownedbynattt@gmail.com` to the organization
(**Organization settings → Team**).

---

## 4. Environment variables

Dashboard → **Project Settings** → **API**. Copy two values.

### Local development

Create `.env.local` in the project root (it is git-ignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon / publishable key>
```

Then `npm run dev`.

### Cloudflare Pages

Dashboard → your Pages project → **Settings** → **Environment variables**. Add
the same two names and values to **both Production and Preview**.

Then **redeploy**. These are compiled into the JavaScript at build time, so
adding them to an existing project changes nothing until a new build runs:
**Deployments → the latest one → Retry deployment**.

### The key you must never add

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. There is
nowhere in a static export for it to hide — no server runtime exists — so
adding it to this project would either do nothing or, prefixed with
`NEXT_PUBLIC_`, publish it to the internet. If a future feature needs it, it
belongs in a Supabase Edge Function or a separate Cloudflare Worker.

---

## 5. Make Nat an admin

**This is the one step with no UI, on purpose.** A signup form that can produce
an administrator is a signup form an attacker can produce an administrator
with. `handle_new_user()` writes the literal `'customer'` for every signup and
never reads the role from anything the browser sent, so the only way to become
an admin is for someone with database access to say so.

In order:

1. Nat goes to `https://<your-site>/admin/login/`, enters
   **`crownedbynattt@gmail.com`**, and types the code from the
   *"Confirm your email"* message. (Needs the templates and email delivery
   from §3.) She sees *"Owner access is not switched on yet"*; that is
   expected.
2. Dashboard → **SQL Editor**, and run:

```sql
select public.promote_studio_owner('crownedbynattt@gmail.com');
```

3. Confirm it took:

```sql
select email, role from public.profiles where role = 'admin';
```

You should get exactly one row. Nat signs in again at `/admin/login/` and can
use `/admin/photos/` and `/admin/`.

`promote_studio_owner()` (migration 0006) refuses an account whose email has
not been confirmed, replaces any password on it with a random one nobody knows
(the owner signs in with emailed codes only, and an impostor could otherwise
have pre-registered her address with a password of their own), and ends every
existing sign-in so the role only ever belongs to a session that starts
afterwards. It cannot be called from the website.

> **Before 0006 the documented step did not work.** The old instruction was a
> plain `update public.profiles set role = 'admin' ...`, and
> `protect_profile_columns()` rejected it from the SQL editor with "Account
> role cannot be changed" (verified against a local Supabase stack). 0006 lets
> trusted sessions with no end-user JWT (the SQL editor, migrations) change a
> role; browser requests are unaffected.

To remove an admin later:
`update public.profiles set role = 'customer' where email = '...';`

---

## 6. Check it end to end

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Open `/` | The strip above the hero reads "Now booking in Towson, MD" |
| 2 | Open `/book/` | Five-step flow. Only Towson offered |
| 3 | Book as a guest | A `CBN-XXXXXX` reference on screen |
| 4 | Sign up as a customer, confirm the email | Lands on `/account/` |
| 5 | Book while signed in | Appears under Upcoming on `/account/` |
| 6 | Open `/admin/` as that customer | "This page is not available on your account" |
| 7 | Open `/admin/` as Nat | The dashboard, with both bookings listed |
| 8 | Admin → Locations → switch Towson off, Laurel on | Homepage strip flips to Laurel |
| 9 | Re-check the Towson booking | **Still says Towson, MD** |
| 10 | Try to book the slot you already took | "Someone just took that slot" |

Step 9 is the one worth doing carefully. It is the guarantee that an
appointment keeps its own history rather than inheriting whatever the site
currently says.

The photo manager has its own end-to-end checklist in
`docs/photo-manager.md` (§7).

---

## 7. The security model

Read this before changing any policy.

**Every authorization rule lives in the database.** The browser holds the anon
key, so anything the policies permit is reachable by anyone who opens
devtools — and anything they forbid cannot be reached at all, no matter what
the UI does. Hiding a button is a courtesy. The policies are the control.

### Who can do what

| | `anon` (not signed in) | Customer | Nat (admin) |
| --- | --- | --- | --- |
| Read active locations / services | yes | yes | yes (plus inactive) |
| Read **any** appointment | **no** | own only | all |
| Read **any** profile | **no** | own only | all |
| Create a booking | via `create_guest_appointment()` only | own only | any |
| Cancel a booking | no | own, up to 24h before | any |
| Change a date or time | no | **no** — request only | yes |
| Change a `role` | no | **no** — trigger raises | yes |
| Change locations / services | no | no | yes |
| Read published gallery photos | yes | yes | yes (plus hidden) |
| Upload, edit, replace or delete photos (`gallery_*` tables, `website-photos` bucket) | no | no | yes |
| Choose which photo fills a place on the site (`site_photo_slots`, collection covers) | no | no | yes |
| List the `website-photos` bucket | no | no | yes |

Since 0006, `is_admin()` also requires the sign-in behind the request to still
exist (`auth.sessions`), so Nat's admin rights end the moment she logs out or
her sessions are revoked, rather than when her access token expires.

### The five things that carry the weight

1. **`role` cannot be set from the browser.** `handle_new_user()` hardcodes
   `'customer'`. `protect_profile_columns()` raises an exception on any change
   to `role` by a non-admin. There is no third path.
2. **Customers cannot see each other.** The appointments SELECT policy is
   `customer_id = auth.uid() OR is_admin()`. `anon` has no SELECT policy on
   that table at all, and no table privilege either.
3. **The browser is not trusted with booking data.**
   `before_appointment_write()` re-reads the service and location and derives
   the price, duration, display names and status server-side. A forged request
   cannot book an inactive service or shrink a duration to fit a gap.
4. **Double booking is impossible, not unlikely.** An `EXCLUDE USING gist`
   constraint refuses two overlapping live appointments at one location. Two
   people clicking the same slot resolve to one winner and one clear message.
5. **Rescheduling is a request.** `protect_appointment_columns()` resets the
   date and time for any caller who is not an admin, so the customer-side
   "ask to move it" cannot become a direct mutation even if the request is
   rebuilt by hand.

### Known limits of this phase

Written down rather than glossed over:

- **Guest bookings are an unauthenticated write.** They have to be — that is
  what "book without an account" means. `create_guest_appointment()` caps it at
  three live requests per hour per email or phone number, which stops a naive
  script but not a determined one. The proper fix is Cloudflare Turnstile in
  front of a Supabase Edge Function; the booking architecture does not need to
  change to add it.
- **No guest appointment lookup.** Deliberately. "Type your reference to see
  your booking" turns a six-character code into a bearer token. Doing it
  properly means emailing a signed link, which needs an email provider this
  project does not have yet.
- **No email or SMS confirmations.** On-screen confirmation only. Adding them
  later is a Supabase Edge Function on an `appointments` insert trigger; no
  schema change is required, which is why `created_at`, `status` and the
  snapshot columns are all already there.
- **Opening hours are a fixed weekly grid** in `lib/booking/availability.ts`,
  not per-day settings Nat can edit. There is no holiday calendar and no way to
  close a single afternoon from the dashboard. The database enforces a coarse
  floor (half-hour boundaries, 08:00–23:00, closed Sunday and Monday); the fine
  grid is in the app. The booking window is 10:00–21:00, with the Early Bird
  and After Hours add-ons booking either side of it.
- **No payments.** None were asked for and none are implied anywhere in the UI.

---

## 8. Troubleshooting

**"Accounts are not open yet" on every account page**
The environment variables are missing, or Cloudflare has not rebuilt since they
were added. See §4.

**A password reset link does nothing**
The origin is not in Supabase's Redirect URLs allowlist. See §3.

**Nat sees "Owner access is not switched on yet" at `/admin/` or `/admin/photos/`**
The promotion in §5 has not been run, or was refused because her account did
not exist or was not confirmed yet. Run `promote_studio_owner()` again and
check the `select` returns a row; then she signs in again.

**"row-level security policy" errors when Nat saves something**
Same cause: the account is not actually an admin yet, or her sign-in has ended.
Every admin policy calls `is_admin()`, which reads the `profiles.role` column
and checks the session still exists.

**Nat's sign-in email never arrives, or the page says "not allowed to email
this address"**
Email delivery in §3. The built-in service only emails members of the Supabase
team.

**A booking fails with "Someone just took that slot"**
Working as designed — the `EXCLUDE` constraint refused an overlap. Pick another
time.

**Everything returns empty for a logged-in customer**
Check that `on_auth_user_created` exists on `auth.users`. Without it the profile
row is never created:

```sql
select tgname from pg_trigger where tgname = 'on_auth_user_created';
```
