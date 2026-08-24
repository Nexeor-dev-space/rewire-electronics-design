"use client";

import Image from "next/image";
import Link from "next/link";
import { getWaitlistProducts } from "@/lib/waitlist";
import { productHrefForDrop } from "@/lib/route-map";
import { formatDropDate } from "@/lib/utils";
import { Countdown } from "@/components/ui/countdown";
import { AccountShell } from "./account-shell";

/**
 * AccountWaitlists — the /account/waitlists surface.
 *
 * A shopper lands here from the account menu when they want to see
 * every drop they have registered interest in. Reads the catalogue in
 * `lib/waitlist.ts` and flattens the product → variant tree into one
 * row per registration, so the reader sees exactly what they signed
 * up for (Signal Phone Pro · Graphite · 512GB) rather than a
 * product-level summary they still have to expand.
 *
 * The prototype seeds every catalogue variant as "you are on this
 * list" — persistence lands when the waitlist form wires up a real
 * endpoint. When that happens, swap the flat list below for a filter
 * against the account provider's `joinedWaitlists` slugs; the tile,
 * the empty state and the shell need no changes.
 *
 * Each row carries the launch date, an inline countdown to the drop
 * opening, and the variant's allocated units — the three facts a
 * shopper checks before deciding whether to also set a calendar
 * reminder.
 */
interface WaitlistRow {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: { url: string; alt: string };
  variantId: string;
  variantLabel: string;
  startsAt: string;
  units: number;
}

function getJoinedWaitlists(): WaitlistRow[] {
  return getWaitlistProducts().flatMap((product) =>
    product.variants.map((variant) => ({
      productId: product.id,
      productName: product.name,
      productSlug: product.id,
      productImage: product.image,
      variantId: variant.id,
      variantLabel: variant.label,
      startsAt: variant.startsAt,
      units: variant.units,
    })),
  );
}

export function AccountWaitlists() {
  const rows = getJoinedWaitlists();

  return (
    <AccountShell
      title="My Waitlists"
      subtitle="Every drop you have registered for. We hold your place and email the moment allocations open."
    >
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:gap-5">
          {rows.map((row) => (
            <li key={`${row.productId}:${row.variantId}`}>
              <WaitlistTile row={row} />
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}

/**
 * WaitlistTile — one drop registration, presented as an editorial row.
 *
 * Split card mirroring the shape of the Savings tile so the two feel
 * like the same house pattern: cream photography plate on the left,
 * dark data panel on the right. On the plate: the product cutout
 * with `mix-blend-mode: multiply` so the baked-in white studio
 * background dissolves into the plate. On the panel: variant + name,
 * then a small fact grid (opens, allocation, position), then the
 * secondary actions.
 */
function WaitlistTile({ row }: { row: WaitlistRow }) {
  const opensDate = formatDropDate(row.startsAt);

  return (
    <article className="group/tile flex flex-col overflow-hidden rounded-2xl border border-line-strong bg-surface transition-colors duration-(--duration-base) ease-(--ease-out-expo) hover:border-white/[0.22] sm:flex-row">
      {/* ---------- Photograph plate ---------- */}
      <div className="relative aspect-[5/4] shrink-0 overflow-hidden bg-plate sm:aspect-auto sm:w-[38%] lg:w-[32%]">
        <Image
          src={row.productImage.url}
          alt=""
          fill
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 34vw, 22vw"
          className="object-cover [mix-blend-mode:multiply] transition-transform duration-(--duration-cinematic) ease-(--ease-out-expo) motion-safe:group-hover/tile:scale-[1.03]"
        />
      </div>

      {/* ---------- Data panel ---------- */}
      <div className="flex flex-1 flex-col p-6 sm:p-7 lg:p-8">
        <div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
            {row.variantLabel}
          </p>
          <h3 className="mt-2 text-[clamp(1.125rem,1.5vw,1.375rem)] font-medium leading-tight tracking-[-0.02em] text-ink">
            <Link
              href={productHrefForDrop(row.productSlug)}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {row.productName}
            </Link>
          </h3>
        </div>

        {/* ---------- Fact strip ----------
            Three quiet numbers on a hairline row: when the drop opens,
            how many units the variant carries, and the reader's own
            position. The countdown ticks live so a shopper who leaves
            this page open still sees the clock. */}
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5 sm:mt-auto">
          <div>
            <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
              Opens
            </dt>
            <dd className="mt-1.5 font-sans text-[0.9375rem] font-medium leading-tight tracking-[-0.01em] text-ink">
              {opensDate}
            </dd>
            <dd className="mt-1 font-mono text-[0.6875rem] tabular-nums text-accent">
              <Countdown
                compact
                target={row.startsAt}
                label={`${row.productName} drop opens in`}
              />
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
              Allocation
            </dt>
            <dd className="mt-1.5 font-sans text-[0.9375rem] font-medium leading-tight tracking-[-0.01em] tabular-nums text-ink">
              {row.units} units
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
              Status
            </dt>
            <dd className="mt-1.5 flex items-center gap-2 font-sans text-[0.9375rem] font-medium leading-tight tracking-[-0.01em] text-ink">
              <span
                aria-hidden
                className="size-1.5 shrink-0 animate-pulse-dot rounded-full bg-live"
              />
              Confirmed
            </dd>
          </div>
        </dl>

        {/* ---------- Secondary actions ----------
            Live above the card link overlay via `z-10` so the two
            buttons work independently of the tile-wide navigation. */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-4">
          <Link
            href={productHrefForDrop(row.productSlug)}
            className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink transition-colors duration-(--duration-fast) hover:text-accent"
          >
            View device
            <svg
              aria-hidden
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3"
            >
              <path d="M1.5 7h11M8.5 3.5L12 7l-3.5 3.5" />
            </svg>
          </Link>
          <button
            type="button"
            className="text-[0.8125rem] font-medium text-ink-muted underline underline-offset-4 transition-colors duration-(--duration-fast) hover:text-ink"
          >
            Leave list
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-12 text-center">
      <p className="text-[1.0625rem] font-medium text-ink">
        No waitlists yet
      </p>
      <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-ink-secondary">
        When you register for an upcoming drop, it appears here with a
        live countdown to the opening — no need to check the calendar.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink transition-colors duration-(--duration-fast) hover:border-accent hover:text-accent"
      >
        See upcoming drops
      </Link>
    </div>
  );
}
