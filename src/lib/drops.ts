import type { Drop } from "@/types";

/**
 * Drop data adapter — mock for now, Payload CMS later.
 * Swap the bodies of getNextDrop() / getUpcomingDrops() for CMS queries
 * without touching the UI.
 */

export interface NextDropInfo {
  drop: Drop;
  /** Units allocated to this drop — drives the scarcity badge. */
  units: number;
  /** Featured device teased in the hero. */
  device: {
    /** Marketing name shown in the hero's featured-drop block. */
    name: string;
    /** Finish and capacity, e.g. "Graphite · 512GB". */
    variant: string;
    image: { url: string; alt: string; width: number; height: number };
  };
}

const nextDrop: NextDropInfo = {
  drop: {
    id: "drop-005",
    slug: "drop-005-signal-edit",
    title: "The Signal Edit",
    edition: "Drop 005",
    status: "upcoming",
    // Placeholder launch date — replace with CMS data.
    startsAt: "2026-08-14T18:00:00Z",
    endsAt: "2026-08-17T18:00:00Z",
  },
  units: 25,
  device: {
    // Matches the Drop 005 entry in `upcomingDrops` below — the hero and
    // Section 02 must name the same device. Swap for real model names
    // (e.g. "iPhone 15 Pro Max") once the catalogue is wired.
    name: "Signal Phone Pro",
    variant: "Graphite · 512GB",
    image: {
      url: "/images/hero-product.png",
      alt: "Matte black Rewire device with embossed logotype, floating",
      width: 849,
      height: 1900,
    },
  },
};

export function getNextDrop(): NextDropInfo {
  return nextDrop;
}

/* ============================================================
   The live drop — what the hero is selling right now
   ============================================================ */

/**
 * One device inside the live drop. Stock is per device, not per drop:
 * a release goes out as a handful of units of each thing in it, and the
 * hero's scarcity panel reads whichever device is currently on screen.
 */
export interface LiveDropDevice {
  id: string;
  /**
   * Route segment for this device's own page, under `/drops` alongside
   * the upcoming releases. Devices need their own destination because
   * anything that names one item and offers to show it — the savings
   * cards, for instance — would otherwise have to send the reader to the
   * whole drop and let them find it again.
   */
  slug: string;
  name: string;
  /** Finish and capacity, e.g. "Graphite · 256GB". */
  variant: string;
  /** Units allocated to this device. Drops run 10–15 units a device. */
  unitsTotal: number;
  /** Selling price in minor units, for `formatPrice`. */
  price: number;
  /**
   * What the device costs new, in minor units. The saving is derived from
   * the pair rather than stored, so a discount can never disagree with the
   * two numbers printed beside it.
   */
  originalPrice: number;
  /** Units still unclaimed — the scarcity bar reads `total - left`. */
  unitsLeft: number;
  /**
   * Units claimed in the last 24 hours. This is the only number in the
   * panel that conveys *rate* rather than level, and rate is what makes a
   * drop feel like it is happening to you — "5 left" is a fact, "5 went
   * yesterday" is a deadline. It must come from real order data: a
   * velocity figure that is not true is a dark pattern, not a design.
   */
  claimedRecently: number;
  image: { url: string; alt: string };
}

export interface LiveDrop {
  id: string;
  slug: string;
  edition: string;
  title: string;
  /**
   * One currency for the whole drop. AED on `en-AE` — the company trades
   * out of Dubai, so the storefront prices in dirhams rather than
   * converting at the till. Note the amounts below are AED price points in
   * their own right, not rupee or dollar figures run through a rate: a
   * converted price reads as an afterthought and lands on numbers no
   * retailer would choose.
   *
   * `upcomingDrops` below still carries USD in its (unrendered) data —
   * align it when the catalogue is wired, so a single page can never print
   * two currencies.
   */
  currency: string;
  locale: string;
  /** ISO timestamp the drop closes — the hero countdown's target. */
  endsAt: string;
  devices: LiveDropDevice[];
}

/**
 * Drop 004 is the one selling; `upcomingDrops` below starts at 005 and
 * stays upcoming. The two lists are deliberately disjoint — a device
 * cannot be both live in the hero and awaiting release in Section 02.
 *
 * Transparent studio cutouts so the product floats on the canvas with no
 * plate behind it.
 */
const liveDrop: LiveDrop = {
  id: "drop-004",
  slug: "drop-004-halo-edit",
  edition: "Drop 004",
  title: "The Halo Edit",
  // Placeholder close date — replace with CMS data. Set to a clean 3
  // days out so the countdown (shared by the Hero panel and Scarcity —
  // both read this same field) reads as an exact "3 days" rather than
  // the odd, near-expired "1d 06h" a stale date drifts to. Held to
  // midday rather than the usual 18:00 so it still lands a full 6 hours
  // before Drop 005 opens on 14 August — moving it to 18:00 would tie
  // the two and break "the calendar reads in order".
  endsAt: "2026-08-14T12:00:00Z",
  currency: "AED",
  locale: "en-AE",
  devices: [
    {
      id: "l1",
      slug: "halo-phone-pro",
      name: "Halo Phone Pro",
      variant: "Graphite · 256GB",
      price: 1_999_00,
      originalPrice: 3_399_00,
      unitsTotal: 15,
      unitsLeft: 3,
      claimedRecently: 5,
      image: {
        url: "/images/hero/phone.png",
        alt: "Matte black phone leaning upright",
      },
    },
    {
      id: "l2",
      slug: "vector-book-13",
      name: "Vector Book 13",
      variant: "Silver · 512GB",
      price: 2_899_00,
      originalPrice: 4_899_00,
      unitsTotal: 12,
      unitsLeft: 5,
      claimedRecently: 3,
      image: {
        url: "/images/hero/laptop.png",
        alt: "Graphite laptop standing half open",
      },
    },
    {
      id: "l3",
      slug: "orbit-watch-s",
      name: "Orbit Watch S",
      variant: "Slate · 42mm",
      price: 549_00,
      originalPrice: 949_00,
      unitsTotal: 14,
      unitsLeft: 8,
      claimedRecently: 2,
      image: {
        url: "/images/hero/watch.png",
        alt: "Black smartwatch with leather strap",
      },
    },
    {
      id: "l4",
      slug: "echo-studio",
      name: "Echo Studio",
      variant: "Midnight · Over-ear",
      price: 399_00,
      originalPrice: 669_00,
      unitsTotal: 10,
      unitsLeft: 2,
      claimedRecently: 4,
      image: {
        url: "/images/hero/headphones.png",
        alt: "Black over-ear headphones suspended mid-air",
      },
    },
  ],
};

export function getLiveDrop(): LiveDrop {
  return liveDrop;
}

/* ============================================================
   Upcoming drops — featured releases
   ============================================================ */

/**
 * Where a release sits in its life. This drives the card's whole
 * treatment — label, price emphasis, and which action it offers — so a
 * shopper can read availability from across the grid without parsing
 * text. Four states, four different-looking cards, on purpose.
 */
export type DropStatus =
  | "available"
  | "coming-soon"
  | "almost-gone"
  | "sold-out";

export interface UpcomingDrop {
  id: string;
  slug: string;
  /** Editorial drop label, e.g. "Drop 005". */
  edition: string;
  name: string;
  /** Short descriptor under the name. */
  variant: string;
  /** Catalogue category, shown as the card's eyebrow. */
  category: string;
  status: DropStatus;
  /** Selling price in minor units. */
  price: number;
  /** What it costs new, in minor units — the saving is derived. */
  originalPrice: number;
  currency: string;
  locale: string;
  warranty: string;
  units: number;
  /** Units still unclaimed. Only meaningful once a drop is open. */
  unitsLeft: number;
  /** ISO timestamp the drop opens. */
  startsAt: string;
  image: { url: string; alt: string; width: number; height: number };
}

/**
 * The release calendar. All four states are represented on purpose — a
 * grid where every card looks the same teaches a shopper nothing, and
 * seeing one already closed is the cheapest possible proof that these
 * actually run out. AED throughout, matching the live drop.
 */
const upcomingDrops: UpcomingDrop[] = [
  {
    id: "u1",
    slug: "signal-phone-pro",
    edition: "Drop 005",
    name: "Signal Phone Pro",
    variant: "Graphite · 512GB",
    category: "Phones",
    status: "available",
    price: 2_299_00,
    originalPrice: 3_899_00,
    currency: "AED",
    locale: "en-AE",
    warranty: "1-year warranty",
    units: 25,
    unitsLeft: 19,
    startsAt: "2026-08-14T18:00:00Z",
    image: {
      url: "/images/drops/drop-01.jpg",
      alt: "Graphite Signal Phone Pro smartphone, studio lit",
      width: 1000,
      height: 1250,
    },
  },
  {
    id: "u2",
    slug: "meridian-book-14",
    edition: "Drop 006",
    name: "Meridian Book 14",
    variant: "Titanium · 1TB",
    category: "Laptops",
    status: "coming-soon",
    price: 3_499_00,
    originalPrice: 5_999_00,
    currency: "AED",
    locale: "en-AE",
    warranty: "1-year warranty",
    units: 18,
    unitsLeft: 18,
    startsAt: "2026-08-21T18:00:00Z",
    image: {
      url: "/images/drops/drop-02.jpg",
      alt: "Titanium Meridian Book 14 laptop, studio lit",
      width: 1000,
      height: 1250,
    },
  },
  {
    id: "u3",
    slug: "aria-studio-headphones",
    edition: "Drop 007",
    name: "Aria Studio",
    variant: "Midnight · Over-ear",
    category: "Audio",
    status: "almost-gone",
    price: 449_00,
    originalPrice: 749_00,
    currency: "AED",
    locale: "en-AE",
    warranty: "1-year warranty",
    units: 40,
    unitsLeft: 3,
    startsAt: "2026-08-28T18:00:00Z",
    image: {
      url: "/images/drops/drop-03.jpg",
      alt: "Midnight Aria Studio over-ear headphones, studio lit",
      width: 1000,
      height: 1250,
    },
  },
  {
    id: "u4",
    slug: "pulse-watch-s",
    edition: "Drop 008",
    name: "Pulse Watch S",
    variant: "Obsidian · 46mm",
    category: "Wearables",
    status: "sold-out",
    price: 649_00,
    originalPrice: 1_099_00,
    currency: "AED",
    locale: "en-AE",
    warranty: "1-year warranty",
    units: 60,
    unitsLeft: 0,
    startsAt: "2026-09-04T18:00:00Z",
    image: {
      url: "/images/drops/drop-04.jpg",
      alt: "Obsidian Pulse Watch S smartwatch, studio lit",
      width: 1000,
      height: 1250,
    },
  },
  {
    id: "u5",
    slug: "atlas-tab-11",
    edition: "Drop 009",
    name: "Atlas Tab 11",
    variant: "Slate · 256GB",
    category: "Tablets",
    // Second buyable card in the row — the calendar already shows
    // coming-soon, almost-gone and sold-out, and a fifth unbuyable
    // state would tip the shelf from "selling" to "waiting".
    status: "available",
    price: 1_499_00,
    originalPrice: 2_399_00,
    currency: "AED",
    locale: "en-AE",
    warranty: "1-year warranty",
    units: 30,
    unitsLeft: 12,
    startsAt: "2026-09-11T18:00:00Z",
    image: {
      url: "/images/categories/tablets.jpg",
      alt: "Slate Atlas Tab 11 tablet standing on a desk",
      width: 1000,
      height: 1250,
    },
  },
];

export function getUpcomingDrops(): UpcomingDrop[] {
  return upcomingDrops;
}

/* ============================================================
   Past drops — the archive of releases that sold out
   ============================================================ */

export interface PastDrop {
  id: string;
  /**
   * Route segment for the drop's own archive page (`/drops/${slug}`).
   * Matches the pattern the live/upcoming drops use, so the same
   * `/drops/[slug]` route can render both current and past products
   * when the archive route is built.
   */
  slug: string;
  edition: string;
  name: string;
  variant: string;
  /** What it sold for, in minor units. */
  price: number;
  originalPrice: number;
  currency: string;
  locale: string;
  /** Units in the release — the whole allocation went. */
  units: number;
  /** ISO date the drop closed. */
  soldOutAt: string;
  image: { url: string; alt: string; width: number; height: number };
}

/**
 * Proof of demand, not a shop shelf. Nothing here is buyable, which is
 * exactly the point: a shopper reads it as "these run out" rather than as
 * four more things to consider. Kept to the releases that actually
 * cleared their full allocation — an archive that included a slow drop
 * would argue the opposite case.
 */
const pastDrops: PastDrop[] = [
  {
    id: "p1",
    slug: "halo-phone-pro-drop-003",
    edition: "Drop 003",
    name: "Halo Phone Pro",
    variant: "Graphite · 256GB",
    price: 1_899_00,
    originalPrice: 3_299_00,
    currency: "AED",
    locale: "en-AE",
    units: 15,
    soldOutAt: "2026-07-31T18:00:00Z",
    image: {
      url: "/images/drops/drop-01.jpg",
      alt: "Graphite Halo Phone Pro smartphone, studio lit",
      width: 1000,
      height: 1250,
    },
  },
  {
    id: "p2",
    slug: "atlas-book-15-drop-003",
    edition: "Drop 003",
    name: "Atlas Book 15",
    variant: "Silver · 512GB",
    price: 2_699_00,
    originalPrice: 4_599_00,
    currency: "AED",
    locale: "en-AE",
    units: 12,
    soldOutAt: "2026-07-31T18:00:00Z",
    image: {
      url: "/images/drops/drop-02.jpg",
      alt: "Silver Atlas Book 15 laptop, studio lit",
      width: 1000,
      height: 1250,
    },
  },
  {
    id: "p3",
    slug: "nova-buds-pro-drop-002",
    edition: "Drop 002",
    name: "Nova Buds Pro",
    variant: "Ivory · In-ear",
    price: 249_00,
    originalPrice: 429_00,
    currency: "AED",
    locale: "en-AE",
    units: 20,
    soldOutAt: "2026-07-17T18:00:00Z",
    image: {
      url: "/images/drops/drop-03.jpg",
      alt: "Ivory Nova Buds Pro earphones, studio lit",
      width: 1000,
      height: 1250,
    },
  },
  {
    id: "p4",
    slug: "orbit-watch-classic-drop-002",
    edition: "Drop 002",
    name: "Orbit Watch Classic",
    variant: "Slate · 44mm",
    price: 499_00,
    originalPrice: 899_00,
    currency: "AED",
    locale: "en-AE",
    units: 14,
    soldOutAt: "2026-07-17T18:00:00Z",
    image: {
      url: "/images/drops/drop-04.jpg",
      alt: "Slate Orbit Watch Classic smartwatch, studio lit",
      width: 1000,
      height: 1250,
    },
  },
];

export function getPastDrops(): PastDrop[] {
  return pastDrops;
}
