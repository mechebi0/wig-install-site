import { InstagramLogo } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/wordmark";
import { NAV_LINKS, STUDIO } from "@/lib/content";

/**
 * Footer, kept minimal on purpose.
 *
 * It used to carry a fourth column of opening hours. Those now live on /book,
 * beside the form, which is the only place someone is deciding when to come
 * in; repeating them here made the footer a second information panel rather
 * than a way out of the page.
 *
 * What is left is the shape a footer should be: the mark, where the studio is,
 * how to reach a person, and the pages. The address stays because this is a
 * real venue people drive to, which is the one case location content earns its
 * place. No atmospheric locale strip, no build stamp, no version string.
 *
 * This is also where the brand mark lives. The nav and the hero both carry the
 * wordmark as type, so the drawn lockup gets exactly one appearance per page,
 * at the end, which is how a mark keeps its weight.
 *
 * Extra bottom padding on small screens clears the sticky booking bar.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface-2/60">
      <div className="mx-auto max-w-[1400px] px-5 pb-28 pt-16 sm:px-8 lg:pb-14 lg:pt-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            {STUDIO.logo ? (
              /*
                The drawn lockup. Swapping public/brand/crown-by-nat.svg for a
                real logo needs no change here. eslint-disable because this is
                a fixed-size brand asset, not content photography: next/image
                would add a wrapper and no optimisation, since the static
                export runs unoptimized anyway.
              */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={STUDIO.logo}
                alt={STUDIO.name}
                width={320}
                height={150}
                className="-ml-1 h-auto w-[190px] max-w-full"
              />
            ) : (
              <Wordmark className="text-2xl text-ink" />
            )}

            <p className="mt-5 text-sm leading-relaxed text-muted">
              {STUDIO.street}
              <br />
              {STUDIO.region}
            </p>
          </div>

          <nav aria-label="Footer" className="lg:col-span-3">
            <h2 className="label text-ink">Pages</h2>
            <ul className="mt-4 flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="flex min-h-11 items-center text-sm text-muted transition-colors hover:text-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h2 className="label text-ink">Contact</h2>
            <ul className="mt-4 flex flex-col text-sm">
              <li>
                <a
                  href={`tel:${STUDIO.phone.replace(/[^+\d]/g, "")}`}
                  className="flex min-h-11 items-center text-muted transition-colors hover:text-accent"
                >
                  {STUDIO.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${STUDIO.email}`}
                  className="flex min-h-11 items-center text-muted transition-colors hover:text-accent"
                >
                  {STUDIO.email}
                </a>
              </li>
              <li>
                <a
                  href={STUDIO.instagram}
                  className="flex min-h-11 items-center gap-2 text-muted transition-colors hover:text-accent"
                >
                  <InstagramLogo size={16} weight="regular" aria-hidden="true" />
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-line pt-8 text-sm text-muted">
          &copy; {year} {STUDIO.name}. Every install performed by {STUDIO.owner}.
        </p>
      </div>
    </footer>
  );
}
