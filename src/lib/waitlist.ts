/**
 * Waitlist catalogue adapter — the list of upcoming products a shopper
 * can register interest in, and their variants and launch info.
 *
 * Kept separate from `drops.ts` on purpose: the waitlist form is one
 * screen listing many devices, whereas the calendar there is a
 * chronological release list. Same underlying releases eventually, but
 * a shopper picking from a dropdown wants "Signal Phone Pro → Graphite
 * · 512GB" and "Signal Phone Pro → Obsidian · 1TB" as separate leaf
 * choices, not as two rows on the calendar that repeat the product name.
 *
 * Wire this to the CMS by swapping `products` for a query; the shape is
 * what the form reads and the helpers below are the only places the UI
 * touches the data.
 */

export interface DeviceImage {
  url: string;
  alt: string;
}

export interface WaitlistVariant {
  /** Stable across sessions; used as the `<option value>` for the variant select. */
  id: string;
  /** What the shopper sees, e.g. "Graphite · 512GB". */
  label: string;
  /**
   * Overrides the product shot when this colourway has its own
   * photography. Absent today — the prototype has one render per
   * product, and showing the graphite phone for the obsidian variant
   * would be a quiet lie. Add per-colour shots here and the preview
   * picks them up with no UI change.
   */
  image?: DeviceImage;
  /** ISO timestamp the variant's drop opens. */
  startsAt: string;
  /** Units allocated to this variant. */
  units: number;
}

export interface WaitlistProduct {
  id: string;
  name: string;
  /** Shown in the modal's preview panel as soon as the device is chosen. */
  image: DeviceImage;
  variants: WaitlistVariant[];
}

/**
 * Placeholder catalogue for the design prototype. Dates align with the
 * `upcomingDrops` calendar in `drops.ts` so the waitlist and the section
 * do not disagree on when a release opens. Variant IDs are unique per
 * product, which the modal relies on when it clears the variant select
 * on product change.
 */
const products: WaitlistProduct[] = [
  {
    id: "signal-phone-pro",
    name: "Signal Phone Pro",
    image: {
      url: "/images/hero/phone.png",
      alt: "Signal Phone Pro standing upright, matte black",
    },
    variants: [
      {
        id: "graphite-512",
        label: "Graphite · 512GB",
        startsAt: "2026-08-14T18:00:00Z",
        units: 25,
      },
      {
        id: "obsidian-1tb",
        label: "Obsidian · 1TB",
        startsAt: "2026-08-14T18:00:00Z",
        units: 15,
      },
    ],
  },
  {
    id: "meridian-book-14",
    name: "Meridian Book 14",
    image: {
      url: "/images/hero/laptop.png",
      alt: "Meridian Book 14 half open, seen from the side",
    },
    variants: [
      {
        id: "titanium-1tb",
        label: "Titanium · 1TB",
        startsAt: "2026-08-21T18:00:00Z",
        units: 18,
      },
      {
        id: "graphite-512",
        label: "Graphite · 512GB",
        startsAt: "2026-08-21T18:00:00Z",
        units: 22,
      },
    ],
  },
  {
    id: "aria-studio",
    name: "Aria Studio",
    image: {
      url: "/images/hero/headphones.png",
      alt: "Aria Studio over-ear headphones, suspended",
    },
    variants: [
      {
        id: "midnight-over",
        label: "Midnight · Over-ear",
        startsAt: "2026-08-28T18:00:00Z",
        units: 40,
      },
      {
        id: "ivory-over",
        label: "Ivory · Over-ear",
        startsAt: "2026-08-28T18:00:00Z",
        units: 25,
      },
    ],
  },
  {
    id: "pulse-watch-s",
    name: "Pulse Watch S",
    image: {
      url: "/images/hero/watch.png",
      alt: "Pulse Watch S with a leather strap",
    },
    variants: [
      {
        id: "obsidian-46",
        label: "Obsidian · 46mm",
        startsAt: "2026-09-04T18:00:00Z",
        units: 60,
      },
      {
        id: "silver-42",
        label: "Silver · 42mm",
        startsAt: "2026-09-04T18:00:00Z",
        units: 45,
      },
    ],
  },
];

export function getWaitlistProducts(): WaitlistProduct[] {
  return products;
}

/**
 * Resolves a product name + variant label (what a calendar card already
 * knows) to the `{productId, variantId}` pair `WaitlistModal` needs for
 * `preselect`.
 *
 * Matched on name/label rather than on slug: `drops.ts` and this file
 * are two independently maintained catalogues, and their slugs already
 * disagree in one place (the calendar's "aria-studio-headphones" vs this
 * file's "aria-studio"). Name and variant label are the fields a shopper
 * actually reads off the card, so they are the fields that have to
 * agree — and if a future entry drifts out of sync on those too, this
 * returns `undefined` and the modal falls back to its general form
 * rather than preselecting the wrong device.
 */
export function resolveWaitlistPreselect(
  productName: string,
  variantLabel: string,
): { productId: string; variantId: string } | undefined {
  const product = products.find((p) => p.name === productName);
  const variant = product?.variants.find((v) => v.label === variantLabel);
  if (!product || !variant) return undefined;
  return { productId: product.id, variantId: variant.id };
}

export function findWaitlistProduct(
  productId: string,
): WaitlistProduct | undefined {
  return products.find((p) => p.id === productId);
}

export function findWaitlistVariant(
  productId: string,
  variantId: string,
): WaitlistVariant | undefined {
  return findWaitlistProduct(productId)?.variants.find(
    (v) => v.id === variantId,
  );
}

/**
 * The shot to preview for a selection. Falls back from variant to
 * product, so a colourway without its own photography still shows the
 * device rather than an empty plate.
 */
export function getWaitlistImage(
  productId: string,
  variantId?: string,
): DeviceImage | undefined {
  const product = findWaitlistProduct(productId);
  if (!product) return undefined;
  if (!variantId) return product.image;
  return (
    product.variants.find((v) => v.id === variantId)?.image ?? product.image
  );
}
