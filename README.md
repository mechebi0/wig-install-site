# Crown by Nat

Marketing site for **Crown by Nat**, a one-chair lace wig install studio. Every
install is performed personally by Nat.

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
brand, a preview of the work, a preview of the services, and two ways to book.
Everything that needs a paragraph to explain lives on its own page.

| Route              | What is on it                                         |
| ------------------ | ----------------------------------------------------- |
| `/`                | Hero carousel, brand statement, 3 installs, 3 services, closing CTA |
| `/work`            | The full install rail and the style galleries          |
| `/book`            | Every service with prices, studio details, request form |
| `/before-you-book` | The appointment step by step, and the full FAQ         |
| `/reviews`         | Client quotes                                          |
| `/meet-nat`        | Biography, credentials, the three assurances           |

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
`trailingSlash: true` (so every route exports as `<route>/index.html`, which
resolves on any static host). **Do not add API routes, server actions,
middleware, or ISR** — none of them exist on a static host and any one of them
breaks the deployment.

### Why navigation uses plain `<a>` and not `next/link`

Under `output: "export"`, Next 16.3.3 writes each route's RSC payload to
`out/work/__next.work/__PAGE__.txt` but requests it at
`/work/__next.work.__PAGE__.txt`. Those never match, so with `next/link` every
page load fired a prefetch that 404'd and every client-side navigation fell
back to a full page load anyway — the same navigation, plus a console full of
404s on all six pages.

The fix would be a post-build step renaming those files, which would mean the
Cloudflare build command could no longer be plain `npx next build`. Six static
pages do not need client-side routing, so the site uses anchors and
`@next/next/no-html-link-for-pages` is disabled in `eslint.config.mjs` with the
same explanation. If a future Next release fixes the payload paths, switch the
nav, the footer and `ButtonLink` back to `next/link` and delete that override.

## Where to change things

Almost everything Nat will want to edit lives in two files.

### `lib/content.ts` — all copy and business details

- `STUDIO` — brand name, owner, address, phone, email, Instagram, hours.
  The invented stand-ins are grouped in a `PLACEHOLDER` block at the top of the
  file so there is one place to edit and nothing gets missed.
- `STUDIO.bookingUrl` — **the one switch that controls booking.** Leave it
  empty and every CTA goes to `/book`, which renders the request form. Paste a
  Square / Fresha / Calendly / Acuity link and every CTA opens that instead,
  and `/book` swaps the form for a hand-off panel automatically.
- `SERVICES` — names, prices, durations. The homepage previews the first three.
- `PAGES` — the kicker, title and lede at the top of each page.
- `HOME` — the homepage preview headings and the closing CTA.
- `OWNER`, `QUESTIONS`, `TESTIMONIALS`, `PROCESS`, `ASSURANCES`.

### `lib/images.ts` — every photograph

Each slot points at a file under `public/images/`. Drop a replacement in using
the same filename and matching aspect ratio and nothing else changes. Keep the
`width` / `height` values truthful to the file: they reserve layout space and
are what holds layout shift at zero.

```
public/images/hero/     six hero slides, two crops each (see below)
public/images/          everything else, 4:5 portrait unless noted
public/brand/           the brand lockup used in the footer
```

The hero ships **two crops per slide** — `*-wide.jpg` at 1920x1200 and
`*-tall.jpg` at 1080x1440 — and `<picture>` fetches exactly one, chosen by the
shape of the frame rather than its width alone. A portrait tablet is a 0.8
frame and wants the portrait crop just as much as a phone does.

## The hero carousel has no play button

That is a deliberate design decision, and it has a cost worth knowing about.
WCAG 2.2.2 asks for a mechanism to pause, stop or hide anything that moves
automatically for more than five seconds, and a labelled control is the obvious
way to provide one. In its place:

- touching any dot stops the rotation permanently
- rotation pauses while keyboard focus is anywhere inside the hero
- under `prefers-reduced-motion` it never starts, and the dots are the full
  manual control

Hover deliberately does not pause: the hero is the whole viewport, so at
desktop a pointer rests on it almost all the time. If stricter conformance is
wanted later, restoring a discreet pause control beside the dots is a small
change in `components/hero-carousel.tsx`.

## Things that still need Nat

- Real address, phone, email, Instagram handle and opening hours
- Confirmed service prices and durations
- Her own biography and a photograph of her working
- Real client photos to replace the stock imagery
- Real client reviews. Until then `testimonialsArePlaceholder` in
  `lib/content.ts` stays `true`, which keeps a visible "sample wording" notice
  on `/reviews`. **Do not flip that flag while the words are still invented.**
- A booking link, if she uses a booking tool

## Photography licence

All current imagery is royalty-free stock from
[Pexels](https://www.pexels.com/license/): free for commercial use, no
attribution required. Files are downloaded and committed rather than hotlinked,
so the deployment has no third-party image dependency. Each slot records its
originating `sourceId` for traceability.

Two limits worth knowing: the licence does not permit implying that an
identifiable person endorses the business, which is why gallery captions
describe the style and never name a client, why testimonials carry no faces,
and why the About photograph is hands-and-hair rather than a portrait that
would read as "this is Nat". And these are stand-ins — Nat's real portfolio
will convert better than any of them.
