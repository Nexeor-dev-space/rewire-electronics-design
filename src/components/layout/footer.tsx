import Link from "next/link";
import { footerNav, siteConfig } from "@/lib/site";
import { Container } from "./container";

/**
 * Footer — quiet editorial close.
 * Oversized ghost wordmark, hairline dividers, mono metadata.
 */
export function Footer() {
  return (
    <footer className="border-t border-line">
      <Container width="wide" className="py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand column */}
          <div className="md:col-span-5">
            <p className="text-lg font-medium tracking-tighter">
              Rewire<span className="text-accent">.</span>
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              {siteConfig.tagline}
            </p>
          </div>

          {/* Link columns */}
          {footerNav.map((group) => (
            <nav
              key={group.title}
              aria-label={group.title}
              className="md:col-span-2"
            >
              <h3 className="eyebrow mb-5">{group.title}</h3>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="-my-1.5 inline-block py-1.5 text-sm text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Legal line */}
        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-xs tracking-wider text-ink-faint">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="-my-2 inline-block py-2 font-mono text-xs tracking-wider text-ink-faint transition-colors hover:text-ink-secondary"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="-my-2 inline-block py-2 font-mono text-xs tracking-wider text-ink-faint transition-colors hover:text-ink-secondary"
            >
              Terms
            </Link>
          </div>
        </div>
      </Container>

      {/* Ghost wordmark */}
      <div aria-hidden className="overflow-hidden select-none">
        <p className="text-center font-sans text-[22vw] font-bold leading-[0.75] tracking-[-0.05em] text-black/[0.03] translate-y-[18%]">
          Rewire
        </p>
      </div>
    </footer>
  );
}
