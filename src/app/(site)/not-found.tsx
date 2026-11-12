import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { cn } from "@/lib/utils";

/**
 * Storefront 404 — rendered inside the `(site)` layout, so a visitor who
 * follows a dead link keeps the header, footer and tab bar and has two
 * clear ways on: the collection to shop, or the homepage.
 *
 * Reached two ways: a page calling `notFound()` (an unpublished product,
 * a renamed category, a closed release), and any URL no route owns, which
 * `[...notFound]/page.tsx` forwards here. Next answers with a real 404
 * status in both cases, so search engines drop the URL.
 */
export default function SiteNotFound() {
  return (
    <section className="page-top mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center gap-8 px-(--spacing-gutter) pb-(--spacing-section) text-center">
      <div>
        <h1 className="text-display-lg text-ink">
          <span className="block font-light">This page</span>
          <span className="block font-normal">has moved on.</span>
          <span className="block font-bold tracking-tighter">The devices haven&apos;t.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base text-ink-secondary">
          The link you followed points at a page that no longer exists, or
          never did. Every device on the website is in the collection.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={SHOP_INDEX_HREF} className={cn(buttonVariants({ variant: "primary" }))}>
          Shop the collection
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to home
        </Link>
      </div>
    </section>
  );
}
