import { Wordmark } from "@/components/wordmark";
import { STUDIO } from "@/lib/content";

/**
 * A wine plate carrying Nat's neon mark, used where a photograph of NAT
 * herself belongs and none has been supplied.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS RATHER THAN A STOCK PORTRAIT
 * ---------------------------------------------------------------------------
 * There is no photograph of Nat in this project. There are eighteen
 * photographs of her clients, and not one of them can be used here: a face
 * under the words "Meet Nat" claims to be Nat, and every one of those faces
 * belongs to someone else. A stock portrait would make exactly the same claim
 * with a stranger's face instead.
 *
 * The previous stand-in was a licensed stock frame of a stylist's hands, shot
 * so no face appeared. That was a reasonable compromise while the whole site
 * ran on stock. It stopped being reasonable the moment the rest of the
 * photography became real: one polished catalogue frame among eighteen honest
 * ones is the single image on the page that would read as fake.
 *
 * So the slot holds the brand instead. It is her own sign, it is true, it is
 * on brand, and it reads as a deliberate plate rather than as a missing image.
 *
 * REPLACING IT: this is a component boundary, not a hack. When Nat sends a
 * photograph of herself, drop it into public/images/ and swap this element for
 * a <Photograph>. Nothing around it changes: the parent owns the aspect ratio
 * and the corner radius.
 */
export function BrandPlate({
  caption = "Every install, by Nat.",
  className = "",
}: {
  caption?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative isolate flex h-full w-full flex-col items-center justify-center overflow-hidden bg-ink px-8 text-center ${className}`}
    >
      {/*
        A rose bloom behind the mark, so the light appears to come from behind
        it rather than the mark sitting on a flat field. It is the one gradient
        on the site and it earns its place by being what makes a neon sign read
        as lit.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(70% 55% at 50% 45%, rgb(176 16 80 / 0.38) 0%, transparent 70%)",
        }}
      />

      {STUDIO.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={STUDIO.logo}
          alt={STUDIO.name}
          width={STUDIO.logoWidth}
          height={STUDIO.logoHeight}
          loading="lazy"
          className="h-auto w-[70%] max-w-[20rem]"
        />
      ) : (
        <Wordmark className="text-3xl text-on-accent" />
      )}

      <p className="mt-8 font-display text-lg italic text-on-accent/70">
        {caption}
      </p>
    </div>
  );
}
