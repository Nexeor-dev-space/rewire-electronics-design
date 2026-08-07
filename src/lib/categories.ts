/**
 * Category adapter — mock for now, Payload CMS later.
 * Swap the body of getCategories() for a CMS query without touching
 * the UI, exactly as `drops.ts` does.
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
    name: "Phones",
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
    name: "Audio",
    slug: "audio",
    count: 31,
    note: "Headphones and speakers",
    featured: true,
    image: {
      url: "/images/drops/drop-03.jpg",
      alt: "Midnight over-ear headphones, studio lit",
      width: 1000,
      height: 1250,
    },
    menuImage: {
      url: "/images/dropdown/3.jpg",
      alt: "Tan leather over-ear headphones resting on a grey studio sweep",
      width: 1500,
      height: 857,
    },
  },
  {
    id: "c4",
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
    id: "c5",
    name: "Wearables",
    slug: "wearables",
    count: 19,
    note: "Watches and trackers",
    featured: true,
    image: {
      url: "/images/drops/drop-04.jpg",
      alt: "Obsidian smartwatch on a lit studio surface",
      width: 1000,
      height: 1250,
    },
    menuImage: {
      url: "/images/dropdown/5.jpg",
      alt: "Smartwatch standing on a wooden plinth against dark foliage",
      width: 2000,
      height: 1333,
    },
  },
  {
    id: "c6",
    name: "Accessories",
    slug: "accessories",
    count: 28,
    note: "Cases, cables and chargers",
    // Navigation only until there is a studio shot worth showing.
    featured: false,
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
