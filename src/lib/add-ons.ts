/**
 * Add-ons — what else goes in the bag alongside the device.
 *
 * ⚠ PLACEHOLDER PRICING. Real figures come from the CMS; swap the body of
 * `addOnsFor()` for a query without touching the component.
 *
 * ── Why this is not a variant ───────────────────────────────────────
 *
 * Storage and colour change **which product you are buying** — one line
 * in the bag, one price. An add-on changes **what else is in the bag** —
 * more lines, each with its own price and its own fulfilment.
 *
 * That distinction has to survive into the UI, because a shopper who
 * mistakes a paid add-on for a variant believes they have configured a
 * device when they have actually added AED 249 to their order. So
 * add-ons are never rendered as pills or swatches beside Storage and
 * Colour; they get checkboxes, explicit prices, and a running total.
 *
 * Restraint is deliberate: at most four per product. A refurbished
 * flagship priced as an editorial object cannot carry a wall of upsells
 * without reading like a checkout funnel.
 */

export type AddOnKind = "protection" | "accessory" | "service";

export interface AddOn {
  id: string;
  label: string;
  /** One line. What it is, or what it saves you — never a sales pitch. */
  note: string;
  /** Minor units, same currency as the product it hangs off. */
  price: number;
  kind: AddOnKind;
  /**
   * Renders a quiet "Most chosen" tag. It does **not** pre-tick the box.
   *
   * Pre-selecting a paid add-on puts money in the bag that the shopper
   * never chose to put there, and relies on them not reading closely —
   * which is the definition of the pattern this codebase refuses to use
   * elsewhere (see the note on velocity figures in `lib/drops.ts`). Every
   * box here starts empty; the tag is allowed to inform the choice, not
   * to make it.
   */
  popular?: boolean;
}

/* ============================================================
   Catalogue
   ============================================================ */

/** Offered on everything we sell. */
const universal: AddOn[] = [
  {
    id: "warranty-24",
    label: "Extend warranty to 24 months",
    note: "Doubles the included cover. Same terms, same workshop.",
    price: 249_00,
    kind: "protection",
    popular: true,
  },
  {
    id: "damage-cover",
    label: "Accidental damage cover",
    note: "Two claims in 12 months, drops and spills included.",
    price: 349_00,
    kind: "protection",
  },
];

/** Offered per category. Keyed by the shop's own slugs. */
const byCategory: Record<string, AddOn[]> = {
  smartphones: [
    {
      id: "screen-fitted",
      label: "Screen protector, fitted",
      note: "Applied here, dust-free, before it ships.",
      price: 99_00,
      kind: "service",
    },
    {
      id: "phone-case",
      label: "Leather case",
      note: "Matched to the finish you chose.",
      price: 179_00,
      kind: "accessory",
    },
    {
      id: "charger-20w",
      label: "20W USB-C adapter",
      note: "Not included with the device. UAE three-pin.",
      price: 129_00,
      kind: "accessory",
    },
  ],
  laptops: [
    {
      id: "sleeve",
      label: "Protective sleeve",
      note: "Felted, cut for this chassis.",
      price: 249_00,
      kind: "accessory",
    },
    {
      id: "charger-96w",
      label: "Spare 96W adapter",
      note: "A second charger for the bag. UAE three-pin.",
      price: 179_00,
      kind: "accessory",
    },
    {
      id: "data-transfer",
      label: "Data transfer & setup",
      note: "We migrate from your old machine before dispatch.",
      price: 149_00,
      kind: "service",
    },
  ],
  tablets: [
    {
      id: "folio",
      label: "Leather folio case",
      note: "Doubles as a stand at two angles.",
      price: 329_00,
      kind: "accessory",
    },
    {
      id: "screen-fitted",
      label: "Screen protector, fitted",
      note: "Applied here, dust-free, before it ships.",
      price: 129_00,
      kind: "service",
    },
  ],
  audio: [
    {
      id: "cushions",
      label: "Fresh ear cushions",
      note: "A spare set beyond the pair already fitted.",
      price: 149_00,
      kind: "accessory",
    },
    {
      id: "carry-case",
      label: "Hard carry case",
      note: "Moulded, with a cable pocket.",
      price: 169_00,
      kind: "accessory",
    },
  ],
  smartwatches: [
    {
      id: "extra-strap",
      label: "Second strap",
      note: "Choose the size and finish at checkout.",
      price: 199_00,
      kind: "accessory",
    },
    {
      id: "screen-fitted",
      label: "Screen protector, fitted",
      note: "Applied here, dust-free, before it ships.",
      price: 89_00,
      kind: "service",
    },
  ],
  accessories: [],
};

/**
 * Older category vocabularies still in the tree — the drop data and the
 * navigation predate the shop's slugs. Resolved here so a PDP never
 * silently shows no add-ons because its category is spelled differently.
 */
const aliases: Record<string, string> = {
  phones: "smartphones",
  phone: "smartphones",
  laptop: "laptops",
  tablet: "tablets",
  wearables: "smartwatches",
  watches: "smartwatches",
  headphones: "audio",
};

/** At most this many, however many the category and universal lists hold. */
const MAX_ADD_ONS = 4;

function normalise(category: string) {
  const key = category.trim().toLowerCase().replace(/\s+/g, "-");
  return aliases[key] ?? key;
}

/**
 * Add-ons for a product's category, category-specific first.
 *
 * The specific ones lead because they are the ones a shopper can judge
 * instantly ("yes, I need a case"); the warranty extension is a slower,
 * more considered decision and reads better once the obvious items have
 * been dismissed. Accessories with nothing to protect get nothing.
 */
export function addOnsFor(category: string | undefined): AddOn[] {
  if (!category) return [];
  const key = normalise(category);
  const specific = byCategory[key];
  if (!specific) return [];
  if (key === "accessories") return [];
  return [...specific, ...universal].slice(0, MAX_ADD_ONS);
}

/** Sum of the selected add-ons, in minor units. */
export function addOnsTotal(addOns: AddOn[], selectedIds: string[]): number {
  return addOns
    .filter((addOn) => selectedIds.includes(addOn.id))
    .reduce((total, addOn) => total + addOn.price, 0);
}

/**
 * Nothing is ticked on load — see the note on `popular`. Kept as a
 * function rather than an inlined `[]` so the panel has one obvious place
 * to look if that policy is ever revisited, and one place to change.
 */
export function defaultSelection(): string[] {
  return [];
}
