# The photo manager

Nat's private page for managing every photo on the Crowned by Nat website:
adding, replacing, editing, hiding, reordering and removing them, and
choosing which photo fills each spot on the site (the homepage slideshow,
the collection covers, the install pages), without anyone editing code.

| | |
| --- | --- |
| **Sign in** | `https://crownedbynat.com/admin/login/` |
| **Studio dashboard** | `https://crownedbynat.com/admin/`, where signing in lands: the website's words, prices and locations (`docs/content-manager.md`), and a link here |
| **Photo manager** | `https://crownedbynat.com/admin/photos/` |
| **Owner account** | `crownedbynattt@gmail.com` |
| **Password** | None. Nat signs in with a code emailed to that address. |

**Neither page is linked from the public site, and that is on purpose.** There
is no Admin link in the header, the mobile menu or the footer, so visitors are
never shown that an owner area exists. Nat reaches it by this address:
**`https://crownedbynat.com/admin/login/`**. Bookmark it on every device she uses
(on a phone, "Add to Home Screen" gives it an icon). (The same paths also work on
the Cloudflare Pages address, `https://wig-install-site.pages.dev`.)

> **Status (2026-10-09):** the live site is connected to Supabase and the
> owner sign-in works. `0007_website_photos.sql` has been run on the hosted
> project (read back that day: 18 photos, 13 places), so every photo on the
> site is manageable. `0010_photo_booking_services.sql` has **not** been run
> yet: until it is, the booking pages show photos by the starting rule and
> the photo manager cannot change them. See
> [One-time setup](#one-time-setup-for-the-developer), step 1.

---

## For Nat

### Signing in

1. Open the sign-in page above and type `crownedbynattt@gmail.com`.
2. Tap **Email me a sign-in code**.
3. Open the email from Crowned by Nat and type the 6-digit code on the page,
   then tap **Sign in**. (If you are reading the email on the same phone or
   computer, you can tap the **Sign in** button in the email instead.)

The code works once and expires after a short time. You stay signed in on that
device until you tap **Log out**, which signs you out on every device.

The page only ever says that a code was *requested*; it cannot know the email
arrived. If it has not come after a minute or two, check the spam folder before
asking again. Asking for another code replaces the earlier one, and Supabase
limits how often codes can be sent, so the button counts down how long to wait
(usually under a minute). If you see "too many sign-in codes", wait and use the
code from your most recent email: asking again sooner does not help and can make
the wait longer.

### What is on the page

**Website photos** lists every photo on the website, in the order every
gallery shows them: the photos the site launched with and everything you have
added since. They all work the same way. Each one says which collections it
is in, its install type if it has one, everywhere else it appears ("Also on:
Homepage slideshow, slide 2 · Sleek Straight cover"), and whether it is
showing or hidden.

**Where photos appear** lists each fixed spot on the website and the photo in
it now: the six homepage slides, each collection's cover and second photo,
the three install pages, the finish swatches, the booking page and the
sign-in page.

**Booking pages.** Every service has its own booking page, where a client
lands after tapping that service's Book button (for example "Book Closure
Install"): the service, photos of it, and your Square scheduler. Which photos
go there is your choice, photo by photo, under **Booking pages** (see
Editing). A page with no photos ticked says so politely rather than showing
other work. "Book Your Chair" is unchanged and still opens the full menu.

### Adding photos

1. Tap **Add photos** and pick up to 12 from your phone or computer. Big
   photos are resized for the web automatically. Tall (portrait) photos fit
   the gallery best.
2. For each photo, write a short **description** of the hair, for visitors
   who use a screen reader. For example: *"A long body-wave install with a
   side part and laid edges."* A **title** is optional; it shows over the
   photo in the gallery.
3. Choose the **collections** it belongs to (Deep Wave Glam, Sleek Straight,
   and so on). At least one.
4. If you are sure which install it is, choose the **install type** (Frontal
   Install, Closure Install or Reinstalls). The photo can then also appear on
   that install's page, which shows up to six, earliest in your order first.
   Leave it on *Not specified* if you are not sure.
5. Under **Booking pages**, tick each service the photo shows (Frontal
   Install, Color Closure Install, Wig Touch Up and so on). It then appears on
   that service's booking page, which also shows up to six. Leave them all
   unticked if it does not show a particular service.
6. Choose **where they go in each gallery**: after the photos already there
   (the usual choice) or first in line.
7. Leave **Show on the website** ticked to publish now, or untick it to keep
   the photos hidden until you are ready.
8. Tap **Upload**. Keep the page open until it says the photos are uploaded.

### Replacing a photo

Use this to swap a picture for a better one, while everything else about it
stays: its collections, tags, place in the order, and every spot it fills.

1. Tap **Replace** under the photo. The window lists everywhere it appears,
   so you know where the new picture will show.
2. Tap **Choose the new photo**. It appears beside the current one, under
   **New**, so you can compare them.
3. The title and description are kept from the current photo. Change the
   description if it no longer fits the new picture.
4. Tap **Replace photo**.

Nothing changes until the new photo has uploaded and loads from the website.
If anything goes wrong on the way, the current photo stays exactly as it was.

### Editing, hiding and reordering

- **Edit** changes the title, description, collections, install type,
  booking pages, lace details (Melted Hairline, HD Lace, Custom Hairline,
  shown when someone looks closer in the gallery), whether it is in **Recent
  work** on the homepage, and whether it is shown.
- **Booking pages** are separate from the install type on purpose. A frontal
  photo can be a plain Frontal Install or a Color Frontal Install, and a
  reinstall can be a frontal or a closure one; only you know which, so tick
  the exact service. Hidden photos never appear on a booking page.
- **Hide** takes a photo off the website without deleting it. **Show** puts it
  back. Both save straight away.
- **Earlier** and **Later** (the up and down arrows) move a photo earlier or
  later in every gallery. The new order is saved immediately.

### Removing a photo

Tap **Remove** under the photo. The site asks *"Remove this photo?"* and, if
the photo also fills spots on the site, says what will show there instead
(for example *"Homepage slideshow, slide 3: shows Blunt Bob instead"*). Tap
**Remove Photo** to confirm, **Hide instead** to keep it but take it off the
website, or **Cancel**. Removing cannot be undone.

### Choosing the photo for a spot

Under **Where photos appear**, tap **Change** beside a spot, pick a photo and
tap **Use this photo**. Only photos showing on the website are offered; a
collection's cover can only be a photo in that collection. A finish swatch
can also be set to *No photo*, which shows a plain swatch.

You cannot break the site from here. If the photo you chose for a spot is
later hidden or removed, the spot shows another one by itself, and the list
says so in rose-coloured text ("Your choice is hidden or removed, so this one
stands in"). Which photo stands in:

| Spot | Stands in |
| --- | --- |
| Collection cover | The first photo in the collection |
| Collection second photo | The next photo in it; none if it only has one (the card simply does not fade) |
| Homepage slide | The first photo in that slide's collection that no other slide is showing; the slide is left out if there is none |
| Install page | The first photo with that install type; otherwise the page shows its words without a photo |
| A service's booking page | Nothing: it says there are no photos of that service yet and links to the gallery. The two reinstall pages are the exception: with none ticked, they show photos whose install type is Reinstalls, and say so |
| Finish swatch | Nothing: a plain swatch |
| Booking page | The first Frontal Install photo |
| Sign-in page | The first photo |
| Link previews | Whatever the first homepage slide shows |

### When changes show

Straight away, for everyone visiting: every page checks for your latest photos
as it opens. The copy of the site that search engines read and that link
previews (iMessage, Instagram, Facebook) use is refreshed when the site is
next rebuilt: within a few minutes of your last change once your developer has
switched on automatic rebuilds (setup step 7), otherwise at the next update of
the site. Link previews are also cached by each app, sometimes for days.

---

## How it works

### Where things are stored

| What | Where |
| --- | --- |
| Photos you add, and every replacement | Supabase Storage, bucket **`website-photos`**, folder `gallery/`. Each photo is three files: `<id>.webp` (1200px wide), `<id>-600.webp` and `<id>-1600.webp`. |
| The photos the site launched with | Still the files in `public/images/work/`, served by Cloudflare. Migration 0007 made each one a row pointing at its file, so nothing moved and nothing a visitor sees changed. A launch photo moves to Storage the moment it is replaced. |
| Title, description, install type, lace details, Recent work, crop, shown/hidden, order | Table **`gallery_items`** (columns added in 0006 and 0007) |
| Which services' booking pages show it | **`gallery_items.booking_services`** (0010): `services.slug` values, e.g. `{closure-install}` |
| Which collections a photo is in | Table **`gallery_item_categories`**, joined to **`gallery_categories`** (the six collections, seeded in 0002) |
| Each collection's cover and second photo | **`gallery_categories.hero_item_id`** and **`hover_item_id`** (0002) |
| Which photo fills each other spot | Table **`site_photo_slots`** (0007): `home-1`..`home-6`, `install-frontal`, `install-closure`, `install-wig-touch-up`, `finish-curls`, `finish-wand-curls`, `finish-crimps`, `book`, `sign-in` |

The browser resizes every photo before uploading it (largest side 1600px),
turns it upright, and saves it as WebP. That also strips the phone's location
and camera details from the file. Files are named with a random id and cached
for a year. Uploads are refused if they are not a photo, are over 30 MB, or
are under 600 pixels across.

### How the public site shows them

The site is still a static export on Cloudflare Pages, and the database is
the source of truth for every photo on it:

1. **At each deployment** the build reads the published photos from Supabase
   (`lib/site-photos-server.ts`) and writes them into the HTML, including the
   link-preview pictures. It asks Supabase directly, not through Next's
   fetch cache, so every build sees the database as it is then.
2. **In the browser**, each page with photos asks Supabase once for the
   current set (`components/site-photos.tsx`) and redraws only if something
   changed since the deployment.
3. **`lib/gallery.ts`** turns the set into what each part of the site shows
   (collections, slideshow, install pages, finish swatches, each service's
   booking page, the booking and sign-in pages, Recent work), including the
   stand-ins above. The build and the browser use the same function, and so
   does the photo manager when it lists where a photo appears.

**Booking pages before 0010.** Until migration 0010 has run there is no
`booking_services` column to read, and the site places photos by the rule
0010 seeds instead (`launchBookingServices` in `lib/site-photos.ts`): a
Frontal Install photo goes on the Frontal Install page, or on Color Frontal
Install if it is in Color & Custom, and the same for closures. So running
0010 changes nothing a visitor sees; it is what lets Nat change it. The photo
manager says the choice needs a one-time update until then.

If Supabase is not configured (a clean clone, a preview without the
variables) or does not have 0007 yet, the build uses the launch photos in
`lib/collections.ts`, which are exactly what 0007 seeds. If Supabase is
configured but does not answer, **the build fails** rather than publish an
out-of-date set (which could bring back a photo Nat removed); Cloudflare keeps
the previous deployment live. Retry the deployment once Supabase answers.

### When files are deleted

Replacing or removing a photo switches the website over straight away, but
its old Storage files are only deleted once nothing can still show them. The
deployed pages were written at the last deployment and may still point at
them; deleting them early would leave a broken image in that saved copy. So:

- files the current deployment never used (a photo added and removed since
  the last rebuild) are deleted at once;
- the rest are deleted the next time the photo manager opens after a
  deployment that no longer uses them, provided they are over a day old.

Launch photos have no Storage files. Their files stay in
`public/images/work/` (see Developer-only operations).

### Who can do what

Security is enforced by Supabase, not by the pages. The pages are static files
anyone can download; what matters is what the database and storage will
accept from them.

| | Public visitor | Any other signed-in account | Nat |
| --- | --- | --- | --- |
| See published photos, and the spots they fill | yes | yes | yes |
| See hidden photos | no | no | yes |
| List the storage bucket | no | no | yes |
| Upload, replace, edit, reorder, hide or delete photos | **no** | **no** | yes |
| Choose the photo for a spot | **no** | **no** | yes |
| Start a rebuild of the site | **no** | **no** | only by changing photos (with 0008) |

- Every write is checked by **row level security** on `gallery_items`,
  `gallery_item_categories`, `gallery_categories` and `site_photo_slots`, and
  by **Storage policies** on the `website-photos` bucket. All of them call
  `public.is_admin()`: it reads `profiles.role = 'admin'` in the database and
  requires the sign-in the request comes from to still exist, so logging out
  ends admin access immediately. Verified against a local Supabase on
  2026-10-08 for the public, a signed-in customer, the owner, and the owner's
  token after logging out.
- The database itself refuses malformed values (a crop that is not a
  position, an unknown spot or collection), whatever sends them.
- The owner email appears in the browser code only to stop the sign-in page
  emailing codes to strangers. It grants nothing.
- Nobody becomes an admin by signing up. The role is granted once, by hand,
  with `public.promote_studio_owner()` (below), which cannot be called from the
  website.
- The browser only ever has the project URL and the **anon/publishable** key,
  which are designed to be public. The **service role / secret key** is not
  used anywhere and must never be added to this project or to Cloudflare. The
  same goes for the database password, the SMTP password and any Resend key:
  they live in the Supabase dashboard only. `node scripts/check-bundle-secrets.mjs`
  checks a build, or `node scripts/check-bundle-secrets.mjs https://crownedbynat.com`
  the live site, and fails if any file a visitor downloads holds a key whose
  role is not `anon`, a database URL with a password, or a deploy hook.
- **Nothing on the static site is a security boundary.** There is no server
  here: no middleware, no API routes. The redirects to `/admin/login/` and the
  "not available on your account" screen are for clarity only; delete them and
  nothing changes about who can do what. Every check that counts runs in
  Postgres and Storage.
- **Known and accepted: a hidden photo's *file* is not secret.** The bucket is
  public so published photos load by plain URL. Hiding a photo removes it from
  the site, the gallery and the API, and the file name is an unguessable UUID
  that nothing public lists, but anyone who already had the exact URL can still
  open it. Remove the photo to delete the file (it is kept only while a live
  deployment still uses it).
- **Optional hardening, `0009_revoke_excess_api_grants.sql`.** Supabase's
  default table privileges give `anon` write and `TRUNCATE` rights on the older
  tables (`profiles`, `appointments`, `locations`, `services`, `reviews`,
  `business_settings`). Row level security makes the writes do nothing and the
  REST API has no `TRUNCATE`, so nothing was exploitable, but `TRUNCATE` ignores
  row level security, so the migration removes the rights instead of relying on
  that. It only revokes; re-running it is harmless; the site does not change.
  Run the "Verify" queries at the bottom of the file first to see whether your
  project has them.

### Testing the rules

`supabase/tests/owner-only.mjs` attacks a **local** Supabase (never production;
it refuses any other address) as a visitor, a signed-in customer, a stranger who
used the owner sign-in page for their own address, and look-alike addresses,
then as the owner, and compares the database and bucket before and after every
attack. It also covers logout, expired and revoked sessions, a forged token,
the grants and policies themselves, the real error responses the sign-in page
turns into messages, and re-running migrations 0006 to 0009. The steps are in
`supabase/tests/README.md`. `npm test` runs the quick unit tests of the
sign-in error messages and needs no Supabase.

---

## One-time setup (for the developer)

Steps 2 to 6 were done for crownedbynat.com on 2026-10-08, and 0007 in step 1
by 2026-10-09. What is left is 0010 in step 1, and step 7. Skip anything
already done; `supabase/README.md` has the shared steps in more detail.

### 1. Apply the migrations

Supabase dashboard → **SQL Editor**. First find out what is already there;
this only reads:

```sql
select
  to_regclass('public.appointments')  is not null                  as "0001",
  to_regclass('public.gallery_items') is not null                  as "0002",
  to_regprocedure('public.promote_studio_owner(text)') is not null as "0006",
  to_regclass('public.site_photo_slots') is not null               as "0007",
  to_regprocedure('private.request_site_rebuild()') is not null    as "0008",
  exists (select 1 from information_schema.columns
           where table_schema = 'public' and table_name = 'gallery_items'
             and column_name = 'booking_services')                 as "0010";
```

- All `false`: a fresh project. Run every file in `supabase/migrations/`, in
  order, `0001` through `0007` (and `0008` for step 7), then `0010`, each in
  its own query.
- Anything `true`: some were run before. Do **not** run them all again; see
  "Which migrations to run" in `supabase/README.md` §2, which shows how to
  tell 0003-0005 apart and why re-running an older file over a newer one
  does damage.

**0007** turns the site's own photos into rows the photo manager can manage
and records which photo fills each spot. It seeds them once, ever: running it
again never brings back a photo Nat has removed, and any photos uploaded
before it keep their order, after the launch photos. It does not move any
files and changes nothing a visitor sees. After running it, **redeploy** the
site (Cloudflare → Deployments → Retry deployment) so the pages are built from
the database. Check it took:

```sql
select count(*) from public.gallery_items where src like '/images/work/%';  -- 18
select count(*) from public.site_photo_slots;                               -- 13
```

The deployed site checks for 0007 each time it is built: until it is there,
the build log says *"Supabase does not have migration 0007 yet"* and the site
is built from the launch photos, exactly as before.

**0010** adds `booking_services`, the services whose booking page shows each
photo, and places the existing photos once by the starting rule (a Frontal
Install photo on Frontal Install, or on Color Frontal Install when it is in
Color & Custom; the same for closures; nothing else). Nothing a visitor sees
changes; afterwards Nat can tick booking pages in the photo manager. Run it
whenever convenient, after 0007. Check it took:

```sql
select title, booking_services from public.gallery_items order by display_order;
select value from public.business_settings where key = 'booking_services_seeded';  -- one timestamp
```

At launch that is Frontal Install on eight photos and Color Frontal Install on
three (Burgundy Curl, Candy Pink, Platinum Straight). Running it again never
puts back a booking page Nat has cleared.

**0009 (optional)** only takes privileges away; see "Who can do what". It was
written, and passes the whole test suite, but **has not been run on the hosted
project**: that is a decision for the person who owns the Supabase account, so
nothing in this repository applies it. To see whether it matters for this
project, run the three "Verify" queries at the bottom of the file; if the first
two return no rows there is nothing to do. To apply it, paste the file into the
SQL Editor and run it, then run the queries again.

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
work. No other variable is needed. They are listed, without values, in
`.env.example`. Never add the service role or `sb_secret_...` key.

The build also reads the published photos with these two values, so with them
set, every Cloudflare build needs Supabase to answer (see *How the public site
shows them*).

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
  path.

**Authentication → Emails → Templates**: Nat needs the *code* in her emails.
Replace two templates:

| Template | Subject | Body |
| --- | --- | --- |
| Magic Link | `Your Crowned by Nat sign-in code` | `supabase/templates/magic-link.html` |
| Confirm signup | `Confirm your email for Crowned by Nat` | `supabase/templates/confirmation.html` |

### 4. Email delivery

Supabase's built-in email service only delivers to members of the Supabase
organization's team. Custom SMTP was set up for this project on 2026-10-08.
Its password or API key lives only in the Supabase dashboard; it never goes in
this repository, in `.env*` files, or in Cloudflare.

### 5. Nat signs in once

Nat opens `/admin/login/`, enters `crownedbynattt@gmail.com`, and types the
code from the *"Confirm your email"* message. She will see *"Owner access is
not switched on yet."* Her account now exists and her address is confirmed.

### 6. Make Nat the owner

In the **SQL Editor**:

```sql
select public.promote_studio_owner('crownedbynattt@gmail.com');
```

It refuses an address that does not exist yet or has not been confirmed
(step 5). It also replaces any password on the account with a random one, so
the owner account can only be entered with an emailed code, and ends every
existing sign-in. Nat then signs in again and lands in the studio dashboard,
which links to the photo manager.

Check it took (exactly one row):

```sql
select email, role from public.profiles where role = 'admin';
```

To remove owner access later:
`update public.profiles set role = 'customer' where email = 'crownedbynattt@gmail.com';`

### 7. Automatic rebuilds (recommended)

So that search results, link previews and the first moment of each page catch
up with Nat's changes by themselves, and old photo files are cleaned up soon
after, without anyone redeploying:

1. **Cloudflare** → Workers & Pages → `wig-install-site` → Settings →
   Builds → **Deploy hooks** → Add deploy hook. Name *Photo manager*, branch
   `main`. Copy the URL.
2. **Supabase SQL Editor**: run
   `supabase/migrations/0008_rebuild_site_on_photo_change.sql`, then store the
   URL in Vault (paste it in place of the example):

   ```sql
   select vault.create_secret(
     'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...',
     'cloudflare_pages_deploy_hook',
     'Rebuilds crownedbynat.com after a photo change (migration 0008)'
   );
   ```

From then on, two minutes after Nat's last change the database asks
Cloudflare to rebuild the site, once per editing session. Only real changes by
the owner count: a refused request from anyone else changes no rows and starts
nothing. The URL lives only in Vault; never put it in the repository, the
site, or Cloudflare's environment variables. To switch it off:
`delete from vault.secrets where name = 'cloudflare_pages_deploy_hook';`

Check it after a change (a minute or two later):

```sql
select changed_at, requested_at from private.site_rebuild;
select status_code, created from net._http_response order by created desc limit 3;
```

### 8. Check it end to end

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Open `/admin/photos/` in a private window | Sent to `/admin/login/` |
| 2 | Sign in as Nat, then **Open the photo manager** | **Website photos** with all 18 launch photos, then **Where photos appear** |
| 3 | **Replace** *Side Swoop* with any portrait photo | "Replaced. The website shows the new photo now" |
| 4 | Open `/installs/frontal/` in a private window | The new photo at the top; Sleek Straight's gallery has it second |
| 5 | **Hide** *Glass Finish* | Gone from the homepage slideshow and the sign-in page; another photo stands in |
| 6 | **Show** it again, then **Add photos** into *Body Wave* | "uploaded and showing on the website now"; last in `/gallery/body-wave-glam/` |
| 7 | **Change** the Wand Curls swatch to that photo | It appears beside Wand Curls on `/installs/frontal/` |
| 8 | **Remove** it | Confirmation first, saying the swatch goes plain; then gone |
| 9 | Sign in as a customer at `/login/`, open `/admin/photos/` | *"This page is not available on your account."* |
| 10 | Tap **Log out** | Back at the sign-in page |
| 11 | Look for an Admin link in the header, the mobile menu and the footer | There is none |
| 12 | Type a different email address on `/admin/login/` | "This sign-in is only for the studio owner's email address", and nothing is emailed |
| 13 | **Edit** a photo, tick *Closure Install* under **Booking pages**, save; open `/book/closure-install/` in a private window | The photo is there, and the photo's card says "Also on: ... Closure Install booking page" |
| 14 | **Hide** that photo and reload `/book/closure-install/` | Gone from the booking page |

Rows 1 to 10 and the security checks above were run against a local Supabase
stack and a local build of the site on 2026-10-08 (110 checks), plus 10 for
migration 0008. The sign-in screen, its error messages and the owner-only rules
were re-run on 2026-10-09: 127 browser checks and 131 database and storage
checks (see "Testing the rules").

---

## Developer-only operations

Nothing in day-to-day photo management needs a developer. What still does:

- **Running migrations** 0010 and (optionally) 0008 and 0009, and the deploy
  hook (setup steps 1 and 7).
- **Erasing a launch photo's file.** Removing one of the 18 launch photos
  takes it off every page, but its original file stays in
  `public/images/work/` and is still reachable at its old address
  (`/images/work/<name>.jpg`) until it is deleted from the repository. If a
  client asks for a launch photo to be gone entirely, delete its three files
  there and push. (Uploads and replacements live in Storage and are deleted
  by the photo manager.)
- **The words around photos are no longer code.** Each homepage slide's
  label, headline and sentence, each install page's caption under its launch
  photo, and each collection's name and descriptions are edited and published
  from the studio dashboard (`docs/content-manager.md`). What stays in code is
  structure: which collections exist, each slide's place and crop. A caption
  written about a launch photo is still hidden automatically once a different
  photo is in that spot.
- **Changing the crop of a photo.** The 18 launch photos keep their hand-
  measured crops; uploads and replacements use a crop that keeps the top of a
  portrait (the hairline). A different crop is a `focal_position` value set
  in the SQL editor, e.g. `update public.gallery_items set focal_position =
  'center 60%' where title = '...';`.
- **Rolling back to an older deployment** in Cloudflare can bring back pages
  that point at Storage files the photo manager has since deleted. Redeploy
  the latest instead.

---

## Troubleshooting

**"The photo manager (or the studio dashboard) is not connected yet."** The two environment variables
are missing, or Cloudflare has not rebuilt since they were added (step 2).

**The photo manager shows only uploads, not the launch photos.** Migration
0007 has not been run (step 1).

**A Cloudflare build fails with "Could not reach Supabase to read the
website's photographs" or "Supabase refused the website photographs".** The
build could not read the photos, so it stopped rather than publish an old
set; the previous deployment is still live. Check the Supabase project is up
(free projects pause after a week without use), then retry the deployment.

**A change shows on the site but not in a link preview or search result.**
Those use the copy written at the last deployment: it catches up at the next
rebuild (automatic with step 7). Apps also cache previews themselves.

**"Email sending has not been fully set up for this address yet."** Step 4.

**The email has a link but no code.** Step 3, templates.

**"Owner access is not switched on yet."** Step 6 has not been run, or was run
before Nat's first sign-in (it refuses then; run it again).

**"Your sign-in has ended."** Nat logged out on another device, or step 6 ended
her earlier sign-ins. Sign in again.

**"Wait N seconds before asking for another."** Supabase allows one code per
address in a short window (the button counts it down). The earlier code is
still valid until a new one is sent.

**"Too many sign-in codes have been requested recently."** The project's hourly
email allowance is used up. Wait (up to an hour) or use the code from the most
recent email. Asking again sooner does not help. With the built-in mailer the
allowance is tiny, which is what step 4's custom SMTP is for.

**"The sign-in email could not be sent just now."** Supabase or the mail
provider failed on their side, which is usually temporary. If it persists, check
the SMTP settings in step 4 and the provider's dashboard.

**"That code did not work."** Mistyped, expired, already used, or replaced by a
newer one. Supabase answers all of these the same way, so the page cannot say
which. Use the newest email, or request a new code.

**A photo shows in the manager but not on the site.** It is hidden (tap
**Show**), or it is not in the collection being viewed.

**"This photo was changed somewhere else in the meantime."** The photo was
replaced or edited in another tab or on another device. Reload the page and
try again.

**"This photo could not be opened in this browser."** Usually a HEIC file on a
computer that cannot read HEIC. Upload from the phone, or save it as JPEG.
