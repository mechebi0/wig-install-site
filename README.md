# Crowned by Nat

Marketing and booking site for **Crowned by Nat**, a one-chair lace wig install
studio serving Towson, MD and Laurel, MD. Every install is performed
personally by Nat.

Next.js (App Router) + TypeScript + Tailwind CSS v4, exported as a fully static
site and deployed on Cloudflare Pages.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npx tsc --noEmit
npx next build   # writes the static site to out/
```

## Pages

The homepage is a landing experience, not a table of contents. It carries the
brand, all six style collections as a visual directory, and two short doorways
out. Anything that needs a paragraph or a grid to be worth reading lives on its
own page.

| Route                      | What is on it                                                     |
| -------------------------- | ----------------------------------------------------------------- |
| `/`                        | Hero carousel, the two install types, six style collections, recent work |
| `/gallery`                  | The six collections as large editorial cards                       |
| `/gallery/deep-wave-glam`   | Collection hero, gallery with lightbox, CTA, related collections   |
| `/gallery/sleek-straight`   | as above                                                          |
| `/gallery/signature-bob`    | as above                                                          |
| `/gallery/body-wave-glam`   | as above                                                          |
| `/gallery/color-and-custom` | as above                                                          |
| `/gallery/natural-lace`     | as above                                                          |
| `/installs/frontal`        | The Frontal Install: what it is, how it works, Nat's frontal work, choose a finish, book |
| `/installs/closure`        | The Closure Install, same layout                                   |
| `/book`                    | Every service and price, then the Square Appointments scheduler    |
| `/book/closure-install` (one per service) | One service, its photos and the same scheduler: where each service's own Book button goes |
| `/before-you-book`         | The appointment step by step, and the FAQ                          |
| `/reviews`                 | Client quotes                                                      |
| `/meet-nat`                | Introduction, credentials, three assurances                        |
| `/login` `/signup` `/account` | Customer accounts and appointments                              |
| `/admin`                   | Nat's dashboard. Deliberately absent from all public navigation    |
| `/admin/login`             | Nat's sign-in: a code emailed to the studio address, no password   |
| `/admin/photos`            | Nat's photo manager: add, edit, reorder, hide and remove gallery photos. See `docs/photo-manager.md` |

The six collection pages are generated from one file, `app/gallery/[slug]/page.tsx`,
via `generateStaticParams`, so the build emits six real HTML files and the six
pages cannot drift apart. The two install pages work the same way from
`app/installs/[type]/page.tsx`, reading `lib/taxonomy.ts`, and so do the seven
service booking pages from `app/book/[service]/page.tsx`, reading `SERVICES` in
`lib/content.ts`. "Book Your Chair" still goes to `/book`; a button that names
one service ("Book Closure Install") goes to that service's page. Square's
embed cannot be opened on one service, so those pages name the service and
say which line of the scheduler to tap.

Two earlier URLs are still linked from elsewhere: `/work` (the single page that
carried the whole portfolio) and `/styles` (the collections, before the rename).
`public/_redirects` 301s both to `/gallery/`. It also sends a bare `/installs/`,
which is not a page, to `/book/` (302), where the two installs sit side by side.

## Deployment

Cloudflare Pages, building from `main`:

| Setting           | Value                        |
| ----------------- | ---------------------------- |
| Production branch | `main`                       |
| Framework preset  | Next.js (Static HTML Export) |
| Build command     | `npx next build`             |
| Output directory  | `out`                        |
| Root directory    | `/`                          |

`next.config.ts` sets `output: "export"`, `images.unoptimized`, and
`trailingSlash: true` (so every route exports as `<route>/index.html` and
resolves on any static host). **Do not add API routes, server actions,
middleware, or ISR** — none of them exist on a static host, and any one of them
breaks the deployment.

### Why navigation uses plain `<a>` and not `next/link`

Under `output: "export"`, Next 16.3.3 writes each route's RSC payload to
`out/gallery/__next.gallery/__PAGE__.txt` but requests it at
`/gallery/__next.gallery.__PAGE__.txt`. Those never match, so with `next/link`
every page load fired a prefetch that 404'd, and every client-side navigation
fell back to a full page load anyway — the same navigation, plus a console full
of 404s on every page. The fix would be a post-build renaming step, which would
mean the Cloudflare build command could no longer be plain `npx next build`.
`@next/next/no-html-link-for-pages` is switched off in `eslint.config.mjs` for
that reason; if a future Next release fixes the payload paths, delete the
override and switch the nav, the footer and `ButtonLink` back to `next/link`.

## Where to change things

### `lib/collections.ts` — the six style collections

The single source of truth for the whole `/gallery` branch: every card, every
gallery, every collection page and all six sets of page metadata are generated
from the `COLLECTIONS` array. Each entry has a slug, a title, a three-beat
tagline, a summary, a description, a meta description, a hero photograph, a
hover photograph and a gallery.

Photographs live flat in `public/images/work/`, one definition per file in the
`WORK` map, so a look that belongs to two collections is described once. To add
a look: crop it to 3:4, export three widths into `public/images/work/`
(`name-1600.jpg`, `name.jpg`, `name-600.jpg`), add a `photo()` line with real
alt text, then list it in whichever collections it belongs to.

### `lib/content.ts` — all copy and business details

- `STUDIO` and the `CONTACT` block above it — brand name, owner, email, and the
  values still missing (phone, street). **Anything empty is
  empty on purpose**: every component reads these through helpers and renders
  nothing at all where there is no real value, so the site can never advertise a
  phone number nobody owns. Fill one in and it appears everywhere at once.
  Instagram is set: `STUDIO.instagram` is the one URL the nav icon, the mobile
  menu, the footer and the homepage `sameAs` data all read.
- `LOCATIONS` — Towson, MD and Laurel, MD, in that order. The single source of
  truth for the service area: the announcement stripe, the footer, the "Where"
  row on `/book`, the page metadata and the LocalBusiness structured data all
  derive from it, so adding or removing a town is one line. It is the
  compiled-in fallback used while there is no Supabase project; see
  `lib/catalog.ts`. `PRIMARY_LOCATION`/`ADDITIONAL_LOCATIONS` (also in
  `lib/content.ts`) read index 0 as the current location and the rest as
  additional; confirmed 2026-10-05, Towson is Nat's fixed primary chair and
  Laurel is the additional town, which is why it carries the stronger visual
  weight in the announcement stripe, the footer and `/book`. Laurel, MD was
  paused on 2026-09-02 and confirmed again on 2026-09-22; the row was never
  deleted from the `locations` table, only marked inactive, so Nat can switch
  either town off from the admin dashboard without a deploy, and moving a town
  to index 0 here is how a future change of primary location is made.
- `STUDIO.bookingUrl` — **the one switch that controls booking.** Leave it empty
  and every CTA goes to `/book`. Paste a Square / Fresha / Calendly / Acuity
  link and every CTA opens that instead, and `/book` swaps the form for a
  hand-off panel automatically. `bookingTarget({ install, finish, style })`
  builds the link; an install-type link (below) wins over this one when it is
  set.
- `SERVICES` — the seven services, their categories, prices and durations, from
  the pricing reference. The one authoritative price list: the menu on `/book`,
  the booking flow, the request form and the structured data all read it.
  `frontal`, `closure` and `wig-touch-up` are also the install types in
  `lib/taxonomy.ts`; each service carries the install type it belongs to.
- `ANNOUNCEMENT` — the words in the stripe at the top of every page; see
  "The announcement stripe" below.
- `PAGES`, `HOME`, `HERO`, `COLLECTION_PAGE` — page and section copy.
- `OWNER`, `QUESTIONS`, `TESTIMONIALS`, `PROCESS`, `ASSURANCES`.

### `lib/taxonomy.ts` — what a client books: install type and finish

The site describes an install on independent axes, and they never share a
list:

- **Install type** is the service you book: **Frontal Install** or **Closure
  Install**. "What kind of install are you getting?"
- **Finish** is the styling add-on: **Curls**, **Wand Curls** or **Crimps**.
  "How would you like your install styled?" It is an add-on to an install,
  never a service of its own: there is no "Frontal Curls", there is a Frontal
  Install with Curls. **Required** alongside the install type: neither the
  selection flow's Book button nor the plain request form will send without
  both, and both surfaces name whichever is still missing rather than failing
  silently. The two non-install services on `/book` (Customization only,
  Reinstall and refresh) have no finish to require, so the request form's own
  Finish field stays genuinely optional there.
- **Style / look** is what the hair looks like (deep wave, sleek straight, bob,
  body wave, colour). That lives in `lib/collections.ts` with the photographs,
  and it is inspiration rather than a service. A body wave is a style, never an
  install; a body-wave frontal is both.

The first two are defined only in `lib/taxonomy.ts`, and every surface that
names either reads it from there. Each install type there carries its page
copy, its lead photograph, its booking link and the finishes it offers
(`INSTALL_TYPES`); each finish carries its name, one line and a photograph when
the set has one (`FINISHES`). Not to be confused with the **lace finish**
(Natural Lace, Melted Hairline...) in `lib/collections.ts`, which is a quality
visible in a photograph rather than something anyone books; the site labels
that one "Lace finish" so the two never read as the same word.

A fourth, optional field rides alongside the two: **style description**, a
free-text box ("Have a specific style in mind?") for a cut, length, colour or
reference look in the client's own words. It is not a taxonomy entry (there is
nothing to enumerate) and is never sent to a scheduler; it exists only to
reach Nat, folded into the notes on both booking paths below. Capped at
`MAX_STYLE_DESCRIPTION_LENGTH` (500 characters, `lib/content.ts`) via the
textarea's native `maxLength`, with a small character count that appears only
once a visitor is close to it.

**The booking selection** is `{ installType, finish, styleDescription }`
(`BookingSelection` in `lib/taxonomy.ts`). The flow on `/book` and on each
install page (`components/install-selector.tsx`) writes it, and
`lib/booking-selection.ts` keeps it in two places: the URL
(`?install=frontal&finish=curls`, `installType`/`finish` only) and, for the
life of the tab, `sessionStorage` (all three fields; `styleDescription` never
reaches the URL, since a paragraph does not belong in a shareable link). So
whichever Book button a visitor uses afterwards (the flow's own, the nav, the
mobile bar, or a server-rendered one on another page) `/book` opens with every
answer already in place, and the request that reaches Nat names all three.

**Acuity is not connected**, and no scheduler URL or field id is written down
anywhere. When it is:

| Variable | What to put in it |
| --- | --- |
| `NEXT_PUBLIC_ACUITY_FRONTAL_URL` | The Frontal Install appointment type's direct scheduling link |
| `NEXT_PUBLIC_ACUITY_CLOSURE_URL` | The Closure Install appointment type's direct scheduling link |
| `NEXT_PUBLIC_ACUITY_FINISH_FIELD` | Optional. The query key of the "Finish" intake question, e.g. `field:12345678`, confirmed in Acuity |

All are build-time, like `NEXT_PUBLIC_ACUITY_BOOKING_URL`. Set the first two
and every button that names an install opens its own appointment type, with the
finish sent by name under the third. Unset (today) they all go to `/book/`.
`bookingTarget()` in `lib/content.ts` is the one place that decides.

**Which photographs are labelled Frontal or Closure** is decided by what the
frame proves, not by a guess. In the launch set (`LAUNCH_ITEMS` in
`lib/collections.ts`, which migration 0007 copied into the database) a
photograph's install type is `"frontal"` only where it shows lace laid past
the point a closure's lace would stop (edges laid down at a temple, a side part
with the hairline laid across it, or the hair taken off the face), which only
ear-to-ear lace allows. Everywhere else it is unset: the look stays in the
gallery, unlabelled, and is never used as an install example. No photograph is
a closure, because a finished closure shows nothing a frontal could not also
show; only Nat can mark one. That is why `/installs/closure/` has no gallery of
its own yet, and why its lead photograph is captioned as the look a closure is
built around rather than as a closure. Nat marks a photograph from the photo
manager, and the gallery tag and the install page examples follow
automatically.

The `/gallery/body-wave-glam` URL and its `body-wave-glam` key are kept so
existing links do not break; the style is now labelled "Body Wave".

### `lib/gallery.ts` — the read path

Every photograph on the site comes from Supabase, where Nat manages them from
the photo manager: the launch photographs and her uploads alike, plus which
one fills each fixed place (the homepage slideshow, the collection covers, the
install pages, the finish swatches, the `/book` menu, the sign-in screens).
The build reads the published set and writes it into the static HTML
(`lib/site-photos-server.ts`), each page checks for anything newer in the
browser (`components/site-photos.tsx`), and `resolveSite()` in
`lib/gallery.ts` turns the set into what every component shows, including
the stand-in when a chosen photograph is hidden. With no Supabase project (or
none with migration 0007) the build uses the launch set in
`lib/collections.ts`, which is what 0007 seeded. See `docs/photo-manager.md`.

### `lib/images.ts` — the words around the fixed photographs

Each hero slide's eyebrow, headline and sentence, in order, and the crops
measured for the photographs the site launched with in the hero, the services
menu on `/book` and the sign-in screens. Which photograph each of those shows
is Nat's choice in the photo manager; everything on the site is her own work,
and there is no stock photography.

```
public/images/work/    the launch photographs, three widths each; replacements
                       and new photographs go to Supabase Storage instead
public/brand/          the official crest, crowned-by-nat-mark.png
```

## The brand mark

`public/brand/crowned-by-nat-mark.png` is the official crest: a rose-gold
crowned "CN" monogram over the full "Crowned by Nat" wordmark, on a
transparent field, 800x800 (resized and re-compressed from a supplied
1254x1254 source; see `lib/content.ts`'s note on `STUDIO.logo` for the
detail). It replaced two earlier assets — a photograph of Nat's neon studio
sign, and a separate wide crop used only in the nav — on 2026-09-22.

Unlike the neon sign it replaced, it is not restricted to dark surfaces: it
carries its own shadow and outline, so the same file now draws the hero
plate, the footer AND the nav bar (including the mobile menu, which used to
fall back to the typographic wordmark for exactly the reason this mark does
not need to).

## The announcement stripe

The thin rose band above the nav bar on every page, running
NOW BOOKING ✦ TOWSON, MD ✦ LAUREL, MD ✦ LACE WIG INSTALLS ✦ CROWNED BY NAT ✦
BOOK YOUR CHAIR as tracked capitals on a slow, seamless loop. It lives in
`components/announcement-marquee.tsx` and is rendered from `app/layout.tsx`.

- The words come from `ANNOUNCEMENT`, `STUDIO.name` and `CTA.book` in
  `lib/content.ts`. The towns come from `useAnnouncedLocations` in
  `lib/catalog.ts`, so once Supabase is connected the stripe follows the
  location switches in the admin dashboard and says the chair is between
  studios when none is open. It never falls back to a town name.
- The loop is CSS only. The line is rendered six times inside one track and the
  track slides by exactly one copy before restarting, so the restart frame is
  identical to the frame before it. Nothing is measured in JavaScript, and the
  band is `overflow-hidden`, so it never widens the page.
- **Hover does not pause it.** The line keeps running underneath the cursor,
  by design: the pointer crosses the top of the page constantly on its way to
  the nav, and a band this thin freezing on every pass reads as a fault.
- Stopping it, per WCAG 2.2.2: a pause/play button at the right end of the
  band, visually hidden until it takes keyboard focus (the same device as the
  skip link), is the only control that halts the loop. Under
  `prefers-reduced-motion` the track is not shown at all and a one-sentence
  static version takes its place. That sentence is also what screen readers
  get; the moving copies are `aria-hidden`.
- It replaced the wine "Now booking in" band that used to sit between the nav
  and the homepage hero, which would otherwise have said the same towns twice
  within 130px of each other.

## The hero carousel

Full width, six slides, 7s each with a 1.6s crossfade. It autoplays: there is
no play button to press to start it.

**The composition.** Every photograph here is a 3:4 portrait, and a full-width
desktop hero is roughly 2:1. Cropping one to the other was tried and it cuts the
face off at the mouth and removes the hair. So each slide paints the same file
twice: once scaled up, blurred and darkened to fill the width, and once at 46%
of the width, bled to the right edge, cropped only mildly. The copy sits on the
blurred half. The browser fetches one file, so the backdrop is free.

**Stopping it**, per WCAG 2.2.2, which requires a mechanism to pause anything
that moves automatically for more than five seconds:

- an explicit pause/play button, labelled, with `aria-pressed`
- hover pauses while the pointer is over the hero, and resumes on exit
- keyboard focus inside the hero pauses it, gated on `:focus-visible` so a
  mouse click does not leave it stuck
- a swipe, an arrow or a dot stops it for good; the play button hands it back
- it stops when scrolled past or the tab is backgrounded
- under `prefers-reduced-motion` it never starts and the crossfade collapses

Hover is wired to native `pointerenter`/`pointerleave` rather than React's
delegated `onMouseEnter`/`onMouseLeave`. Pressing pause swaps the glyph inside
the button, which unmounts the node the pointer is over, and the synthetic
leave for the next move never arrives: hover sticks on and the carousel that
was just asked to play sits still. The native events are computed from geometry
and do not care what the subtree did.

## Admin and customer accounts: what exists, what is pending

**Built and working today.** Customer signup, login, password reset, the
account dashboard, and the admin dashboard with locations, appointments,
customers and services. All of it is real code against a real schema, and all
of it degrades honestly when there is no Supabase project: the nav hides the
account control, and `/login` and `/admin` say plainly that the booking system
is not connected. **The production build does not need any Supabase
environment variable.**

**No longer linked from any page.** `components/booking.tsx` (the email/POST
request form) and `components/booking/booking-flow.tsx` (the five-step guest
or account booking flow, with `choice.tsx`, `confirmation.tsx` and `steps.tsx`
beneath it) are not imported anywhere since Square became `/book`'s scheduler.
They still compile and the Supabase schema and admin/account dashboards are
unaffected, but nothing on the site can create a new Supabase `appointments`
row any more; the account dashboard's "Upcoming appointments" will only ever
show rows added some other way. They were left in place rather than deleted,
since whether to keep, repurpose or remove that subsystem is a product
decision, not a booking-integration one. Delete them once that decision is
made. Until then the public nav and footer do not link to customer accounts
even when Supabase is connected (`customerAccountsLinked` in
`lib/supabase/client.ts`), so connecting it for the photo manager leaves the
public pages as they are.

**The photo manager, built, waiting on the same Supabase setup.**
`/admin/photos/` lets Nat upload, edit, reorder, hide and remove gallery
photos; they are stored in the Supabase Storage bucket `website-photos` and the
`gallery_items` / `gallery_item_categories` tables from 0002, and appear in the
public galleries without a deploy. Nat signs in at `/admin/login/` with a code
emailed to the studio address; her account has no password. Migration
`0006_owner_photo_manager.sql` adds the bucket, its policies and the owner
functions. Everything needed to switch it on, and how Nat uses it, is in
`docs/photo-manager.md`.

**Schema ready, not yet wired.** `reviews` and `business_settings` (also from
0002) have row level security and an admin-only write policy each, and nothing
reads them yet.

**Authorization is in the database, not the frontend.** Admin rights come from
`profiles.role` checked by `is_admin()` inside Postgres (and, since 0006, only
for a sign-in that still exists). The admin email appearing anywhere in client
code grants nothing: anyone can read the bundle and call the API, so a check in
the browser is decoration. Granting Nat admin is one function call,
`promote_studio_owner()`, documented in `supabase/README.md`.

## Things still needed from Nat

- **Written consent from the clients in the photographs.** Every face on this
  site is a real customer. This is the one outstanding item that is not
  cosmetic.
- A phone number and a street address. Until then the
  site simply does not mention them. Opening hours are now set (10:00 AM to
  9:00 PM) and the booking window is 10:00 AM to 9:00 PM in the studio's own
  timezone, America/New_York.
- Confirmation that `crownedbynattt@gmail.com` is the right **public** contact.
  It is currently both the public address and the admin account.
- Confirmed durations for the four services the reference does not time
  (the two reinstalls and the two colour services). The prices are confirmed.
- Confirmed appointment policy. `policiesAreDraft` in `lib/content.ts` is `true`,
  which puts a visible "draft answers" notice on `/before-you-book`.
- Her own biography, and a photograph of herself. The photograph has arrived and
  now fills the portrait slot on `/meet-nat`
  (`public/images/crowned-by-nat-ceo-nat.jpg`); the paragraphs in `OWNER` still
  describe the service rather than her history.
- Real client reviews. Until then `testimonialsArePlaceholder` stays `true`,
  which keeps the visible "sample wording" notice on `/reviews`. **Do not flip
  that flag while the words are still invented.**
- More Signature Bob and Body Wave photographs. Those two collections have
  three and two; the others have five or six.
- **Which photographs are closures.** No photograph can prove a closure, so
  none is labelled one and `/installs/closure/` has no gallery of its own until
  Nat marks some (install type in the photo manager). The same goes for the
  six looks left unlabelled because the frame does not settle frontal or
  closure (the melted centre part, long layers, shoulder sweep, glass finish,
  copper body wave, and warm copper).
- **A photograph of Wand Curls.** None of the set is described as one, so that
  option shows a plain swatch until Nat chooses one under "Where photos
  appear" in the photo manager.
- Confirmation that Curls, Wand Curls and Crimps are the finishes she offers.
  They are free styling choices; the paid Styling add-on (+$15, +35 minutes) is
  a separate optional extra, and the two time-window add-ons (Early Bird +30%,
  After Hours) book either side of the 10:00 AM to 9:00 PM window.
- The manual Square Appointments setup below. The embed itself is live; the
  schedule behind it is still Nat's own to configure.
- Supabase project credentials. See `supabase/README.md`. The photo manager
  also needs an email provider (or Nat added to the Supabase team) so her
  sign-in codes can be delivered; see `docs/photo-manager.md`.

## Square Appointments embed

`/book` renders the official Square buyer-widget script directly
(`components/square-booking.tsx`), supplied by Nat:

```
https://square.site/appointments/buyer/widget/90mlhehr81npoq/LB873P50HQF76.js
```

It is loaded with a plain DOM call into a ref'd container rather than through
`next/script`: Square's script positions its own iframe relative to its
`<script>` tag (inserting the iframe as a sibling, or redirecting the whole
page if that tag's parent is `<head>`/`<html>`), and `next/script` always
appends scripts to the end of `document.body` regardless of where the
component sits, which would strand the widget below the footer instead of
inside the booking card. See the comment at the top of that file for the
full reasoning. A loading spinner and a graceful "Booking is temporarily
unavailable" message cover the time before it loads and the case where it
fails to.

This is a client-side widget only. There is no Square API integration, no
credentials and no service IDs anywhere in this repo, so nothing here changes
Square's own schedule automatically.

**Do not set `NEXT_PUBLIC_ACUITY_BOOKING_URL` (or the per-install Acuity
variables) while Square is the live scheduler.** `STUDIO.bookingUrl` is a
single switch: if it is ever set, every "Book Your Chair" CTA on the site
opens that URL in a new tab instead of `/book`, which would bypass this
embed entirely. Leave all of them unset, exactly as `.env.example` ships.

### Square configuration (still manual)

The website pricing is done. Setting up Natalie's actual schedule in Square is
not something this website can do by embedding a script; the following must
still be set up by hand, inside Square, to match the site:

**Services** (Square Appointments → Services). One service per website service,
at these exact prices:

| Website service | Price |
| --- | --- |
| Frontal Install | $100 |
| Closure Install | $90 |
| Frontal Reinstall | $90 |
| Closure Reinstall | $80 |
| Color Frontal Install | $135 |
| Color Closure Install | $125 |
| Wig Touch Up | $35 |

Do not create one service per add-on combination (no "Frontal Install +
Styling"). The add-ons are modifiers on the appointment, not services.

**Add-ons** (Square appointment modifiers / extras, where supported):

| Add-on | Price | Duration |
| --- | --- | --- |
| Early Bird (before 10:00 AM) | +30% | — |
| Same-Day Customization | +$25 | +40 minutes |
| Styling | +$15 | +35 minutes |
| After Hours (after 9:00 PM) | **no price supplied** | — |

After Hours has no price on the pricing reference, so the site does not
invent one. If Square requires a price to save the modifier, leave it as a
time-window label only and confirm the amount with Nat before entering it.

**Availability** (Square Appointments → Availability / Hours). Set the booking
window to 10:00 AM - 9:00 PM, Tuesday to Saturday, closed Sunday and Monday,
in the America/New_York timezone. The site's own calendar offers the same
window, so the two must agree.

**Breaks and time off** (Square Appointments → Availability). Any recurring
break (a lunch block, travel between the two towns) and any one-off closure
(a holiday, a day off) has to be entered in Square directly. Nothing in this
repo knows about either; an appointment the site does not know is blocked can
otherwise be offered right up until the embed's own calendar is checked.

**Service durations**. Frontal Install (120 min) and Closure Install (90 min)
are confirmed. Frontal Reinstall, Closure Reinstall, Color Frontal Install and
Color Closure Install have no confirmed duration yet (`durationMinutes: null`
in `lib/content.ts`); pick a real duration for each in Square rather than
leaving it at whatever the dashboard defaults to.

**Customer intake questions**. The site's own "Have a specific style in mind?"
field (a free-text cut/length/colour/look description) is not sent to Square;
there is no supported way to pass frontend state into this embed. If Nat wants
that question asked, add it as a Square intake question on the booking page
itself, in Square's own dashboard.

**Confirmation and notification settings** (Square Appointments → Notifications).
Decide whether confirmation is automatic or requires Nat's approval, and turn
on the email/text confirmation and reminder messages buyers should receive.
This site sends none of its own; whatever Square is configured to send is the
only confirmation a customer gets.

**Locations**. Both Towson, MD and Laurel, MD are bookable. If Square is set up
with multiple locations, enable both.

## Photography and licence

Everything in `public/images/work/` is **Nat's own work**, shot in her own
studio. It is not stock and it is not licensed from anyone. The originals are in
`photos/`.

There is no stock photography on the site. The last piece, a Pexels shot of a
lace cap used in the services menu on `/book`, was replaced with one of Nat's
frames and deleted. If a slot ever needs a picture the set does not have, use a
real frame that honestly fits it, or a plain swatch (as Wand Curls does), rather
than going back to stock.
