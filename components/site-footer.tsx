import { InstagramLogo } from "@phosphor-icons/react/dist/ssr";
import { NAV_LINKS, STUDIO } from "@/lib/content";

/**
 * Footer. Address and hours are here because this is a real physical venue
 * people drive to, which is the one case location content earns its place.
 * No atmospheric locale strip, no build stamp, no version string.
 *
 * Extra bottom padding on small screens clears the sticky booking bar.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface-2/60">
      <div className="mx-auto max-w-[1400px] px-5 pb-28 pt-16 sm:px-8 lg:pb-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl tracking-tight text-ink">
              {STUDIO.name}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {STUDIO.street}
              <br />
              {STUDIO.region}
            </p>
          </div>

          <nav aria-label="Footer">
            <h2 className="text-sm font-medium text-ink">Pages</h2>
            <ul className="mt-3 flex flex-col">
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

          <div>
            <h2 className="text-sm font-medium text-ink">Contact</h2>
            <ul className="mt-3 flex flex-col text-sm">
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

          <div>
            <h2 className="text-sm font-medium text-ink">Hours</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-muted">
              {STUDIO.hours.map((slot) => (
                <li key={slot.days}>
                  {slot.days}
                  <br />
                  {slot.time}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-14 border-t border-line pt-8 text-sm text-muted">
          &copy; {year} {STUDIO.name}. Every install performed by{" "}
          {STUDIO.owner}. Licensed in Maryland.
        </p>
      </div>
    </footer>
  );
}
