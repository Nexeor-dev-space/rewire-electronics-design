/**
 * The Rewire Standard — content adapter. Mock for now, Payload CMS later:
 * swap the bodies of the getters for CMS queries without touching the UI.
 */

export interface StandardHotspot {
  id: string;
  label: string;
  /** Anchor point as a percentage of the product frame. */
  x: number;
  y: number;
  /** Which way the leader runs, so labels never cross the product. */
  side: "left" | "right";
}

export interface StandardStat {
  id: string;
  /** Counted up from zero when the figure arrives. */
  value: number;
  /** Full-size character after the numeral, e.g. "%". */
  suffix?: string;
  /** Reduced-size word after the numeral, e.g. "Months". */
  unit?: string;
  label: string;
  detail: string;
}

const hotspots: StandardHotspot[] = [
  { id: "inspection", label: "68-Point Inspection", x: 27, y: 19, side: "left" },
  { id: "battery", label: "98%+ Battery Health", x: 73, y: 41, side: "right" },
  { id: "grade", label: "Grade A Certified", x: 27, y: 63, side: "left" },
  { id: "warranty", label: "1-Year Warranty", x: 73, y: 84, side: "right" },
];

const stats: StandardStat[] = [
  {
    id: "inspection-points",
    value: 68,
    label: "Inspection Points",
    detail:
      "Chassis, display, logic board and every port, reviewed before anything else happens.",
  },
  {
    id: "battery-health",
    value: 98,
    suffix: "%",
    label: "Battery Health",
    detail:
      "The minimum capacity we will certify. Below it, the cell is replaced rather than passed on.",
  },
  {
    id: "warranty",
    value: 12,
    unit: "Months",
    label: "Warranty",
    detail:
      "Covered from the day it arrives, on every device we release. No registration required.",
  },
];

export function getStandardHotspots(): StandardHotspot[] {
  return hotspots;
}

export function getStandardStats(): StandardStat[] {
  return stats;
}
