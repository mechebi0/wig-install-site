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
| `/book`                    | Every service and price, choose install then finish, the booking flow |
| `/before-you-book`         | The appointment step by step, and the FAQ                          |
| `/reviews`                 | Client quotes                                                      |
| `/meet-nat`                | Introduction, credentials, three assurances                        |
| `/login` `/signup` `/account` | Customer accounts and appointments                              |
| `/admin`                   | Nat's dashboard. Deliberately absent from all public navigation    |

The six collection pages are generated from one file, `app/gallery/[slug]/page.tsx`,
via `generateStaticParams`, so the build emits six real HTML files and the six
pages cannot drift apart. The two install pages work the same way from
`app/installs/[type]/page.tsx`, reading `lib/taxonomy.ts`.

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
  values still missing (phone, street, hours, Instagram). **Anything empty is
  empty on purpose**: every component reads these through helpers and renders
  nothing at all where there is no real value, so the site can never advertise a
  phone number nobody owns. Fill one in and it appears everywhere at once.
  The nav's Instagram icon is the one deliberate exception: it renders even
  while `CONTACT.instagram` is empty, pointed at `INSTAGRAM_URL_PLACEHOLDER`
  (Instagram's own homepage, never a guessed handle) so the control exists and
  works today. Fill in `CONTACT.instagram` and it takes over automatically;
  see the note beside `INSTAGRAM_URL_PLACEHOLDER` in `lib/content.ts`.
- `LOCATIONS` — Towson, MD and Laurel, MD. The single source of truth for the
  service area: the announcement stripe, the footer, the "Where" row on
  `/book`, the page metadata and the LocalBusiness structured data all derive
  from it, so adding or removing a town is one line. It is the compiled-in
  fallback used while there is no Supabase project; see `lib/catalog.ts`.
  Laurel, MD was paused on 2026-09-02 and confirmed again on 2026-09-22; the
  row was never deleted from the `locations` table, only marked inactive, so
  Nat can switch either town off from the admin dashboard without a deploy.
- `STUDIO.bookingUrl` — **the one switch that controls booking.** Leave it empty
  and every CTA goes to `/book`. Paste a Square / Fresha / Calendly / Acuity
  link and every CTA opens that instead, and `/book` swaps the form for a
  hand-off panel automatically. `bookingTarget({ install, finish, style })`
  builds the link; an install-type link (below) wins over this one when it is
  set.
- `SERVICES` — names, prices, durations. Still stand-ins. `frontal` and
  `closure` are the two install types and take their names from
  `lib/taxonomy.ts`.
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
frame proves, not by a guess. `installType` in `GALLERY_ITEMS` is `"frontal"`
only where the photograph shows lace laid past the point a closure's lace would
stop (edges laid down at a temple, a side part with the hairline laid across it,
or the hair taken off the face), which only ear-to-ear lace allows. Everywhere
else it is `null`: the look stays in the gallery, unlabelled, and is never used
as an install example. No photograph is `"closure"`, because a finished closure
shows nothing a frontal could not also show; only Nat can mark one. That is
why `/installs/closure/` has no gallery of its own yet, and why its lead
photograph is captioned as the look a closure is built around rather than as a
closure. Marking a photograph is a one-line edit in `GALLERY_ITEMS`, and the
gallery tag and the install page examples follow automatically.

The `/gallery/body-wave-glam` URL and its `body-wave-glam` key are kept so
existing links do not break; the style is now labelled "Body Wave".

### `lib/gallery.ts` — the read path

Every component that shows a collection reads it through here, not out of
`lib/collections.ts` directly. Today these functions return the compiled-in
constants; when Nat has a Supabase project and an admin screen, they return
rows and no component changes. See the note at the top of that file for why the
gallery is still in the bundle (short version: a static export has no server
render to fetch during, so a database-backed gallery would ship six pages of
empty grids).

### `lib/images.ts` — the hero rotation and the services picture

The hero slides reference photographs out of `lib/collections.ts`, so a picture
is never described in two places. What is left here is the ordering of the hero
slides and the one picture in the services menu on `/book`, which is Nat's own
work like everything else; there is no stock photography on the site.

```
public/images/work/    every photograph of finished work, three widths each
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
account dashboard, guest booking, the five-step booking flow, and the admin
dashboard with locations, appointments, customers and services. All of it is
real code against a real schema, and all of it degrades honestly when there is
no Supabase project: the nav hides the account control, `/login` and `/admin`
say plainly that the booking system is not connected, and `/book` falls back to
an email request form. **The production build does not need any Supabase
environment variable.**

**Schema ready, not yet wired.** `supabase/migrations/0002_gallery_reviews_settings.sql`
adds `gallery_items`, `gallery_categories`, `gallery_item_categories`,
`reviews` and `business_settings`, with row level security and an admin-only
write policy on each. Row types are in `lib/supabase/types.ts`. Nothing reads
them yet; they exist so the admin screens Nat eventually gets (manage gallery
photos, categories, featured images, ordering, reviews, and which town is open)
have a decided shape to be built against.

**Authorization is in the database, not the frontend.** Admin rights come from
`profiles.role` checked by `is_admin()` inside Postgres. The admin email
appearing anywhere in client code grants nothing: anyone can read the bundle and
call the API, so a check in the browser is decoration. Granting Nat admin is one
UPDATE, documented in `supabase/README.md`.

## Things still needed from Nat

- **Written consent from the clients in the photographs.** Every face on this
  site is a real customer. This is the one outstanding item that is not
  cosmetic.
- A phone number, a street address, opening hours, and an Instagram handle.
  Until then the site simply does not mention them.
- Confirmation that `crownedbynattt@gmail.com` is the right **public** contact.
  It is currently both the public address and the admin account.
- Confirmed service prices and durations.
- Confirmed appointment policy. `policiesAreDraft` in `lib/content.ts` is `true`,
  which puts a visible "draft answers" notice on `/before-you-book`.
- Her own biography, and a photograph of herself. Until one arrives, the portrait
  slot on `/meet-nat` holds a brand plate rather than a stranger's face; see
  `components/brand-plate.tsx`.
- Real client reviews. Until then `testimonialsArePlaceholder` stays `true`,
  which keeps the visible "sample wording" notice on `/reviews`. **Do not flip
  that flag while the words are still invented.**
- More Signature Bob and Body Wave photographs. Those two collections have
  three and two; the others have five or six.
- **Which photographs are closures.** No photograph can prove a closure, so
  none is labelled one and `/installs/closure/` has no gallery of its own until
  Nat marks some (`installType: "closure"` in `GALLERY_ITEMS`). The same goes for
  the six looks left unlabelled because the frame does not settle frontal or
  closure (the melted centre part, long layers, shoulder sweep, glass finish,
  copper body wave, and warm copper).
- **A photograph of Wand Curls.** None of the set is described as one, so that
  option shows a plain swatch. Add it to `FINISH_PHOTOS` in
  `lib/collections.ts` and the option picks it up.
- Confirmation that Curls, Wand Curls and Crimps are the finishes she offers,
  on both installs, and what, if anything, they add to the price or the time.
- The Acuity account: the two appointment types (Frontal Install, Closure
  Install), their links, and a "Finish" intake question. See the table under
  `lib/taxonomy.ts` above for where each goes.
- Supabase project credentials. See `supabase/README.md`.

## Photography and licence

Everything in `public/images/work/` is **Nat's own work**, shot in her own
studio. It is not stock and it is not licensed from anyone. The originals are in
`photos/`.

There is no stock photography on the site. The last piece, a Pexels shot of a
lace cap used in the services menu on `/book`, was replaced with one of Nat's
frames and deleted. If a slot ever needs a picture the set does not have, use a
real frame that honestly fits it, or a plain swatch (as Wand Curls does), rather
than going back to stock.
