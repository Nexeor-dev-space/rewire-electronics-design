import type { Review } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  reviews: Review[];
  rating?: number;
  reviewCount?: number;
}

/**
 * ProductReviews — the ratings & reviews block on the PDP.
 *
 * Two halves. On the left a small summary card: the average score in
 * display type, the star row, the total count, and a five-row
 * distribution bar showing how the ratings actually land. On the right
 * the individual reviews, each with the author line, the star row for
 * that entry, the title, the body, the date, and a verified-purchase
 * chip when the field is set.
 *
 * Everything derived rather than authored: the average is computed
 * from the review list when `rating` is not supplied, and the
 * distribution is a straight tally so a listing whose stars cluster at
 * 4 does not print an all-5 skeleton bar.
 */
export function ProductReviews({ reviews, rating, reviewCount }: Props) {
  if (!reviews.length) return null;

  const count = reviewCount ?? reviews.length;
  const average = rating ?? averageRating(reviews);
  const distribution = ratingDistribution(reviews);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* ---------- Summary ---------- */}
      <aside className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-2xl border border-line-strong bg-surface p-6 sm:p-8">
          <p className="eyebrow text-ink-muted">Overall rating</p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-sans text-[clamp(2.5rem,4vw,3.5rem)] font-light leading-none tracking-[-0.035em] tabular-nums text-ink">
              {average.toFixed(1)}
            </span>
            <span className="text-[0.9375rem] text-ink-muted">/ 5</span>
          </div>
          <div className="mt-3">
            <StarRow value={average} size="md" />
          </div>
          <p className="mt-3 text-[0.8125rem] text-ink-secondary">
            Based on {count} {count === 1 ? "review" : "reviews"}
          </p>

          {/* Distribution bars — 5→1 top to bottom, tallies on the
              right so the whole strip reads at a glance. */}
          <dl className="mt-6 space-y-2 border-t border-line pt-6">
            {distribution.map(({ stars, count: n, ratio }) => (
              <div
                key={stars}
                className="flex items-center gap-3 text-[0.75rem] tabular-nums"
              >
                <dt className="w-4 shrink-0 text-right font-mono text-ink-muted">
                  {stars}
                </dt>
                <div
                  aria-hidden
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
                >
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
                <dd className="w-6 shrink-0 text-right font-mono text-ink-muted">
                  {n}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>

      {/* ---------- Individual reviews ---------- */}
      <ul className="space-y-6 lg:col-span-8">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="rounded-2xl border border-line-strong bg-surface p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-[0.9375rem] font-medium text-ink">
                  {review.author}
                </p>
                <p className="mt-1 flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                  <time dateTime={review.postedAt}>
                    {formatPostedDate(review.postedAt)}
                  </time>
                  {review.verified && (
                    <>
                      <span aria-hidden className="text-ink-faint">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 text-live">
                        <VerifiedTick />
                        Verified purchase
                      </span>
                    </>
                  )}
                </p>
              </div>
              <StarRow value={review.rating} size="sm" />
            </div>

            <h4 className="mt-5 text-[1rem] font-medium leading-snug tracking-[-0.01em] text-ink">
              {review.title}
            </h4>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-secondary">
              {review.body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Derivations ---------- */

function averageRating(reviews: Review[]): number {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}

/**
 * Bucket the reviews into 5→1 rows with a ratio-to-max — the ratio is
 * against the *biggest* bucket rather than against the total, so a
 * spread of two ratings still fills both bars and does not print two
 * tiny stubs.
 */
function ratingDistribution(reviews: Review[]) {
  const buckets = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => Math.round(r.rating) === stars).length,
    ratio: 0,
  }));
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return buckets.map((b) => ({ ...b, ratio: b.count / max }));
}

function formatPostedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ---------- Star row ---------- */

/**
 * StarRow — five stars, filled to the value. Renders half-fills via a
 * clipped inner span so a 4.3 average reads as "four-and-a-bit"
 * rather than snapping to 4 or 5.
 */
function StarRow({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(1, value / 5)) * 100;
  const px = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div
      className="relative inline-flex"
      role="img"
      aria-label={`Rated ${value.toFixed(1)} out of 5`}
    >
      {/* Ground row — outlined empty stars */}
      <div className="flex gap-1 text-ink-faint">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={px} filled={false} />
        ))}
      </div>
      {/* Fill row — masked to the exact ratio, layered on top */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden text-accent"
        style={{ width: `${pct}%` }}
        aria-hidden
      >
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={px} filled />
          ))}
        </div>
      </div>
    </div>
  );
}

function Star({ className, filled }: { className: string; filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.4}
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
    </svg>
  );
}

function VerifiedTick() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
      aria-hidden
    >
      <path d="m3 8 3.5 3.5L13 4.5" />
    </svg>
  );
}
