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

It should finish with no errors. It is written to be re-runnable, so if you have
to run it twice nothing breaks.

**What it creates**

| Object | What it is |
| --- | --- |
| `profiles` | One row per account. Holds the `role` (`customer` / `admin`). |
| `locations` | Towson and Laurel, each with an `active` switch. |
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

- **Site URL**: your production domain, e.g. `https://crownedbynat.pages.dev`
- **Redirect URLs**: add every origin the site runs on, each with `/**`:

```
http://localhost:3000/**
https://crownedbynat.pages.dev/**
https://<your-custom-domain>/**
```

**This allowlist is not optional.** It is what stops the password-reset flow
being an open redirect: Supabase refuses to send anyone to a URL that is not on
it. If a reset link "does nothing", the origin is missing from this list.

### Email templates (optional but worth ten minutes)

Dashboard → **Authentication** → **Email Templates**. The defaults say
"Supabase". Change the sender name to Crowned by Nat and the wording to match the
site's voice.

Supabase's built-in email service is rate-limited to a handful of messages per
hour and is meant for development. Before launch, set up a real SMTP provider
under **Project Settings → Authentication → SMTP Settings**, or password resets
will start silently failing on a busy day.

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

1. Go to `https://<your-site>/signup/` and sign up as
   **`crownedbynattt@gmail.com`**.
2. Open the confirmation email and click the link.
3. Dashboard → **SQL Editor**, and run:

```sql
update public.profiles
   set role = 'admin', updated_at = now()
 where lower(email) = lower('crownedbynattt@gmail.com');
```

4. Confirm it took:

```sql
select email, role from public.profiles where role = 'admin';
```

You should get exactly one row. Nat can now open `/admin`.

> The migration in §2 runs that same `update` at the end, so if the account
> already existed when you applied it, this is already done and step 3 is a
> harmless no-op. If you applied the migration first (the normal order), you do
> need to run the statement above afterwards.

To remove an admin later, set `role = 'customer'` the same way.

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
  floor (half-hour boundaries, 08:00–19:00, closed Sunday and Monday); the fine
  grid is in the app.
- **No payments.** None were asked for and none are implied anywhere in the UI.

---

## 8. Troubleshooting

**"Accounts are not open yet" on every account page**
The environment variables are missing, or Cloudflare has not rebuilt since they
were added. See §4.

**A password reset link does nothing**
The origin is not in Supabase's Redirect URLs allowlist. See §3.

**Nat sees "This page is not available on your account" at `/admin`**
The promotion in §5 has not been run, or was run before the account existed.
Re-run the `update` and check the `select` returns a row.

**"row-level security policy" errors when Nat saves something**
Same cause: the account is not actually an admin yet. Every admin policy calls
`is_admin()`, which reads the `profiles.role` column.

**A booking fails with "Someone just took that slot"**
Working as designed — the `EXCLUDE` constraint refused an overlap. Pick another
time.

**Everything returns empty for a logged-in customer**
Check that `on_auth_user_created` exists on `auth.users`. Without it the profile
row is never created:

```sql
select tgname from pg_trigger where tgname = 'on_auth_user_created';
```
