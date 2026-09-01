import { STUDIO } from "@/lib/content";

/**
 * The typographic wordmark, used in the nav, the mobile sheet and the footer.
 *
 * "Crowned by Nat" reads as three words of equal weight if it is set plainly, so
 * the connector is dropped into Playfair italic at a lighter colour. It is a
 * small move and it is the whole difference between a business name and a
 * lockup.
 *
 * The split is derived from STUDIO.name rather than hardcoded, so content.ts
 * stays the single source of truth for the brand name. Any name without a
 * connecting "by" simply renders whole, which is the correct fallback.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  const [head, tail] = STUDIO.name.split(/\sby\s/i);

  return (
    <span className={`font-display tracking-tight ${className}`}>
      {tail === undefined ? (
        STUDIO.name
      ) : (
        <>
          {head}
          <em className="font-normal italic opacity-70">{" by "}</em>
          {tail}
        </>
      )}
    </span>
  );
}
