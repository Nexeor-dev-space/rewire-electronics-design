"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "@/components/providers/account-provider";
import {
  formatOrderDate,
  getRecentOrderedProducts,
  getRecentOrders,
} from "@/lib/account-data";
import { getProductBySlug } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { AccountShell } from "./account-shell";
import { OrderSummaryCard } from "./order-summary-card";

/**
 * AccountOverview — the /account landing surface.
 *
 * Three horizontal beats: profile summary, quick actions, activity. The
 * ordering is intentional — a shopper who has just signed in looks for
 * "what's happening with my orders" first; the profile summary answers
 * "am I signed in as me" and the quick actions answer "where else can I
 * go from here".
 */

export function AccountOverview() {
  const { user, ready, wishlistSlugs } = useAccount();

  const recentOrders = useMemo(() => getRecentOrders(3), []);
  const recentProducts = useMemo(() => getRecentOrderedProducts(4), []);
  const activeOrders = useMemo(
    () =>
      recentOrders.filter(
        (o) => o.status === "processing" || o.status === "shipped",
      ).length,
    [recentOrders],
  );

  if (!ready) return <AccountShell title="Account" />;

  return (
    <AccountShell
      title={`Welcome back, ${user?.name?.split(" ")[0] ?? "guest"}.`}
      subtitle="Everything you own from Rewire lives here — orders, returns, saved addresses and settings, in one place."
    >
      <div className="grid gap-6">
        <ProfileSummary />

        <QuickActions
          activeOrders={activeOrders}
          wishlistCount={wishlistSlugs.length}
        />

        {/* ---------- Recent orders ---------- */}
        <section className="mt-2">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-[1.25rem] font-medium text-ink">Recent orders</h2>
            <Link
              href="/account/orders"
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-secondary hover:text-ink"
            >
              See all
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="size-3"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentOrders.map((order) => (
              <OrderSummaryCard key={order.id} order={order} />
            ))}
            {recentOrders.length === 0 && (
              <EmptyState
                title="No orders yet"
                body="Anything you buy will land here — with tracking, invoices and one-click returns."
                cta={{ href: "/", label: "Explore the shop" }}
              />
            )}
          </div>
        </section>

        {/* ---------- Recently ordered ---------- */}
        {recentProducts.length > 0 && (
          <section className="mt-6">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="text-[1.25rem] font-medium text-ink">
                Recently ordered
              </h2>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                From your last {recentProducts.length} unique buys
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {recentProducts.map((item) => (
                <li key={item.slug}>
                  <RecentProductCard slug={item.slug} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AccountShell>
  );
}

/* ============================================================
   Profile summary card
   ============================================================ */

function ProfileSummary() {
  const { user } = useAccount();
  if (!user) return null;
  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section
      aria-labelledby="account-profile-heading"
      className="rounded-2xl border border-line bg-surface p-6 md:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="flex size-14 items-center justify-center rounded-full bg-surface-2 font-mono text-[0.9375rem] tracking-[0.08em] text-ink"
          >
            {initials}
          </div>
          <div>
            <h2 id="account-profile-heading" className="text-[1.25rem] font-medium text-ink">
              {user.name}
            </h2>
            {user.memberSince && (
              <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                Member since {formatOrderDate(user.memberSince)}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/account/settings"
          className="text-[0.8125rem] font-medium text-ink hover:text-accent"
        >
          Edit profile
        </Link>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Email
          </dt>
          <dd className="mt-1.5 text-[0.9375rem] text-ink">{user.email}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Phone
          </dt>
          <dd className="mt-1.5 text-[0.9375rem] text-ink">
            {user.phone ?? "Not added yet"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/* ============================================================
   Quick actions
   ============================================================ */

function QuickActions({
  activeOrders,
  wishlistCount,
}: {
  activeOrders: number;
  wishlistCount: number;
}) {
  const actions = [
    {
      href: "/account/orders",
      label: "My Orders",
      hint: activeOrders > 0 ? `${activeOrders} active` : "Track past purchases",
    },
    {
      href: "/account/returns",
      label: "Returns & Refunds",
      hint: "Manage active requests",
    },
    {
      href: "/account/wishlist",
      label: "Wishlist",
      hint:
        wishlistCount > 0
          ? `${wishlistCount} saved item${wishlistCount === 1 ? "" : "s"}`
          : "Nothing saved yet",
    },
    {
      href: "/account/addresses",
      label: "Saved Addresses",
      hint: "Delivery & billing",
    },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <li key={action.href}>
          <Link
            href={action.href}
            className={cn(
              "group/action flex h-full flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-5",
              "transition-[border-color,transform] duration-(--duration-base) ease-(--ease-out-expo)",
              "hover:-translate-y-0.5 hover:border-line-strong",
            )}
          >
            <div>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
                {action.hint}
              </p>
              <p className="mt-2 text-[1rem] font-medium text-ink">
                {action.label}
              </p>
            </div>
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 text-ink-muted transition-[transform,color] duration-(--duration-fast) group-hover/action:translate-x-1 group-hover/action:text-ink"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================
   Recently ordered — small product tile
   ============================================================ */

function RecentProductCard({ slug }: { slug: string }) {
  const product = getProductBySlug(slug);
  if (!product) return null;
  const image = product.images[0];
  return (
    <Link
      href={`/product/${product.slug}`}
      className={cn(
        "group/tile block rounded-xl border border-line bg-surface p-3",
        "transition-[border-color,transform] duration-(--duration-fast)",
        "hover:-translate-y-0.5 hover:border-line-strong",
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-plate">
        {image && (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 45vw, 22vw"
            className={image.fit === "cover" ? "object-cover" : "object-contain p-3"}
          />
        )}
      </div>
      <p className="mt-3 truncate text-[0.875rem] font-medium text-ink">
        {product.name}
      </p>
      <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
        {product.variant}
      </p>
    </Link>
  );
}

/* ============================================================
   Empty state — used for the orders rail when there are none
   ============================================================ */

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-8 text-center">
      <p className="text-[1rem] font-medium text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-ink-secondary">
        {body}
      </p>
      <Link
        href={cta.href}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-accent hover:text-accent"
      >
        {cta.label}
      </Link>
    </div>
  );
}
