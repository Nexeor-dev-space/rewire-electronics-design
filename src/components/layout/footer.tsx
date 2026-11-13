import Link from "next/link";
import { ContactLinks } from "@/components/contact/contact-links";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { ContactDetails } from "@/types/contact";
import type { NavGroup, PublishedNavigation } from "@/types/navigation";
import { Container } from "./container";
import { Logo } from "./logo";

/**
 * The footer: a top row (brand block, link columns) and a base (bottom bar,
 * watermark). Which parts show, and in what order, is staff's choice in
 * Storefront, Navigation; see docs/NAVIGATION.md.
 */
export function Footer({ navigation, contact }: { navigation: PublishedNavigation; contact: ContactDetails }) {
  const { top, base, columns, bottomLinks } = navigation.footer;
  const hasBase = base.length > 0;

  return (
    <footer className="border-t border-line">
      {top.length > 0 && (
        <Container width="wide" className={cn("pt-16 md:pt-24", !hasBase && "pb-16 md:pb-24")}>
          {/* Two link columns side by side on phones, the brand block above
              them; the full twelve column row from `md`. */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-12">
            {top.map((part) =>
              part.id === "brand" ? (
                <div key={part.id} className="col-span-2 md:col-span-5">
                  <Logo variant="text" />
                  <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
                    {siteConfig.tagline}
                  </p>
                  <ContactLinks contact={contact} className="mt-6" />
                </div>
              ) : (
                columns.map((group) => <FooterColumn key={group.id} group={group} />)
              ),
            )}
          </div>
        </Container>
      )}

      {base.map((part) =>
        part.id === "bottomBar" ? (
          <Container
            key={part.id}
            width="wide"
            className={cn(top.length > 0 ? "pt-16" : "pt-16 md:pt-24", "pb-16 md:pb-24")}
          >
            <div className="flex flex-col gap-4 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
              <p className="font-mono text-xs tracking-wider text-ink-faint">
                © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
              </p>
              <div className="flex gap-6">
                {bottomLinks.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="-my-2 inline-block py-2 font-mono text-xs tracking-wider text-ink-faint transition-colors hover:text-ink-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </Container>
        ) : (
          <div key={part.id} aria-hidden className="overflow-hidden select-none">
            <p className="text-center font-sans text-[22vw] font-bold leading-[0.75] tracking-[-0.05em] text-white/[0.035] translate-y-[18%]">
              REWIRE
            </p>
          </div>
        ),
      )}
    </footer>
  );
}

function FooterColumn({ group }: { group: NavGroup }) {
  return (
    <nav aria-label={group.title} className="md:col-span-2">
      <h3 className="eyebrow mb-5">{group.title}</h3>
      <ul className="space-y-3">
        {group.links.map((item) => (
          <li key={item.id}>
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
  );
}
