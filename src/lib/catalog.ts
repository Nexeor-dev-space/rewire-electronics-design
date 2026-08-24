import type {
  Availability,
  ConditionGrade,
  InspectionCheck,
  Media,
  Product,
  ProductOption,
  Review,
  SpecGroup,
} from "@/types";
import { availabilityFromStock } from "@/types";

/**
 * Catalogue adapter — mock for now, Payload CMS later.
 *
 * The shop's single source of truth. Every storefront surface reads from
 * here: the listing grid, the product page, related products, the
 * wishlist, and the line items seeded into orders and returns. Swap the
 * bodies of the getters for CMS queries without touching a component.
 *
 * Three rules hold this file together:
 *
 * 1. **Nothing is stated twice.** Discounts, savings and availability are
 *    derived from price/stock at read time, so a badge can never disagree
 *    with the number printed beside it.
 * 2. **The specifics match the brand's own claims.** Inspection is
 *    68-point, minimum certified battery health is 98%, warranty is 12
 *    months — the same figures the homepage's Standard section commits to
 *    (`@/lib/standard`). A product page that quietly said 94% would make
 *    a liar of the homepage.
 * 3. **Products are written as seeds, expanded by one builder.** The
 *    parts that genuinely differ per device are hand-written; the
 *    scaffolding every certified device shares is generated. That is what
 *    keeps two dozen listings from drifting into two dozen voices.
 */

/* ============================================================
   Imagery
   ============================================================

   ⚠ Stand-in photography. The library holds four transparent studio
   cutouts and a handful of lifestyle plates, so devices of a kind share a
   gallery. Swap `deviceImagery` for per-product media when real shoots
   land — no other part of the app reads image paths.

   `fit` matters: cutouts float inside a padded stage (`contain`), plates
   fill it (`cover`). Order is deliberate — index 0 is the card image, so
   every kind leads with its cleanest shot. */

type DeviceKind = "phone" | "laptop" | "audio" | "tablet" | "watch" | "accessory";

const deviceImagery: Record<DeviceKind, Omit<Media, "id">[]> = {
  phone: [
    { url: "/images/hero/phone.png", alt: "Matte black phone leaning upright on a studio sweep", width: 849, height: 1900, fit: "contain" },
    { url: "/images/drops/drop-01.jpg", alt: "Graphite smartphone standing on a lit studio plinth", width: 1000, height: 1250, fit: "cover" },
    { url: "/images/dropdown/1.jpg", alt: "A hand holding the phone against dusk-lit mountains", width: 1500, height: 841, fit: "cover" },
    { url: "/images/craft/craft-01.jpg", alt: "Macro detail of the chassis edge and finish", width: 1000, height: 1333, fit: "cover" },
  ],
  laptop: [
    { url: "/images/hero/laptop.png", alt: "Graphite laptop standing half open", width: 1600, height: 1200, fit: "contain" },
    { url: "/images/drops/drop-02.jpg", alt: "Titanium laptop open on a lit studio surface", width: 1000, height: 1250, fit: "cover" },
    { url: "/images/dropdown/2.jpg", alt: "Silver laptop open on a pale desk beside a potted plant", width: 1500, height: 841, fit: "cover" },
    { url: "/images/craft/craft-03.jpg", alt: "Macro detail of the keyboard deck finish", width: 1000, height: 1333, fit: "cover" },
  ],
  audio: [
    { url: "/images/hero/headphones.png", alt: "Black over-ear headphones suspended mid-air", width: 1600, height: 1600, fit: "contain" },
    { url: "/images/drops/drop-03.jpg", alt: "Midnight over-ear headphones, studio lit", width: 1000, height: 1250, fit: "cover" },
    { url: "/images/dropdown/3.jpg", alt: "Tan leather over-ear headphones on a grey studio sweep", width: 1500, height: 857, fit: "cover" },
    { url: "/images/craft/craft-02.jpg", alt: "Macro detail of the earcup material", width: 1000, height: 1333, fit: "cover" },
  ],
  watch: [
    { url: "/images/hero/watch.png", alt: "Black smartwatch with leather strap", width: 1200, height: 1600, fit: "contain" },
    { url: "/images/drops/drop-04.jpg", alt: "Obsidian smartwatch on a lit studio surface", width: 1000, height: 1250, fit: "cover" },
    { url: "/images/dropdown/5.jpg", alt: "Smartwatch standing on a wooden plinth against dark foliage", width: 2000, height: 1333, fit: "cover" },
    { url: "/images/craft/craft-01.jpg", alt: "Macro detail of the case and crown", width: 1000, height: 1333, fit: "cover" },
  ],
  tablet: [
    { url: "/images/categories/tablets.jpg", alt: "Matte black tablet leaning upright on a warm ivory surface", width: 1000, height: 1250, fit: "cover" },
    { url: "/images/dropdown/4.jpg", alt: "Black tablet propped on its folio cover on a white desk", width: 1500, height: 818, fit: "cover" },
    { url: "/images/craft/craft-03.jpg", alt: "Macro detail of the rear finish", width: 1000, height: 1333, fit: "cover" },
  ],
  accessory: [
    { url: "/images/craft/craft-02.jpg", alt: "Macro of a dark leather-textured accessory surface", width: 1000, height: 1333, fit: "cover" },
    { url: "/images/dropdown/6.jpg", alt: "White twin wall socket with a plug seated in one outlet", width: 4500, height: 4000, fit: "cover" },
    { url: "/images/craft/craft-01.jpg", alt: "Macro detail of the braided cable weave", width: 1000, height: 1333, fit: "cover" },
  ],
};

/* ============================================================
   Shared content — what every certified device gets
   ============================================================ */

const WARRANTY = "12-month Rewire warranty, from the day it arrives.";

/** Mirrors the five-stage programme in `@/lib/certification`. */
function inspectionFor(seed: Seed): InspectionCheck[] {
  const checks: InspectionCheck[] = [
    { label: "Chassis & finish", result: gradeFinishResult(seed.condition), passed: true },
    { label: "Display", result: "No dead pixels, no discolouration", passed: true },
    { label: "Logic board", result: "Diagnostics passed, no liquid indicators", passed: true },
  ];

  if (seed.batteryHealth !== undefined) {
    checks.push({
      label: "Battery",
      result:
        seed.batteryHealth >= 100
          ? "Cell replaced — 100% of new capacity"
          : `${seed.batteryHealth}% of original capacity`,
      passed: true,
    });
  }

  checks.push(
    { label: "Cameras & sensors", result: "All modes and sensors verified", passed: true },
    { label: "Ports & buttons", result: "Every port, switch and button tested", passed: true },
    { label: "Wireless", result: "Cellular, Wi-Fi and Bluetooth confirmed", passed: true },
    { label: "Data", result: "Wiped to factory state, certified clear", passed: true },
  );

  return checks;
}

function gradeFinishResult(condition: ConditionGrade) {
  return {
    pristine: "Indistinguishable from new under studio light",
    excellent: "Light marks visible only at an angle",
    good: "Visible wear, structurally flawless",
  }[condition];
}

function includedFor(kind: DeviceKind): string[] {
  const base = ["Rewire certification card", "Braided USB-C charge cable", "Recycled protective packaging"];
  return {
    phone: ["Device", ...base, "SIM tool"],
    laptop: ["Device", ...base, "Power adapter"],
    audio: ["Headphones", ...base, "Carry case"],
    tablet: ["Device", ...base],
    watch: ["Watch", ...base, "Strap in your chosen size"],
    accessory: ["Accessory", ...base],
  }[kind];
}

/**
 * Reviews are drawn from a fixed pool by a stable hash of the slug, so
 * the same product always shows the same reviews. Nothing here may use
 * `Math.random()` — a server render that disagrees with the client one
 * is a hydration error, not a variation.
 */
const reviewPool: Omit<Review, "id">[] = [
  { author: "Layla H.", rating: 5, title: "Genuinely indistinguishable from new", body: "I have handled the new one in a store and I could not tell you which is which. The inspection report in the box is a nice touch — it lists what was actually checked.", postedAt: "2026-07-28", verified: true },
  { author: "Omar S.", rating: 5, title: "Battery is the real story", body: "Bought refurbished twice before and the battery was always the compromise. This one holds a full day with room to spare.", postedAt: "2026-07-14", verified: true },
  { author: "Priya N.", rating: 4, title: "Two small marks, exactly as graded", body: "The listing said light marks visible at an angle, and that is precisely what arrived. No surprises, which is all I wanted.", postedAt: "2026-06-30", verified: true },
  { author: "Daniel K.", rating: 5, title: "Packaging alone made the case", body: "Arrived in two days, wrapped better than most new hardware. Warranty card and a returns label already in the box.", postedAt: "2026-06-19", verified: true },
  { author: "Aisha R.", rating: 4, title: "Would buy again", body: "Straightforward, fairly priced, and the condition grade meant something. Docked one star only because I wanted the larger capacity and it had gone.", postedAt: "2026-05-31", verified: false },
  { author: "Marcus T.", rating: 5, title: "The grading scale is honest", body: "Grade A really is Grade A here. I have been burned by marketplace listings and this was the opposite experience.", postedAt: "2026-05-12", verified: true },
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) % 997;
  return h;
}

function reviewsFor(seed: Seed): Review[] {
  const start = hash(seed.slug) % reviewPool.length;
  const count = 2 + (hash(seed.slug) % 2);
  return Array.from({ length: count }, (_, i) => {
    const entry = reviewPool[(start + i) % reviewPool.length];
    return { ...entry, id: `${seed.slug}-review-${i + 1}` };
  });
}

/* ============================================================
   Seeds — the part that genuinely differs per device
   ============================================================ */

interface Seed {
  slug: string;
  name: string;
  brand: string;
  category: string;
  categorySlug: string;
  kind: DeviceKind;
  /** Finish name shown before the capacity, e.g. "Space Black". */
  finish: string;
  /** Capacity or size, e.g. "256GB" or "45mm". Omit for accessories. */
  capacity?: string;
  condition: ConditionGrade;
  /** Percentage of original capacity. Omit for devices without a cell. */
  batteryHealth?: number;
  price: number;
  originalPrice: number;
  stock: number;
  rating: number;
  reviewCount: number;
  listedAt: string;
  availability?: Availability;
  /** Capacity choices. `delta` is the price difference in minor units. */
  storages?: { label: string; delta: number; available?: boolean }[];
  colors?: { label: string; swatch: string; available?: boolean }[];
  description: string;
  highlights: string[];
  /** The rows that differ per device. Shared rows are appended. */
  specs: { label: string; value: string }[];
}

/** AED throughout, matching the drops — the company trades out of Dubai. */
const CURRENCY = "AED";
const LOCALE = "en-AE";

const seeds: Seed[] = [
  /* ---------- Phones ---------- */
  {
    slug: "iphone-14-pro", name: "iPhone 14 Pro", brand: "Apple", category: "Phones", categorySlug: "phones",
    kind: "phone", finish: "Space Black", capacity: "256GB", condition: "pristine", batteryHealth: 100,
    price: 2_499_00, originalPrice: 4_299_00, stock: 12, rating: 4.8, reviewCount: 214, listedAt: "2026-08-11",
    storages: [{ label: "128GB", delta: -300_00 }, { label: "256GB", delta: 0 }, { label: "512GB", delta: 450_00 }, { label: "1TB", delta: 900_00, available: false }],
    colors: [{ label: "Space Black", swatch: "#2b2b2e" }, { label: "Silver", swatch: "#dcdcd8" }, { label: "Deep Purple", swatch: "#4b4459" }, { label: "Gold", swatch: "#c6ab7d", available: false }],
    description:
      "The generation that introduced the always-on display and the 48-megapixel main camera, one cycle back from current and priced accordingly. This unit came in as a trade-in at 94% capacity; the cell was replaced rather than passed on, so it leaves us at 100% of new.",
    highlights: ["New battery cell — 100% capacity", "48MP main camera, ProRAW", "Always-on ProMotion display", "Face ID and all sensors verified"],
    specs: [
      { label: "Display", value: "6.1-inch Super Retina XDR, ProMotion 120Hz" },
      { label: "Chip", value: "A16 Bionic" },
      { label: "Main camera", value: "48MP ƒ/1.78, sensor-shift OIS" },
      { label: "Front camera", value: "12MP TrueDepth, autofocus" },
      { label: "Water resistance", value: "IP68, 6m for 30 minutes" },
      { label: "Weight", value: "206 g" },
    ],
  },
  {
    slug: "iphone-13", name: "iPhone 13", brand: "Apple", category: "Phones", categorySlug: "phones",
    kind: "phone", finish: "Midnight", capacity: "128GB", condition: "excellent", batteryHealth: 99,
    price: 1_449_00, originalPrice: 2_699_00, stock: 18, rating: 4.7, reviewCount: 389, listedAt: "2026-08-04",
    storages: [{ label: "128GB", delta: 0 }, { label: "256GB", delta: 320_00 }, { label: "512GB", delta: 700_00, available: false }],
    colors: [{ label: "Midnight", swatch: "#20242c" }, { label: "Starlight", swatch: "#e8e0d5" }, { label: "Blue", swatch: "#3c6a92" }, { label: "Pink", swatch: "#e5c4c2" }],
    description:
      "Still the most sensible phone we sell. Four years of software support ahead of it, a camera system that holds up against anything mid-range today, and a price that has finally come down to meet it.",
    highlights: ["99% certified battery health", "Dual 12MP camera system", "Ceramic Shield front", "Grade B — light marks at an angle"],
    specs: [
      { label: "Display", value: "6.1-inch Super Retina XDR" },
      { label: "Chip", value: "A15 Bionic" },
      { label: "Main camera", value: "12MP ƒ/1.6, sensor-shift OIS" },
      { label: "Front camera", value: "12MP TrueDepth" },
      { label: "Water resistance", value: "IP68, 6m for 30 minutes" },
      { label: "Weight", value: "174 g" },
    ],
  },
  {
    slug: "galaxy-s23-ultra", name: "Galaxy S23 Ultra", brand: "Samsung", category: "Phones", categorySlug: "phones",
    kind: "phone", finish: "Phantom Black", capacity: "512GB", condition: "pristine", batteryHealth: 100,
    price: 2_899_00, originalPrice: 4_999_00, stock: 7, rating: 4.9, reviewCount: 156, listedAt: "2026-08-08",
    storages: [{ label: "256GB", delta: -350_00 }, { label: "512GB", delta: 0 }, { label: "1TB", delta: 800_00 }],
    colors: [{ label: "Phantom Black", swatch: "#1c1c1e" }, { label: "Cream", swatch: "#e3d9c9" }, { label: "Green", swatch: "#3f4a3c" }, { label: "Lavender", swatch: "#b9adc9" }],
    description:
      "The 200-megapixel sensor and the built-in S Pen are the reasons this one still commands attention. Ours arrived in a sealed enterprise return, unmarked, with a replacement cell fitted as a matter of course.",
    highlights: ["New battery cell — 100% capacity", "200MP main sensor", "Built-in S Pen, latency under 3ms", "Grade A — pristine"],
    specs: [
      { label: "Display", value: "6.8-inch Dynamic AMOLED 2X, 120Hz" },
      { label: "Chip", value: "Snapdragon 8 Gen 2 for Galaxy" },
      { label: "Main camera", value: "200MP ƒ/1.7, OIS" },
      { label: "Zoom", value: "10× optical, 100× Space Zoom" },
      { label: "Water resistance", value: "IP68" },
      { label: "Weight", value: "234 g" },
    ],
  },
  {
    slug: "pixel-7-pro", name: "Pixel 7 Pro", brand: "Google", category: "Phones", categorySlug: "phones",
    kind: "phone", finish: "Obsidian", capacity: "128GB", condition: "excellent", batteryHealth: 98,
    price: 1_299_00, originalPrice: 2_899_00, stock: 3, rating: 4.6, reviewCount: 97, listedAt: "2026-07-29",
    storages: [{ label: "128GB", delta: 0 }, { label: "256GB", delta: 280_00 }, { label: "512GB", delta: 620_00, available: false }],
    colors: [{ label: "Obsidian", swatch: "#1f2023" }, { label: "Snow", swatch: "#eceae5" }, { label: "Hazel", swatch: "#8a8168" }],
    description:
      "The computational photography argument, at under half of what it launched at. Seven years of guaranteed updates from release means this is a phone you can still be using in 2029 without apology.",
    highlights: ["98% certified battery health", "50MP main, 5× telephoto", "Tensor G2 on-device processing", "Grade B — light marks at an angle"],
    specs: [
      { label: "Display", value: "6.7-inch LTPO OLED, 120Hz" },
      { label: "Chip", value: "Google Tensor G2" },
      { label: "Main camera", value: "50MP ƒ/1.85, OIS" },
      { label: "Zoom", value: "5× optical telephoto" },
      { label: "Water resistance", value: "IP68" },
      { label: "Weight", value: "212 g" },
    ],
  },
  {
    slug: "iphone-15-pro-max", name: "iPhone 15 Pro Max", brand: "Apple", category: "Phones", categorySlug: "phones",
    kind: "phone", finish: "Natural Titanium", capacity: "512GB", condition: "pristine", batteryHealth: 100,
    price: 3_699_00, originalPrice: 5_699_00, stock: 2, rating: 4.9, reviewCount: 64, listedAt: "2026-08-15",
    storages: [{ label: "256GB", delta: -400_00 }, { label: "512GB", delta: 0 }, { label: "1TB", delta: 750_00, available: false }],
    colors: [{ label: "Natural Titanium", swatch: "#9b968e" }, { label: "Black Titanium", swatch: "#3a3a3c" }, { label: "White Titanium", swatch: "#e5e3de" }, { label: "Blue Titanium", swatch: "#4e5c68" }],
    description:
      "The newest device we certify, and the only titanium-chassis phone in the current catalogue. Two units in this finish; when they go, the listing closes until the next intake.",
    highlights: ["New battery cell — 100% capacity", "5× tetraprism telephoto", "Titanium chassis, USB-C", "Grade A — pristine"],
    specs: [
      { label: "Display", value: "6.7-inch Super Retina XDR, ProMotion" },
      { label: "Chip", value: "A17 Pro" },
      { label: "Main camera", value: "48MP ƒ/1.78, second-generation sensor-shift" },
      { label: "Zoom", value: "5× tetraprism telephoto" },
      { label: "Port", value: "USB-C, USB 3 speeds" },
      { label: "Weight", value: "221 g" },
    ],
  },
  {
    slug: "galaxy-s22", name: "Galaxy S22", brand: "Samsung", category: "Phones", categorySlug: "phones",
    kind: "phone", finish: "Green", capacity: "128GB", condition: "good", batteryHealth: 98,
    price: 999_00, originalPrice: 2_299_00, stock: 0, rating: 4.4, reviewCount: 122, listedAt: "2026-07-02",
    storages: [{ label: "128GB", delta: 0 }, { label: "256GB", delta: 250_00, available: false }],
    colors: [{ label: "Green", swatch: "#4a5a48" }, { label: "Phantom White", swatch: "#e9e7e2" }],
    description:
      "The compact flagship, in the finish that has always sold first. This allocation has gone; join the waitlist and you will hear the morning the next intake is graded.",
    highlights: ["98% certified battery health", "Compact 6.1-inch flagship", "Grade C — visible wear, structurally flawless", "Priced to reflect the marks"],
    specs: [
      { label: "Display", value: "6.1-inch Dynamic AMOLED 2X, 120Hz" },
      { label: "Chip", value: "Snapdragon 8 Gen 1" },
      { label: "Main camera", value: "50MP ƒ/1.8, OIS" },
      { label: "Water resistance", value: "IP68" },
      { label: "Weight", value: "168 g" },
    ],
  },

  /* ---------- Laptops ---------- */
  {
    slug: "macbook-air-13-m2", name: "MacBook Air 13 M2", brand: "Apple", category: "Laptops", categorySlug: "laptops",
    kind: "laptop", finish: "Midnight", capacity: "256GB", condition: "pristine", batteryHealth: 100,
    price: 2_799_00, originalPrice: 4_599_00, stock: 9, rating: 4.9, reviewCount: 178, listedAt: "2026-08-09",
    storages: [{ label: "256GB", delta: 0 }, { label: "512GB", delta: 550_00 }, { label: "1TB", delta: 1_150_00, available: false }],
    colors: [{ label: "Midnight", swatch: "#2e3641" }, { label: "Starlight", swatch: "#e6ddd0" }, { label: "Space Grey", swatch: "#7a7c80" }, { label: "Silver", swatch: "#dedfe1" }],
    description:
      "Fanless, silent, and still the machine we recommend to most people who ask. The Midnight finish shows fingerprints and almost nothing else, which is why so many of them come back to us looking untouched.",
    highlights: ["New battery cell — 100% capacity", "18-hour rated battery life", "Liquid Retina, 500 nits", "Grade A — pristine"],
    specs: [
      { label: "Display", value: "13.6-inch Liquid Retina, 500 nits" },
      { label: "Chip", value: "Apple M2, 8-core CPU, 8-core GPU" },
      { label: "Memory", value: "8GB unified" },
      { label: "Ports", value: "2× Thunderbolt, MagSafe 3, 3.5mm" },
      { label: "Battery", value: "Up to 18 hours video playback" },
      { label: "Weight", value: "1.24 kg" },
    ],
  },
  {
    slug: "macbook-pro-14-m1-pro", name: "MacBook Pro 14 M1 Pro", brand: "Apple", category: "Laptops", categorySlug: "laptops",
    kind: "laptop", finish: "Space Grey", capacity: "512GB", condition: "excellent", batteryHealth: 99,
    price: 3_899_00, originalPrice: 7_499_00, stock: 5, rating: 4.8, reviewCount: 141, listedAt: "2026-08-02",
    storages: [{ label: "512GB", delta: 0 }, { label: "1TB", delta: 900_00 }, { label: "2TB", delta: 1_900_00, available: false }],
    colors: [{ label: "Space Grey", swatch: "#6f7175" }, { label: "Silver", swatch: "#dedfe1" }],
    description:
      "The machine that brought back the ports. Three Thunderbolt, HDMI, SD and MagSafe, a 120Hz mini-LED panel, and enough sustained performance that the fans stay off through most of a working day.",
    highlights: ["99% certified battery health", "120Hz mini-LED XDR display", "HDMI, SDXC and MagSafe restored", "Grade B — light marks at an angle"],
    specs: [
      { label: "Display", value: "14.2-inch Liquid Retina XDR, ProMotion" },
      { label: "Chip", value: "Apple M1 Pro, 10-core CPU, 16-core GPU" },
      { label: "Memory", value: "16GB unified" },
      { label: "Ports", value: "3× Thunderbolt 4, HDMI, SDXC, MagSafe 3" },
      { label: "Battery", value: "Up to 17 hours video playback" },
      { label: "Weight", value: "1.6 kg" },
    ],
  },
  {
    slug: "xps-13-plus", name: "XPS 13 Plus", brand: "Dell", category: "Laptops", categorySlug: "laptops",
    kind: "laptop", finish: "Platinum", capacity: "512GB", condition: "excellent", batteryHealth: 98,
    price: 2_199_00, originalPrice: 4_199_00, stock: 6, rating: 4.5, reviewCount: 73, listedAt: "2026-07-25",
    storages: [{ label: "256GB", delta: -300_00 }, { label: "512GB", delta: 0 }, { label: "1TB", delta: 600_00 }],
    colors: [{ label: "Platinum", swatch: "#cfd0d2" }, { label: "Graphite", swatch: "#3c3d40" }],
    description:
      "The most uncompromising thin Windows laptop of its generation — edge-to-edge keyboard, invisible trackpad, machined chassis. Divisive by design, and unmatched if the design happens to suit you.",
    highlights: ["98% certified battery health", "OLED 3.5K touch display", "Machined aluminium chassis", "Grade B — light marks at an angle"],
    specs: [
      { label: "Display", value: "13.4-inch OLED 3.5K touch" },
      { label: "Chip", value: "Intel Core i7-1360P" },
      { label: "Memory", value: "16GB LPDDR5" },
      { label: "Ports", value: "2× Thunderbolt 4" },
      { label: "Battery", value: "Up to 12 hours mixed use" },
      { label: "Weight", value: "1.26 kg" },
    ],
  },
  {
    slug: "surface-laptop-5", name: "Surface Laptop 5", brand: "Microsoft", category: "Laptops", categorySlug: "laptops",
    kind: "laptop", finish: "Sage", capacity: "256GB", condition: "excellent", batteryHealth: 98,
    price: 1_899_00, originalPrice: 3_699_00, stock: 4, rating: 4.4, reviewCount: 58, listedAt: "2026-07-18",
    storages: [{ label: "256GB", delta: 0 }, { label: "512GB", delta: 480_00 }],
    colors: [{ label: "Sage", swatch: "#8f9a89" }, { label: "Platinum", swatch: "#d5d6d8" }, { label: "Matte Black", swatch: "#2a2a2c" }],
    description:
      "A 3:2 display, a keyboard most reviewers still rate as the best in Windows, and a chassis that has barely changed in five years because it did not need to.",
    highlights: ["98% certified battery health", "3:2 PixelSense touch display", "Best-in-class keyboard travel", "Grade B — light marks at an angle"],
    specs: [
      { label: "Display", value: "13.5-inch PixelSense, 2256 × 1504, touch" },
      { label: "Chip", value: "Intel Core i5-1235U" },
      { label: "Memory", value: "8GB LPDDR5x" },
      { label: "Ports", value: "Thunderbolt 4, USB-A, Surface Connect" },
      { label: "Battery", value: "Up to 18 hours typical use" },
      { label: "Weight", value: "1.27 kg" },
    ],
  },
  {
    slug: "macbook-pro-16-m2-max", name: "MacBook Pro 16 M2 Max", brand: "Apple", category: "Laptops", categorySlug: "laptops",
    kind: "laptop", finish: "Space Grey", capacity: "1TB", condition: "pristine", batteryHealth: 100,
    price: 6_499_00, originalPrice: 11_999_00, stock: 0, rating: 5, reviewCount: 22, listedAt: "2026-08-17",
    availability: "coming-soon",
    storages: [{ label: "1TB", delta: 0 }, { label: "2TB", delta: 1_800_00, available: false }],
    colors: [{ label: "Space Grey", swatch: "#6f7175" }, { label: "Silver", swatch: "#dedfe1" }],
    description:
      "Twelve units are in inspection now and will be released with Drop 006. Join the waitlist and you will get the release window before the listing opens publicly.",
    highlights: ["Releasing with Drop 006", "38-core GPU, 32GB unified memory", "Full inspection under way", "Waitlist opens the drop early"],
    specs: [
      { label: "Display", value: "16.2-inch Liquid Retina XDR, ProMotion" },
      { label: "Chip", value: "Apple M2 Max, 12-core CPU, 38-core GPU" },
      { label: "Memory", value: "32GB unified" },
      { label: "Ports", value: "3× Thunderbolt 4, HDMI, SDXC, MagSafe 3" },
      { label: "Battery", value: "Up to 22 hours video playback" },
      { label: "Weight", value: "2.15 kg" },
    ],
  },

  /* ---------- Audio ---------- */
  {
    slug: "airpods-pro-2", name: "AirPods Pro (2nd gen)", brand: "Apple", category: "Audio", categorySlug: "audio",
    kind: "audio", finish: "White", condition: "pristine", batteryHealth: 100,
    price: 549_00, originalPrice: 999_00, stock: 22, rating: 4.8, reviewCount: 302, listedAt: "2026-08-12",
    colors: [{ label: "White", swatch: "#f2f2f0" }],
    description:
      "New silicone tips fitted as standard, and both the buds and the case tested through a full charge cycle. Adaptive Transparency remains the feature nobody expects to care about and then cannot live without.",
    highlights: ["New tips and 100% cell capacity", "Adaptive Transparency", "Precision Finding case", "Grade A — pristine"],
    specs: [
      { label: "Chip", value: "Apple H2" },
      { label: "Noise control", value: "Active Noise Cancellation, Adaptive Transparency" },
      { label: "Battery", value: "6 hours per charge, 30 hours with case" },
      { label: "Case", value: "MagSafe, Precision Finding, lanyard loop" },
      { label: "Water resistance", value: "IPX4, buds and case" },
    ],
  },
  {
    slug: "wh-1000xm4", name: "WH-1000XM4", brand: "Sony", category: "Audio", categorySlug: "audio",
    kind: "audio", finish: "Midnight Blue", condition: "excellent", batteryHealth: 99,
    price: 649_00, originalPrice: 1_399_00, stock: 11, rating: 4.7, reviewCount: 244, listedAt: "2026-08-05",
    colors: [{ label: "Midnight Blue", swatch: "#2b3murk" }, { label: "Black", swatch: "#232325" }, { label: "Silver", swatch: "#d8d6d2" }],
    description:
      "Still the noise cancelling benchmark most reviewers measure against, and the last generation with the multipoint implementation people actually preferred. Fresh earpads fitted before certification.",
    highlights: ["99% certified battery health", "New earpads fitted", "30-hour battery with ANC", "Grade B — light marks at an angle"],
    specs: [
      { label: "Driver", value: "40mm, liquid crystal polymer" },
      { label: "Noise control", value: "Dual Noise Sensor, QN1 processor" },
      { label: "Battery", value: "30 hours with ANC, 10-minute quick charge" },
      { label: "Codecs", value: "LDAC, AAC, SBC" },
      { label: "Weight", value: "254 g" },
    ],
  },
  {
    slug: "quietcomfort-45", name: "QuietComfort 45", brand: "Bose", category: "Audio", categorySlug: "audio",
    kind: "audio", finish: "Triple Black", condition: "excellent", batteryHealth: 98,
    price: 499_00, originalPrice: 1_199_00, stock: 8, rating: 4.6, reviewCount: 131, listedAt: "2026-07-22",
    colors: [{ label: "Triple Black", swatch: "#1e1e20" }, { label: "White Smoke", swatch: "#e8e6e1" }],
    description:
      "The comfort argument. Twenty-four hours of battery and a clamping force so light that most people forget they have them on — which is the entire point of the product line.",
    highlights: ["98% certified battery health", "24-hour battery", "The lightest clamp in the category", "Grade B — light marks at an angle"],
    specs: [
      { label: "Driver", value: "TriPort acoustic architecture" },
      { label: "Noise control", value: "Quiet and Aware modes" },
      { label: "Battery", value: "24 hours, 15-minute quick charge" },
      { label: "Codecs", value: "AAC, SBC" },
      { label: "Weight", value: "240 g" },
    ],
  },
  {
    slug: "airpods-max", name: "AirPods Max", brand: "Apple", category: "Audio", categorySlug: "audio",
    kind: "audio", finish: "Space Grey", condition: "pristine", batteryHealth: 100,
    price: 1_249_00, originalPrice: 2_299_00, stock: 3, rating: 4.7, reviewCount: 88, listedAt: "2026-08-13",
    colors: [{ label: "Space Grey", swatch: "#6d6f73" }, { label: "Silver", swatch: "#dcdcda" }, { label: "Sky Blue", swatch: "#a8bccd" }, { label: "Green", swatch: "#4f6357", available: false }],
    description:
      "Stainless steel, anodised aluminium and a mesh canopy — the only headphones in the catalogue where the materials alone justify the shelf they sit on. New ear cushions fitted before release.",
    highlights: ["New cushions and 100% cell capacity", "Computational audio, spatial with head tracking", "Machined aluminium earcups", "Grade A — pristine"],
    specs: [
      { label: "Driver", value: "40mm dynamic, dual neodymium ring magnet" },
      { label: "Chip", value: "Apple H1 in each cup" },
      { label: "Battery", value: "20 hours with ANC and spatial audio" },
      { label: "Materials", value: "Stainless steel frame, anodised aluminium cups" },
      { label: "Weight", value: "384 g" },
    ],
  },
  {
    slug: "momentum-4", name: "Momentum 4", brand: "Sennheiser", category: "Audio", categorySlug: "audio",
    kind: "audio", finish: "Graphite", condition: "excellent", batteryHealth: 99,
    price: 579_00, originalPrice: 1_299_00, stock: 6, rating: 4.6, reviewCount: 64, listedAt: "2026-07-16",
    colors: [{ label: "Graphite", swatch: "#3a3a3d" }, { label: "White", swatch: "#e9e7e3" }],
    description:
      "Sixty hours on a charge, which is not a typo, and the most neutral tuning of anything in this price bracket. The audiophile pick that happens also to be the practical one.",
    highlights: ["99% certified battery health", "60-hour battery", "Adaptive noise cancellation", "Grade B — light marks at an angle"],
    specs: [
      { label: "Driver", value: "42mm dynamic" },
      { label: "Noise control", value: "Adaptive hybrid ANC" },
      { label: "Battery", value: "60 hours with ANC" },
      { label: "Codecs", value: "aptX Adaptive, AAC, SBC" },
      { label: "Weight", value: "293 g" },
    ],
  },

  /* ---------- Tablets ---------- */
  {
    slug: "ipad-pro-11-m2", name: "iPad Pro 11 M2", brand: "Apple", category: "Tablets", categorySlug: "tablets",
    kind: "tablet", finish: "Space Grey", capacity: "256GB", condition: "pristine", batteryHealth: 100,
    price: 2_299_00, originalPrice: 3_999_00, stock: 8, rating: 4.8, reviewCount: 109, listedAt: "2026-08-07",
    storages: [{ label: "128GB", delta: -320_00 }, { label: "256GB", delta: 0 }, { label: "512GB", delta: 620_00 }, { label: "1TB", delta: 1_400_00, available: false }],
    colors: [{ label: "Space Grey", swatch: "#6d6f73" }, { label: "Silver", swatch: "#dedfe1" }],
    description:
      "The M2 chip in a tablet, which still sounds like a category error and still is not one. Pairs with the Magic Keyboard listed in Accessories, and the two together outsell either alone.",
    highlights: ["New battery cell — 100% capacity", "M2 chip, 120Hz ProMotion", "Apple Pencil hover support", "Grade A — pristine"],
    specs: [
      { label: "Display", value: "11-inch Liquid Retina, ProMotion 120Hz" },
      { label: "Chip", value: "Apple M2, 8-core CPU, 10-core GPU" },
      { label: "Camera", value: "12MP wide, 10MP ultra wide, LiDAR" },
      { label: "Port", value: "Thunderbolt / USB 4" },
      { label: "Weight", value: "466 g" },
    ],
  },
  {
    slug: "ipad-air", name: "iPad Air", brand: "Apple", category: "Tablets", categorySlug: "tablets",
    kind: "tablet", finish: "Blue", capacity: "64GB", condition: "excellent", batteryHealth: 99,
    price: 1_149_00, originalPrice: 2_299_00, stock: 14, rating: 4.7, reviewCount: 167, listedAt: "2026-07-31",
    storages: [{ label: "64GB", delta: 0 }, { label: "256GB", delta: 430_00 }],
    colors: [{ label: "Blue", swatch: "#6a8ba8" }, { label: "Starlight", swatch: "#e8e0d5" }, { label: "Purple", swatch: "#b0a5c6" }, { label: "Pink", swatch: "#e0b8b2" }],
    description:
      "The tablet most people should buy, in the colour most people do. M1 silicon means it will keep pace with iPadOS for years yet.",
    highlights: ["99% certified battery health", "M1 chip", "Touch ID in the top button", "Grade B — light marks at an angle"],
    specs: [
      { label: "Display", value: "10.9-inch Liquid Retina" },
      { label: "Chip", value: "Apple M1, 8-core CPU" },
      { label: "Camera", value: "12MP wide, 12MP Centre Stage front" },
      { label: "Port", value: "USB-C" },
      { label: "Weight", value: "461 g" },
    ],
  },
  {
    slug: "galaxy-tab-s8", name: "Galaxy Tab S8", brand: "Samsung", category: "Tablets", categorySlug: "tablets",
    kind: "tablet", finish: "Graphite", capacity: "128GB", condition: "excellent", batteryHealth: 98,
    price: 1_099_00, originalPrice: 2_599_00, stock: 0, rating: 4.5, reviewCount: 71, listedAt: "2026-07-09",
    storages: [{ label: "128GB", delta: 0 }, { label: "256GB", delta: 300_00, available: false }],
    colors: [{ label: "Graphite", swatch: "#3c3d40" }, { label: "Silver", swatch: "#d6d7d9" }, { label: "Pink Gold", swatch: "#d8b8a8" }],
    description:
      "Ships with the S Pen in the box, which no competitor at this price does. This allocation has gone — the next intake is graded monthly.",
    highlights: ["98% certified battery health", "S Pen included", "120Hz LCD", "Grade B — light marks at an angle"],
    specs: [
      { label: "Display", value: "11-inch LTPS LCD, 120Hz" },
      { label: "Chip", value: "Snapdragon 8 Gen 1" },
      { label: "Camera", value: "13MP wide, 6MP ultra wide" },
      { label: "Included", value: "S Pen, 2.8ms latency" },
      { label: "Weight", value: "503 g" },
    ],
  },

  /* ---------- Wearables ---------- */
  {
    slug: "apple-watch-series-8", name: "Apple Watch Series 8", brand: "Apple", category: "Wearables", categorySlug: "wearables",
    kind: "watch", finish: "Midnight", capacity: "45mm", condition: "excellent", batteryHealth: 99,
    price: 749_00, originalPrice: 1_599_00, stock: 16, rating: 4.7, reviewCount: 193, listedAt: "2026-08-06",
    storages: [{ label: "41mm", delta: -80_00 }, { label: "45mm", delta: 0 }],
    colors: [{ label: "Midnight", swatch: "#20242c" }, { label: "Starlight", swatch: "#e6ddd0" }, { label: "Silver", swatch: "#dcdcda" }, { label: "Product Red", swatch: "#a63131" }],
    description:
      "A new strap in your chosen size ships with every watch — we never pass on a worn band. Crash detection, temperature sensing and the full ECG suite, all verified before release.",
    highlights: ["99% certified battery health", "New strap included", "ECG and temperature sensing", "Grade B — light marks at an angle"],
    specs: [
      { label: "Case", value: "45mm aluminium, always-on Retina" },
      { label: "Sensors", value: "ECG, blood oxygen, temperature, crash detection" },
      { label: "Water resistance", value: "50m, WR50" },
      { label: "Battery", value: "18 hours, 36 in Low Power Mode" },
      { label: "Connectivity", value: "GPS, Wi-Fi, Bluetooth 5.3" },
    ],
  },
  {
    slug: "apple-watch-ultra", name: "Apple Watch Ultra", brand: "Apple", category: "Wearables", categorySlug: "wearables",
    kind: "watch", finish: "Titanium", capacity: "49mm", condition: "pristine", batteryHealth: 100,
    price: 1_899_00, originalPrice: 3_299_00, stock: 2, rating: 4.9, reviewCount: 57, listedAt: "2026-08-14",
    storages: [{ label: "49mm", delta: 0 }],
    colors: [{ label: "Titanium", swatch: "#9b968e" }],
    description:
      "Titanium case, 100m water resistance and a 36-hour battery that genuinely lasts two days of normal use. The only watch we sell that arrives with a replacement cell as standard.",
    highlights: ["New battery cell — 100% capacity", "Titanium case, 100m rated", "Dual-frequency GPS", "Grade A — pristine"],
    specs: [
      { label: "Case", value: "49mm titanium, 2000-nit always-on Retina" },
      { label: "Sensors", value: "Depth gauge, water temperature, ECG, blood oxygen" },
      { label: "Water resistance", value: "100m, EN13319 certified" },
      { label: "Battery", value: "36 hours, 60 in Low Power Mode" },
      { label: "Connectivity", value: "Dual-frequency GPS, cellular, Wi-Fi" },
    ],
  },
  {
    slug: "galaxy-watch-5-pro", name: "Galaxy Watch 5 Pro", brand: "Samsung", category: "Wearables", categorySlug: "wearables",
    kind: "watch", finish: "Black Titanium", capacity: "45mm", condition: "excellent", batteryHealth: 98,
    price: 649_00, originalPrice: 1_499_00, stock: 5, rating: 4.5, reviewCount: 62, listedAt: "2026-07-20",
    storages: [{ label: "45mm", delta: 0 }],
    colors: [{ label: "Black Titanium", swatch: "#2a2a2c" }, { label: "Grey Titanium", swatch: "#8b8b8d" }],
    description:
      "Sapphire crystal and a titanium case, at a third of what it cost new. The eighty-hour battery is the specification that survives contact with real use.",
    highlights: ["98% certified battery health", "New strap included", "Sapphire crystal, titanium case", "Grade B — light marks at an angle"],
    specs: [
      { label: "Case", value: "45mm titanium, sapphire crystal" },
      { label: "Sensors", value: "ECG, body composition, blood oxygen" },
      { label: "Water resistance", value: "5ATM + IP68, MIL-STD-810H" },
      { label: "Battery", value: "Up to 80 hours typical use" },
      { label: "Connectivity", value: "GPS, LTE, Wi-Fi, Bluetooth 5.2" },
    ],
  },

  /* ---------- Accessories ---------- */
  {
    slug: "magic-keyboard-ipad-pro", name: "Magic Keyboard for iPad Pro 11", brand: "Apple", category: "Accessories", categorySlug: "accessories",
    kind: "accessory", finish: "Black", condition: "excellent",
    price: 549_00, originalPrice: 1_299_00, stock: 7, rating: 4.4, reviewCount: 41, listedAt: "2026-07-27",
    colors: [{ label: "Black", swatch: "#232325" }, { label: "White", swatch: "#e9e7e3" }],
    description:
      "The floating cantilever hinge and the backlit keys, checked key by key before it ships. Pairs with the iPad Pro 11 listed above; the pair is the most common two-item order we take.",
    highlights: ["Every key tested individually", "Backlit, with a pass-through USB-C", "Trackpad calibration verified", "Grade B — light marks at an angle"],
    specs: [
      { label: "Compatibility", value: "iPad Pro 11-inch, iPad Air 10.9-inch" },
      { label: "Keys", value: "Backlit scissor mechanism, 1mm travel" },
      { label: "Trackpad", value: "Click-anywhere, multi-touch" },
      { label: "Charging", value: "USB-C pass-through" },
      { label: "Weight", value: "601 g" },
    ],
  },
  {
    slug: "96w-usb-c-adapter", name: "96W USB-C Power Adapter", brand: "Apple", category: "Accessories", categorySlug: "accessories",
    kind: "accessory", finish: "White", condition: "pristine",
    price: 179_00, originalPrice: 349_00, stock: 26, rating: 4.6, reviewCount: 88, listedAt: "2026-07-11",
    colors: [{ label: "White", swatch: "#f2f2f0" }],
    description:
      "Load-tested to full rated output before it goes anywhere. The one accessory we will not sell in anything below Grade A, because a power adapter with a mark on it is a power adapter nobody trusts.",
    highlights: ["Load-tested to full 96W output", "UAE three-pin plug fitted", "Grade A only — no exceptions", "12-month warranty, same as devices"],
    specs: [
      { label: "Output", value: "96W USB-C" },
      { label: "Compatibility", value: "MacBook Pro 16-inch and all USB-C PD devices" },
      { label: "Plug", value: "UAE three-pin, type G" },
      { label: "Safety", value: "Over-current and thermal protection verified" },
      { label: "Weight", value: "292 g" },
    ],
  },
];

/* ============================================================
   The builder — seed in, full Product out
   ============================================================ */

function toOptions(
  entries: { label: string; delta?: number; swatch?: string; available?: boolean }[] | undefined,
): ProductOption[] | undefined {
  return entries?.map((entry) => ({
    label: entry.label,
    value: entry.label.toLowerCase().replace(/\s+/g, "-"),
    available: entry.available !== false,
    priceDelta: entry.delta ?? 0,
    swatch: entry.swatch,
  }));
}

function specsFor(seed: Seed): SpecGroup[] {
  const groups: SpecGroup[] = [
    { title: "The device", rows: seed.specs },
    {
      title: "Condition & certification",
      rows: [
        { label: "Grade", value: CONDITION_SPEC[seed.condition] },
        ...(seed.batteryHealth !== undefined
          ? [{ label: "Battery health", value: `${seed.batteryHealth}% of original capacity` }]
          : []),
        { label: "Inspection", value: "68-point, passed" },
        { label: "Data", value: "Wiped to factory state, certified clear" },
        { label: "Warranty", value: "12 months, Rewire-backed" },
      ],
    },
  ];
  return groups;
}

const CONDITION_SPEC: Record<ConditionGrade, string> = {
  pristine: "A — Pristine. No visible marks under studio light.",
  excellent: "B — Excellent. Light marks visible only at an angle.",
  good: "C — Good. Visible wear, structurally flawless.",
};

function build(seed: Seed): Product {
  const gallery = deviceImagery[seed.kind];
  return {
    id: seed.slug,
    slug: seed.slug,
    name: seed.name,
    variant: seed.capacity ? `${seed.finish} · ${seed.capacity}` : seed.finish,
    brand: seed.brand,
    category: seed.category,
    categorySlug: seed.categorySlug,
    condition: seed.condition,
    price: seed.price,
    originalPrice: seed.originalPrice,
    currency: CURRENCY,
    locale: LOCALE,
    images: gallery.map((image, index) => ({
      ...image,
      id: `${seed.slug}-${index + 1}`,
      alt: `${seed.name} — ${image.alt}`,
    })),
    stock: seed.stock,
    soldOut: seed.stock <= 0 && seed.availability !== "coming-soon",
    availability: seed.availability ?? availabilityFromStock(seed.stock),
    batteryHealth: seed.batteryHealth,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    storageOptions: toOptions(seed.storages),
    colorOptions: toOptions(seed.colors),
    description: seed.description,
    highlights: seed.highlights,
    specs: specsFor(seed),
    inspection: inspectionFor(seed),
    included: includedFor(seed.kind),
    warranty: WARRANTY,
    reviews: reviewsFor(seed),
    listedAt: seed.listedAt,
  };
}

const products: Product[] = seeds.map(build);

/* ============================================================
   Getters
   ============================================================ */

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((product) => product.categorySlug === categorySlug);
}

/** Listings per category, so the nav's counts can never outrun the shelf. */
export function countByCategory(categorySlug: string): number {
  return getProductsByCategory(categorySlug).length;
}

/**
 * Related products — same category first, then the same brand elsewhere.
 * Sold-out listings are excluded: a related rail exists to offer an
 * alternative, and an alternative you cannot buy is not one.
 */
export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const pool = products.filter(
    (candidate) => candidate.slug !== product.slug && candidate.availability !== "sold-out",
  );
  const sameCategory = pool.filter((c) => c.categorySlug === product.categorySlug);
  const sameBrand = pool.filter(
    (c) => c.brand === product.brand && c.categorySlug !== product.categorySlug,
  );
  return [...sameCategory, ...sameBrand, ...pool].slice(0, limit);
}

/** Seeds the wishlist so the page is reviewable before anything is saved. */
export function getWishlistSeed(): string[] {
  return ["iphone-15-pro-max", "macbook-air-13-m2", "airpods-max", "galaxy-s22"];
}
