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

## Deployment

Cloudflare Pages, building from `main`:

| Setting          | Value                        |
| ---------------- | ---------------------------- |
| Production branch| `main`                       |
| Framework preset | Next.js (Static HTML Export) |
| Build command    | `npx next build`             |
| Output directory | `out`                        |
| Root directory   | `/`                          |

`next.config.ts` sets `output: "export"` and `images.unoptimized`. **Do not add
API routes, server actions, middleware, or ISR** — none of them exist on a
static host and any one of them breaks the deployment.

## Where to change things

Almost everything Nat will want to edit lives in two files.

### `lib/content.ts` — all copy and business details

- `STUDIO` — brand name, owner, address, phone, email, Instagram, hours.
  The invented stand-ins are grouped in a `PLACEHOLDER` block at the top of the
  file so there is one place to edit and nothing gets missed.
- `STUDIO.bookingUrl` — **the one switch that controls booking.** Leave it
  empty and every CTA scrolls to the on-page form. Paste a Square / Fresha /
  Calendly / Acuity link and every CTA opens that instead, and the on-page form
  section removes itself automatically.
- `SERVICES` — names, prices, durations.
- `OWNER`, `QUESTIONS`, `TESTIMONIALS`, and the per-section headings.

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

The hero ships **two crops per slide** — `*-wide.jpg` at 1920x1200 for tablet
and desktop, `*-tall.jpg` at 1080x1440 for phones — and `<picture>` fetches
exactly one of them. A single landscape image cropped into a phone viewport
shows a narrow band through the middle of the frame and cuts the hair out of a
hair photograph, which is the whole reason for the second crop.

## Things that still need Nat

- Real address, phone, email, Instagram handle and opening hours
- Confirmed service prices and durations
- Her own biography and a photograph of her working
- Real client photos to replace the stock imagery
- Real client reviews. Until then `testimonialsArePlaceholder` in
  `lib/content.ts` stays `true`, which keeps a visible "sample wording" notice
  on the section. **Do not flip that flag while the words are still invented.**
- A booking link, if she uses a booking tool

## Photography licence

All current imagery is royalty-free stock from
[Pexels](https://www.pexels.com/license/): free for commercial use, no
attribution required. Files are downloaded and committed rather than hotlinked,
so the deployment has no third-party image dependency. Each slot records its
originating `sourceId` for traceability.

Two limits worth knowing: the licence does not permit implying that an
identifiable person endorses the business, which is why gallery captions
describe the style and never name a client and why testimonials carry no faces.
And these are stand-ins — Nat's real portfolio will convert better than any of
them.
