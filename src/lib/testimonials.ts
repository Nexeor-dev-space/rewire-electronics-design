/**
 * Customer stories — PLACEHOLDER COPY FOR DESIGN ONLY.
 *
 * These are written to exercise the layout, not to be published. Replace
 * every quote and attribution with real, attributable reviews before this
 * page goes anywhere near a customer.
 *
 * ⚠ On the aggregate ("4.9/5 · 128 verified purchases"): it is **derived**
 * by `getReviewSummary()` from the array below, never written down as a
 * literal. That is the whole point. A hardcoded rating is a factual claim
 * about the business — the one thing on a page like this that turns a
 * design placeholder into a lie, because it survives the swap to real
 * content without anyone noticing it was invented. Derived, it cannot:
 * point the adapter at real orders and the figure corrects itself. Until
 * then it reports the truth about *this array* — a dozen placeholders.
 *
 * `verified` is a property of the order, not the review. It must come from
 * real order data when this is wired; if that link does not exist yet,
 * drop the label rather than assert it.
 */

export interface Testimonial {
  id: string;
  quote: string;
  /** First name and initial, as a real store would publish it. */
  author: string;
  /** The device they actually bought — grounds the quote in a drop. */
  product: string;
  /** Editorial drop label, e.g. "Drop 003". */
  drop: string;
  /** True only when the review is tied to a confirmed order. */
  verified: boolean;
  /** 1–5. Optional: omit rather than guess. Feeds the derived average. */
  rating?: number;
  /** Optional portrait. Absent by default — avatars are not proof. */
  avatar?: { url: string; alt: string };
}

const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "The device looked almost new. I could not believe the price for the condition it arrived in.",
    author: "Arjun M.",
    product: "Halo Phone Pro",
    drop: "Drop 003",
    verified: true,
    rating: 5,
  },
  {
    id: "t2",
    quote:
      "Everything was exactly as described. The grading was honest and the packaging was excellent.",
    author: "Sarah K.",
    product: "Atlas Book 15",
    drop: "Drop 003",
    verified: true,
    rating: 5,
  },
  {
    id: "t3",
    quote:
      "Ordered on the Tuesday and it arrived Thursday. Battery health matched the listing precisely.",
    author: "Daniel R.",
    product: "Orbit Watch Classic",
    drop: "Drop 002",
    verified: true,
    rating: 5,
  },
  {
    id: "t4",
    quote:
      "I have bought refurbished before and returned it twice. This is the first one I kept.",
    author: "Priya N.",
    product: "Signal Phone Pro",
    drop: "Drop 004",
    verified: true,
    rating: 5,
  },
  {
    id: "t5",
    quote:
      "The inspection report in the box was a nice touch. Every line of it matched what I was sold.",
    author: "Tom B.",
    product: "Meridian Book 14",
    drop: "Drop 004",
    verified: true,
    rating: 5,
  },
  {
    id: "t6",
    quote:
      "A faint mark on the underside, exactly where the listing said it would be. No surprises at all.",
    author: "Lena F.",
    product: "Atlas Book 15",
    drop: "Drop 002",
    verified: true,
    rating: 4,
  },
  {
    id: "t7",
    quote:
      "Support answered on a Sunday during the drop. I was not expecting that from a refurbished seller.",
    author: "Marcus O.",
    product: "Echo Studio",
    drop: "Drop 004",
    verified: true,
    rating: 5,
  },
  {
    id: "t8",
    quote:
      "Six months in and the battery is still where they said it was. That is the part that mattered to me.",
    author: "Yuki T.",
    product: "Pulse Watch S",
    drop: "Drop 001",
    verified: true,
    rating: 5,
  },
  {
    id: "t9",
    quote:
      "Shipping took a day longer than quoted. The device itself was flawless, so I would order again.",
    author: "Chris H.",
    product: "Halo Phone Pro",
    drop: "Drop 002",
    verified: true,
    rating: 4,
  },
  {
    id: "t10",
    quote:
      "It came sealed, numbered and charged. It genuinely felt like opening something new.",
    author: "Amara D.",
    product: "Aria Studio",
    drop: "Drop 003",
    verified: true,
    rating: 5,
  },
  {
    id: "t11",
    quote:
      "I compared it against a new one in a shop the same week. I could not tell them apart.",
    author: "Felix W.",
    product: "Signal Phone Pro",
    drop: "Drop 003",
    verified: true,
    rating: 5,
  },
  {
    id: "t12",
    quote:
      "The warranty paperwork arrived before the device did. Small thing, but it settled my nerves.",
    author: "Nadia S.",
    product: "Meridian Book 14",
    drop: "Drop 001",
    verified: true,
    rating: 5,
  },
];

export function getTestimonials(): Testimonial[] {
  return testimonials;
}

export interface ReviewSummary {
  /** Mean of every rating present, or null when none are. */
  average: number | null;
  /** Reviews tied to a confirmed order. */
  verifiedCount: number;
  /** Every published review, rated or not. */
  total: number;
}

/**
 * Computed, never asserted. With no ratings in the data `average` comes
 * back null and the UI is expected to drop the figure rather than invent
 * one — which is what makes this safe to ship ahead of real reviews.
 */
export function getReviewSummary(): ReviewSummary {
  const rated = testimonials.filter((t) => typeof t.rating === "number");
  const average = rated.length
    ? rated.reduce((sum, t) => sum + (t.rating as number), 0) / rated.length
    : null;

  return {
    average,
    verifiedCount: testimonials.filter((t) => t.verified).length,
    total: testimonials.length,
  };
}
