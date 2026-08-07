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
