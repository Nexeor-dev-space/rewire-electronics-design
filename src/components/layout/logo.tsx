import Image from "next/image";
import Link from "next/link";
import { brandLogo, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * Logo — the Rewire logo image (REWIRE. over ELECTRONICS), linked home.
 *
 * Every place that shows the brand (storefront header and footer, checkout
 * header, admin sidebar) uses this component, so the mark can only ever
 * look one way. The files are described on `brandLogo` in `lib/site.ts`.
 *
 * `tone="dark"` (the default) is for the storefront, which is always on a
 * dark ground. `tone="auto"` renders both cuts and lets the `.brand-logo-*`
 * rules in `globals.css` show the one that suits the admin console's light
 * or dark theme, so neither flashes the wrong colour.
 *
 * The height is set by `className` (default `h-8 md:h-9`); the width
 * follows the file's aspect ratio.
 */
export function Logo({
  href = "/",
  label = "home",
  tone = "dark",
  priority = false,
  onClick,
  className,
}: {
  href?: string;
  /** Where the link goes, for screen readers: "Rewire Electronics — home". */
  label?: string;
  tone?: "dark" | "auto";
  /** Preload: true for the header, which is on every first paint. */
  priority?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const image = (src: string, extra?: string) => (
    <Image
      src={src}
      alt=""
      width={brandLogo.width}
      height={brandLogo.height}
      priority={priority}
      className={cn("h-full w-auto", extra)}
    />
  );

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={`${siteConfig.name} — ${label}`}
      className={cn(
        "-my-2 inline-flex h-8 shrink-0 py-2 box-content transition-opacity duration-(--duration-fast) hover:opacity-70 md:h-9",
        className,
      )}
    >
      {tone === "auto" ? (
        <>
          {image(brandLogo.onLight, "brand-logo-on-light")}
          {image(brandLogo.onDark, "brand-logo-on-dark")}
        </>
      ) : (
        image(brandLogo.onDark)
      )}
    </Link>
  );
}
