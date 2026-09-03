/**
 * Category adapter — mock for now, Payload CMS later.
 * Swap the body of getCategories() for a CMS query without touching
 * the UI, exactly as `drops.ts` does.
 *
 * **This list is the storefront's primary product taxonomy.** Four
 * families are sold and navigated: Smartphones, Laptops, Tablets and
 * Accessories. The navbar rail, the mobile drawer, the homepage
 * category strip and the category mega-panels all read from here, so
 * adding an entry adds it to every one of them at once.
 *
 * Audio and Wearables were removed from this list. They are *not*
 * removed from the catalogue: `lib/shop.ts` still stocks headphones and
 * smartwatches, still filters on them, and `/collection` still browses
 * them. What changed is that they no longer appear as primary
 * navigation destinations — this file is presentation, not inventory.
 *
 * `slug` stays `phones` for Smartphones on purpose. `lib/shop.ts`
 * resolves `phones → smartphones` (see `categoryAliases` there), so
 * `/collection/phones` lands on the Smartphones listing and every link
 * already in the wild keeps working. Only the label the shopper reads
 * changed.
 */

export interface Category {
  id: string;
  /** Display name, e.g. "Phones". */
  name: string;
  /** Route segment under /collection. */
  slug: string;
  /**
   * Devices currently listed in this category. Placeholder counts —
   * replace with a live aggregate when the catalogue is wired.
   */
  count: number;
  /** One short line of character. Never a spec list. */
  note: string;
  /**
   * Shown in the homepage gallery. Non-featured categories still appear
   * in the navigation — they simply have no studio photography yet.
   */
  featured: boolean;
  image: { url: string; alt: string; width: number; height: number };
  /**
   * The wide plate used by the Categories dropdown, which frames cards at
   * 3:2. Kept separate from `image` because that one is shot 4:5 for the
   * homepage rail — a landscape source cropped to portrait loses more than
   * half its width, which turns a laptop into an anonymous close-up of a
   * screen. Falls back to `image` when a category has no wide cut.
   */
  menuImage?: { url: string; alt: string; width: number; height: number };
}

const categories: Category[] = [
  {
    id: "c1",
    name: "Smartphones",
    slug: "phones",
    count: 24,
    note: "Flagships, one generation back",
    featured: true,
    image: {
      url: "/images/drops/drop-01.jpg",
      alt: "Graphite smartphone standing on a lit studio plinth",
      width: 1000,
      height: 1250,
    },
    menuImage: {
      url: "/images/dropdown/1.jpg",
      alt: "A hand holding a phone up against a range of dusk-lit mountains",
      width: 1500,
      height: 841,
    },
  },
  {
    id: "c2",
    name: "Laptops",
    slug: "laptops",
    count: 16,
    note: "Studio machines, restored",
    featured: true,
    image: {
      url: "/images/drops/drop-02.jpg",
      alt: "Titanium laptop open on a lit studio surface",
      width: 1000,
      height: 1250,
    },
    menuImage: {
      url: "/images/dropdown/2.jpg",
      alt: "Silver laptop open on a pale desk beside a small potted plant",
      width: 1500,
      height: 841,
    },
  },
  {
    id: "c3",
    name: "Tablets",
    slug: "tablets",
    count: 12,
    note: "For drawing and reading",
    featured: true,
    image: {
      // Composited locally from the phone render (image credits exhausted) —
      // swap for a real tablet studio shot when photography lands.
      url: "/images/categories/tablets.jpg",
      alt: "Matte black tablet leaning upright on a warm ivory surface",
      width: 1000,
      height: 1250,
    },
    menuImage: {
      url: "/images/dropdown/4.jpg",
      alt: "Black tablet propped on its folio cover on a white desk",
      width: 1500,
      height: 818,
    },
  },
  {
    id: "c4",
    name: "Accessories",
    slug: "accessories",
    count: 28,
    note: "Cases, cables and chargers",
    // One of the four primary families, so it appears in the homepage
    // strip alongside the devices rather than in navigation only. The
    // plate below is still a stand-in — swap it for real accessory
    // photography when it lands.
    featured: true,
    image: {
      // Stand-in: a craft macro reads as premium material rather than a
      // literal charger. Swap for real accessory photography when it lands.
      url: "/images/craft/craft-02.jpg",
      alt: "Macro of dark leather-textured material",
      width: 1000,
      height: 1333,
    },
    menuImage: {
      url: "/images/dropdown/6.jpg",
      alt: "White twin wall socket with a plug seated in one outlet",
      width: 4500,
      height: 4000,
    },
  },
];

/** Every category — used by the navigation. */
export function getCategories(): Category[] {
  return categories;
}

/** Only those with photography, for the homepage gallery. */
export function getFeaturedCategories(): Category[] {
  return categories.filter((category) => category.featured);
}
