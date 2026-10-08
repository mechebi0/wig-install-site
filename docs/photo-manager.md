# The photo manager

Nat's private page for adding, editing, reordering and removing the photos in
the website's gallery, without anyone editing code.

| | |
| --- | --- |
| **Sign in** | `https://crownedbynat.com/admin/login/` |
| **Photo manager** | `https://crownedbynat.com/admin/photos/` |
| **Owner account** | `crownedbynattt@gmail.com` |
| **Password** | None. Nat signs in with a code emailed to that address. |

Neither page is linked from the public site. Bookmark them. (The same paths
also work on the Cloudflare Pages address, `https://wig-install-site.pages.dev`.)

> **Status (2026-10-08):** the code is finished and deployed. A Supabase
> project now exists with email sign-in and custom SMTP switched on, but the
> live site was built without its two environment variables (checked on
> 2026-10-08: the JavaScript served by crownedbynat.com contains no Supabase
> address), so both pages still say *"The photo manager is not connected
> yet."* Whether the migrations, URL configuration and email templates are in
> place cannot be seen from this repository; work through
> [One-time setup](#one-time-setup-for-the-developer) and skip what is done.

---

## For Nat

### Signing in

1. Open the sign-in page above and type `crownedbynattt@gmail.com`.
2. Tap **Email me a code**.
3. Open the email from Crowned by Nat and type the 6-digit code on the page,
   then tap **Sign in**. (If you are reading the email on the same phone or
   computer, you can tap the **Sign in** button in the email instead.)

The code works once and expires after an hour. You stay signed in on that
device until you tap **Log out**.

The very first time, the email says *"Confirm your email"* instead. Type its
code the same way. You will then see *"Owner access is not switched on yet"*;
that is expected. Your developer runs one setup step, and from then on you go
straight to the photo manager.

### Adding photos

1. Tap **Choose photos** and pick up to 12 from your phone or computer.
   Big photos are resized for the web automatically. Tall (portrait) photos
   fit the gallery best.
2. For each photo, write a short **description** of the hair, for visitors
   who use a screen reader. For example: *"A long body-wave install with a
   side part and laid edges."* A **title** is optional; it shows over the
   photo in the gallery.
3. Choose the **collections** it belongs to (the gallery pages: Deep Wave
   Glam, Sleek Straight, and so on). At least one.
4. If you are sure which install it is, choose the **install type** (Frontal
   Install, Closure Install or Reinstalls). The photo then also appears on that
   install's page. Leave it on *Not specified* if you are not sure.
5. Leave **Show on the website** ticked to publish now, or untick it to keep
   the photos hidden until you are ready.
6. Tap **Upload**. Keep the page open until it says the photos are uploaded.

New photos appear on the website straight away, after the photos already in
each gallery.

### Editing, hiding and reordering

Under **Your photos**, every upload is listed in the order the gallery shows
them.

- **Edit** changes the title, description, collections, install type, or
  whether it is shown. Untick *Show on the website* to hide a photo without
  deleting it.
- The **up and down arrows** move a photo earlier or later. The new order is
  saved immediately.

### Removing a photo

Tap **Remove** under the photo. The site asks *"Remove this photo?"*; tap
**Remove Photo** to confirm, or **Cancel** to keep it. Removing deletes the
photo from the website and from storage. It cannot be undone, so hide it
instead if you might want it back.

### The photos built into the website

The 17 photos the site launched with are part of its design: some are also
the homepage slideshow, the install pages' main photos and the picture shown
when the site is shared. They are listed at the bottom of the photo manager
for reference, but they are changed by your developer rather than from there.
Your uploads appear after them in each gallery.

---

## How it works

### Where things are stored

| What | Where |
| --- | --- |
| The image files | Supabase Storage, bucket **`website-photos`**, folder `gallery/`. Each photo is three WebP (or JPEG) files: `<id>.webp` (1200px wide), `<id>-600.webp` and `<id>-1600.webp`. |
| Title, description, install type, shown/hidden, order | Table **`gallery_items`** |
| Which collections a photo is in | Table **`gallery_item_categories`**, joined to **`gallery_categories`** (the six collections, seeded in migration 0002) |

The browser resizes every photo before uploading it (largest side 1600px),
turns it upright, and saves it as WebP. That also strips the phone's location
and camera details from the file. Files are named with a random id and cached
for a year.

### How the public site shows them

The site is still a static export on Cloudflare Pages. The built-in photos are
in the HTML exactly as before, so nothing about the existing pages changed.
After a gallery page loads, the browser asks Supabase for published uploads
and adds them after the built-in photos: on each collection page, on the
install pages (by install type), and in the "N looks" counts. If Supabase is
not configured or does not answer, visitors simply see the built-in photos.

Removing a photo deletes its database row first (so it leaves the website
immediately) and then its three files. If the files cannot be deleted at that
moment, the photo manager removes any file that no photo points to the next
time it opens (files under a day old are left alone, in case an upload is
still running somewhere).

### Who can do what

Security is enforced by Supabase, not by the pages. The pages are static files
anyone can download; what matters is what the database and storage will
accept from them.

| | Public visitor | Any other signed-in account | Nat |
| --- | --- | --- | --- |
| See published photos | yes | yes | yes |
| See hidden photos | no | no | yes |
| List the storage bucket | no | no | yes |
| Upload, change or delete photos and files | **no** | **no** | yes |

- Every write is checked by **row level security** on `gallery_items` and
  `gallery_item_categories`, and by **Storage policies** on the
  `website-photos` bucket. Both call `public.is_admin()`, the same check the
  booking dashboard already used: it reads `profiles.role = 'admin'` in the
  database, and (since migration 0006) also requires the sign-in that the
  request comes from to still exist. Logging out therefore ends admin access
  immediately, not when the token expires.
- The owner email appears in the browser code only to stop the sign-in page
  emailing codes to strangers. It grants nothing.
- Nobody becomes an admin by signing up. The role is granted once, by hand,
  with `public.promote_studio_owner()` (below), which cannot be called from the
  website.
- The browser only ever has the project URL and the **anon/publishable** key,
  which are designed to be public. The **service role / secret key** is not
  used anywhere and must never be added to this project or to Cloudflare.
- Uploads are limited by the bucket itself to WebP/JPEG, 5 MB, inside
  `gallery/`.

---

## One-time setup (for the developer)

Do these in order. Steps 1 to 3 are shared with the booking system; skip any
already done (see `supabase/README.md` for those in more detail).

### 1. Apply the migrations

Before the environment variables, so the site never asks for tables that do
not exist yet (the stripe above the nav would lose its town names until they
did).

Supabase dashboard → **SQL Editor**. First find out what is already there; this
only reads:

```sql
select
  to_regclass('public.appointments')  is not null                  as "0001",
  to_regclass('public.gallery_items') is not null                  as "0002",
  to_regprocedure('public.promote_studio_owner(text)') is not null as "0006";
```

- All `false`: a fresh project. Run every file in `supabase/migrations/`, in
  order, `0001` through `0006`, each in its own query.
- Anything `true`: some were run before. Do **not** run them all again; see
  "Which migrations to run" in `supabase/README.md` §2, which shows how to
  tell 0003-0005 apart and why re-running an older file over a newer one
  does damage.

0006 is the photo manager: the storage bucket, its policies, the extra photo
columns and the owner functions. 0006 on its own is safe to run again.

### 2. Environment variables

Set these two variables in **Cloudflare Pages → Settings → Environment
variables** (Production and Preview), then redeploy (**Deployments → the
latest one → Retry deployment**; they are compiled in at build time, so
nothing changes until a new build runs):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon / publishable key>
```

Both values are in the project's **Connect** panel and under **Project
Settings**. The legacy anon key and the newer `sb_publishable_...` key both
work (both were tested against a local Supabase on 2026-10-08).
No other variable is needed. They are listed, without values, in
`.env.example`. Never add the service role or `sb_secret_...` key.

Connecting the project does not change the public pages: the gallery adds
Nat's uploads after the built-in photos; the location stripe and the /book
prices start reading the `locations` and `services` tables, which after 0005
hold the same towns and prices the site shows today; and the nav and footer
still leave out customer "Log in" links (`customerAccountsLinked` in
`lib/supabase/client.ts`).

### 3. Authentication settings

**Authentication → Sign In / Providers**
- Email provider **on**, *Confirm email* **on**, and *Allow new users to sign
  up* **on** (Nat's account is created the first time she signs in).

**Authentication → URL Configuration**
- Site URL: `https://crownedbynat.com`
- Redirect URLs: the site asks Supabase to send people back to exactly three
  pages, on whichever address it is open on:

  | Page | Used by |
  | --- | --- |
  | `/admin/login/` | the **Sign in** button in Nat's email (`components/auth/owner-sign-in.tsx`) |
  | `/account/` | a customer's "Confirm my email" button (`components/auth/signup-form.tsx`) |
  | `/reset-password/` | a customer's password-reset email (`components/auth/forgot-password-form.tsx`) |

  Add `https://crownedbynat.com/**` and `https://wig-install-site.pages.dev/**`
  (and `http://localhost:3000/**` for local work), or the three exact URLs
  per address if you prefer exact entries, e.g.
  `https://crownedbynat.com/admin/login/`. The trailing slash is part of each
  path. `www.crownedbynat.com` did not resolve on 2026-10-08, so it needs no
  entry unless it is set up later.

  Nat's 6-digit code does not depend on this list at all; only the link in
  the email does. A link to an address missing from the list is sent to the
  Site URL instead.

**Authentication → Emails → Templates**: Nat needs the *code* in her emails.
Supabase's default templates only contain a link, which on a phone often opens
in a different browser and fails. Replace two templates:

| Template | Subject | Body |
| --- | --- | --- |
| Magic Link | `Your Crowned by Nat sign-in code` | `supabase/templates/magic-link.html` |
| Confirm signup | `Confirm your email for Crowned by Nat` | `supabase/templates/confirmation.html` |

Both include `{{ .Token }}` (the code) and keep the confirmation link, so
customer sign-ups keep working.

### 4. Email delivery

**Required.** Supabase's built-in email service only delivers to members of
the Supabase organization's team; anything else fails with *"Email address not
authorized"*, and it is limited to a handful of emails per hour. Do one of:

- **Recommended:** connect a real email provider under **Authentication →
  Emails → SMTP Settings** (Resend, Postmark, SendGrid, Amazon SES, ...). This
  is also needed for customer sign-up and password-reset emails.
- **Stop-gap:** invite `crownedbynattt@gmail.com` to the Supabase
  organization (**Organization settings → Team**) so the built-in service will
  email her.

Custom SMTP was set up for this project on 2026-10-08. Its password or API
key lives only in the Supabase dashboard; it never goes in this repository,
in `.env*` files, or in Cloudflare.

### 5. Nat signs in once

Nat opens `/admin/login/`, enters `crownedbynattt@gmail.com`, and types the
code from the *"Confirm your email"* message. She will see *"Owner access is
not switched on yet."* Her account now exists and her address is confirmed.

### 6. Make Nat the owner

In the **SQL Editor**:

```sql
select public.promote_studio_owner('crownedbynattt@gmail.com');
```

It answers *"crownedbynattt@gmail.com is now the studio owner..."*. It refuses
an address that does not exist yet or has not been confirmed (step 5). It also:

- replaces any password on the account with a random one nobody knows, so the
  owner account can only be entered with an emailed code. (This closes a known
  gap: someone could have registered Nat's address with their own password
  before she first signed in.)
- ends every existing sign-in on the account, so admin rights only ever
  belong to a sign-in made afterwards.

Nat then signs in again at `/admin/login/` and lands in the photo manager.

Check it took (exactly one row):

```sql
select email, role from public.profiles where role = 'admin';
```

To remove owner access later:
`update public.profiles set role = 'customer' where email = 'crownedbynattt@gmail.com';`

### 7. Check it end to end

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Open `/admin/photos/` in a private window | Sent to `/admin/login/` |
| 2 | Sign in as Nat | The photo manager, with the owner email in the header |
| 3 | Upload a photo into *Body Wave* | "uploaded and showing on the website now" |
| 4 | Open `/gallery/body-wave-glam/` in a private window | The photo is last in the grid; the count went up by one |
| 5 | Edit it, untick *Show on the website* | Gone from the public gallery |
| 6 | Remove it | Confirmation first; then gone, and its files gone from Storage → `website-photos` |
| 7 | Sign in as a customer at `/login/`, open `/admin/photos/` | *"This page is not available on your account."* |
| 8 | Tap **Log out** | Back at the sign-in page |

---

## Troubleshooting

**"The photo manager is not connected yet."** The two environment variables
are missing, or Cloudflare has not rebuilt since they were added (step 1).

**"Supabase is not allowed to email this address yet."** Step 4.

**The email has a link but no code.** Step 3, templates.

**"Owner access is not switched on yet."** Step 6 has not been run, or was run
before Nat's first sign-in (it refuses then; run it again).

**"Your sign-in has ended."** Nat logged out on another device, or step 6 ended
her earlier sign-ins. Sign in again.

**"Too many codes have been sent just now."** Supabase limits how often codes
are sent. Wait a few minutes, or use the code from the last email.

**A photo shows in the manager but not on the site.** It is hidden (edit it
and tick *Show on the website*), or it is not in the collection being viewed.

**"This photo could not be opened in this browser."** Usually a HEIC file on a
computer that cannot read HEIC. Upload from the phone, or save it as JPEG.
