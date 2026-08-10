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
   * One currency for the whole drop. `upcomingDrops` below still carries
   * USD in its (unrendered) data — align the two when the catalogue is
   * wired, so a single page can never print two currencies.
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
  // Placeholder close date — replace with CMS data. Lands before Drop 005
  // opens on 14 August so the calendar reads in order.
  endsAt: "2026-08-12T18:00:00Z",
  currency: "INR",
  locale: "en-IN",
  devices: [
    {
      id: "l1",
      name: "Halo Phone Pro",
      variant: "Graphite · 256GB",
      price: 44_999_00,
      originalPrice: 74_900_00,
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
      name: "Vector Book 13",
      variant: "Silver · 512GB",
      price: 64_999_00,
      originalPrice: 109_900_00,
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
      name: "Orbit Watch S",
      variant: "Slate · 42mm",
      price: 12_499_00,
      originalPrice: 21_900_00,
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
      name: "Echo Studio",
      variant: "Midnight · Over-ear",
      price: 8_999_00,
      originalPrice: 14_999_00,
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

export interface UpcomingDrop {
  id: string;
  slug: string;
  /** Editorial drop label, e.g. "Drop 005". */
  edition: string;
  name: string;
  /** Short descriptor under the name. */
  variant: string;
  /** Starting price in minor units (cents). */
  startingPrice: number;
  currency: string;
  batteryHealth: number;
  conditionGrade: string;
  warranty: string;
  units: number;
  /** ISO timestamp the drop opens. */
  startsAt: string;
  image: { url: string; alt: string; width: number; height: number };
}

const upcomingDrops: UpcomingDrop[] = [
  {
    id: "u1",
    slug: "signal-phone-pro",
    edition: "Drop 005",
    name: "Signal Phone Pro",
    variant: "Graphite · 512GB",
    startingPrice: 84_900,
    currency: "USD",
    batteryHealth: 98,
    conditionGrade: "Grade A · Pristine",
    warranty: "1-year warranty",
    units: 25,
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
    startingPrice: 149_900,
    currency: "USD",
    batteryHealth: 96,
    conditionGrade: "Grade A · Pristine",
    warranty: "1-year warranty",
    units: 18,
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
    startingPrice: 32_900,
    currency: "USD",
    batteryHealth: 97,
    conditionGrade: "Grade B · Excellent",
    warranty: "1-year warranty",
    units: 40,
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
    startingPrice: 24_900,
    currency: "USD",
    batteryHealth: 99,
    conditionGrade: "Grade A · Pristine",
    warranty: "1-year warranty",
    units: 60,
    startsAt: "2026-09-04T18:00:00Z",
    image: {
      url: "/images/drops/drop-04.jpg",
      alt: "Obsidian Pulse Watch S smartwatch, studio lit",
      width: 1000,
      height: 1250,
    },
  },
];

export function getUpcomingDrops(): UpcomingDrop[] {
  return upcomingDrops;
}
