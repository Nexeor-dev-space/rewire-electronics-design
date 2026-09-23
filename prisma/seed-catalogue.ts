import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "../src/generated/prisma/client";
import { slugify } from "../src/lib/utils";

type Condition = "NEW" | "OPEN_BOX" | "PRE_OWNED" | "REFURBISHED";
type Grade = "PREMIUM" | "EXCELLENT" | "VERY_GOOD" | "GOOD";
type Kind = "PROTECTION" | "ACCESSORY" | "SERVICE";

interface SeedCategory {
  slug: string;
  name: string;
  image: string;
}

interface SeedProduct {
  brand: string;
  name: string;
  category: string;
  condition: Condition;
  grade?: Grade;
  keySpec: string;
  storage?: string;
  colour: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  listedAt: string;
  image?: { file: string; alt: string };
}

interface SeedAddOn {
  name: string;
  note: string;
  kind: Kind;
  price: number;
  popular?: boolean;
  categories: string[] | "all";
}

const IMAGE_ROOT = path.join(process.cwd(), "public", "images");

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const CATEGORIES: SeedCategory[] = [
  { slug: "smartphones", name: "Smartphones", image: "hero/phone.png" },
  { slug: "laptops", name: "Laptops", image: "hero/laptop.png" },
  { slug: "tablets", name: "Tablets", image: "categories/tablets.jpg" },
  { slug: "smartwatches", name: "Smartwatches", image: "hero/watch.png" },
  { slug: "audio", name: "Audio", image: "hero/headphones.png" },
  { slug: "accessories", name: "Accessories", image: "craft/craft-02.jpg" },
];

const PRODUCTS: SeedProduct[] = [
  { brand: "Apple", name: "iPhone 14 Pro", category: "smartphones", condition: "REFURBISHED", grade: "PREMIUM", keySpec: "A16 Bionic · 6.1-inch ProMotion", storage: "256GB", colour: "Space Black", price: 2_499_00, compareAtPrice: 4_299_00, stock: 12, listedAt: "2026-08-11" },
  { brand: "Apple", name: "iPhone 13", category: "smartphones", condition: "REFURBISHED", grade: "EXCELLENT", keySpec: "A15 Bionic · Dual 12MP camera", storage: "128GB", colour: "Midnight", price: 1_449_00, compareAtPrice: 2_699_00, stock: 18, listedAt: "2026-08-04" },
  { brand: "Samsung", name: "Galaxy S23 Ultra", category: "smartphones", condition: "OPEN_BOX", keySpec: "Snapdragon 8 Gen 2 · 200MP", storage: "512GB", colour: "Phantom Black", price: 2_899_00, compareAtPrice: 4_999_00, stock: 6, listedAt: "2026-08-08" },
  { brand: "Google", name: "Pixel 7 Pro", category: "smartphones", condition: "PRE_OWNED", grade: "VERY_GOOD", keySpec: "Tensor G2 · 5× telephoto", storage: "128GB", colour: "Obsidian", price: 1_299_00, compareAtPrice: 2_899_00, stock: 4, listedAt: "2026-07-29" },
  { brand: "Apple", name: "iPhone 15 Pro Max", category: "smartphones", condition: "NEW", keySpec: "A17 Pro · Titanium chassis", storage: "512GB", colour: "Natural Titanium", price: 4_699_00, stock: 5, listedAt: "2026-08-15" },
  { brand: "Samsung", name: "Galaxy S22", category: "smartphones", condition: "PRE_OWNED", grade: "GOOD", keySpec: "Snapdragon 8 Gen 1 · 6.1-inch", storage: "128GB", colour: "Green", price: 999_00, compareAtPrice: 2_299_00, stock: 3, listedAt: "2026-07-02" },
  { brand: "Google", name: "Pixel 8", category: "smartphones", condition: "OPEN_BOX", keySpec: "Tensor G3 · seven years of updates", storage: "256GB", colour: "Hazel", price: 1_749_00, compareAtPrice: 2_499_00, stock: 8, listedAt: "2026-08-13" },
  { brand: "Apple", name: "iPhone 12", category: "smartphones", condition: "REFURBISHED", grade: "VERY_GOOD", keySpec: "A14 Bionic · Ceramic Shield", storage: "64GB", colour: "Blue", price: 949_00, compareAtPrice: 2_199_00, stock: 15, listedAt: "2026-06-24" },
  { brand: "Apple", name: "MacBook Air 13 M2", category: "laptops", condition: "REFURBISHED", grade: "PREMIUM", keySpec: "M2 · 8-core GPU · 18-hour battery", storage: "256GB", colour: "Midnight", price: 2_799_00, compareAtPrice: 4_599_00, stock: 9, listedAt: "2026-08-09" },
  { brand: "Apple", name: "MacBook Pro 14 M1 Pro", category: "laptops", condition: "REFURBISHED", grade: "EXCELLENT", keySpec: "M1 Pro · 120Hz mini-LED XDR", storage: "512GB", colour: "Space Grey", price: 3_899_00, compareAtPrice: 7_499_00, stock: 5, listedAt: "2026-08-02" },
  { brand: "Dell", name: "XPS 13 Plus", category: "laptops", condition: "PRE_OWNED", grade: "VERY_GOOD", keySpec: "Core i7-1360P · OLED 3.5K touch", storage: "512GB", colour: "Platinum", price: 2_199_00, compareAtPrice: 4_199_00, stock: 6, listedAt: "2026-07-25" },
  { brand: "Microsoft", name: "Surface Laptop 5", category: "laptops", condition: "REFURBISHED", grade: "EXCELLENT", keySpec: "Core i5-1235U · 3:2 PixelSense", storage: "256GB", colour: "Sage", price: 1_899_00, compareAtPrice: 3_699_00, stock: 4, listedAt: "2026-07-18" },
  { brand: "Apple", name: "MacBook Pro 16 M2 Max", category: "laptops", condition: "NEW", keySpec: "M2 Max · 38-core GPU · 32GB", storage: "1TB", colour: "Space Grey", price: 6_499_00, stock: 2, listedAt: "2026-08-17" },
  { brand: "Lenovo", name: "ThinkPad X1 Carbon", category: "laptops", condition: "PRE_OWNED", grade: "GOOD", keySpec: "Core i7-1265U · 14-inch WUXGA", storage: "512GB", colour: "Black", price: 1_599_00, compareAtPrice: 3_899_00, stock: 7, listedAt: "2026-07-06" },
  { brand: "Apple", name: "iPad Pro 11 M2", category: "tablets", condition: "REFURBISHED", grade: "PREMIUM", keySpec: "M2 · 120Hz ProMotion · Pencil hover", storage: "256GB", colour: "Space Grey", price: 2_299_00, compareAtPrice: 3_999_00, stock: 8, listedAt: "2026-08-07" },
  { brand: "Apple", name: "iPad Air", category: "tablets", condition: "REFURBISHED", grade: "EXCELLENT", keySpec: "M1 · 10.9-inch Liquid Retina", storage: "64GB", colour: "Blue", price: 1_149_00, compareAtPrice: 2_299_00, stock: 14, listedAt: "2026-07-31" },
  { brand: "Samsung", name: "Galaxy Tab S8", category: "tablets", condition: "PRE_OWNED", grade: "VERY_GOOD", keySpec: "Snapdragon 8 Gen 1 · S Pen included", storage: "128GB", colour: "Graphite", price: 1_099_00, compareAtPrice: 2_599_00, stock: 5, listedAt: "2026-07-09" },
  { brand: "Apple", name: "iPad mini", category: "tablets", condition: "OPEN_BOX", keySpec: "A15 Bionic · 8.3-inch Liquid Retina", storage: "256GB", colour: "Starlight", price: 1_549_00, compareAtPrice: 2_199_00, stock: 6, listedAt: "2026-08-12" },
  { brand: "Apple", name: "Watch Series 8", category: "smartwatches", condition: "REFURBISHED", grade: "EXCELLENT", keySpec: "ECG and temperature sensing", colour: "Midnight · 45mm", price: 749_00, compareAtPrice: 1_599_00, stock: 16, listedAt: "2026-08-06" },
  { brand: "Apple", name: "Watch Ultra", category: "smartwatches", condition: "REFURBISHED", grade: "PREMIUM", keySpec: "Titanium · 100m · 36-hour battery", colour: "Titanium · 49mm", price: 1_899_00, compareAtPrice: 3_299_00, stock: 3, listedAt: "2026-08-14" },
  { brand: "Samsung", name: "Galaxy Watch 5 Pro", category: "smartwatches", condition: "PRE_OWNED", grade: "VERY_GOOD", keySpec: "Sapphire crystal · 80-hour battery", colour: "Black Titanium · 45mm", price: 649_00, compareAtPrice: 1_499_00, stock: 5, listedAt: "2026-07-20" },
  { brand: "Garmin", name: "Fenix 7", category: "smartwatches", condition: "PRE_OWNED", grade: "GOOD", keySpec: "Solar charging · multi-band GPS", colour: "Slate Grey · 47mm", price: 1_249_00, compareAtPrice: 2_899_00, stock: 4, listedAt: "2026-06-30" },
  { brand: "Apple", name: "AirPods Pro (2nd gen)", category: "audio", condition: "OPEN_BOX", keySpec: "H2 · Adaptive Transparency", colour: "White", price: 549_00, compareAtPrice: 999_00, stock: 22, listedAt: "2026-08-12" },
  { brand: "Sony", name: "WH-1000XM4", category: "audio", condition: "REFURBISHED", grade: "EXCELLENT", keySpec: "30-hour battery · LDAC", colour: "Midnight Blue", price: 649_00, compareAtPrice: 1_399_00, stock: 11, listedAt: "2026-08-05" },
  { brand: "Bose", name: "QuietComfort 45", category: "audio", condition: "REFURBISHED", grade: "VERY_GOOD", keySpec: "24-hour battery · Quiet and Aware", colour: "Triple Black", price: 499_00, compareAtPrice: 1_199_00, stock: 8, listedAt: "2026-07-22" },
  { brand: "Apple", name: "AirPods Max", category: "audio", condition: "REFURBISHED", grade: "PREMIUM", keySpec: "Spatial audio with head tracking", colour: "Space Grey", price: 1_249_00, compareAtPrice: 2_299_00, stock: 3, listedAt: "2026-08-13" },
  { brand: "Sennheiser", name: "Momentum 4", category: "audio", condition: "PRE_OWNED", grade: "GOOD", keySpec: "60-hour battery · aptX Adaptive", colour: "Graphite", price: 579_00, compareAtPrice: 1_299_00, stock: 6, listedAt: "2026-07-16" },
  { brand: "Sony", name: "WF-1000XM5", category: "audio", condition: "NEW", keySpec: "Processor V2 · 8-hour battery", colour: "Black", price: 899_00, stock: 12, listedAt: "2026-08-16" },
  { brand: "Apple", name: "Leather Folio Case", category: "accessories", condition: "NEW", keySpec: "For iPad Pro 11-inch", colour: "Black", price: 329_00, stock: 18, listedAt: "2026-08-10", image: { file: "craft/craft-02.jpg", alt: "Macro of the folio's soft black leather edge and stitched seam" } },
  { brand: "Apple", name: "96W USB-C Power Adapter", category: "accessories", condition: "OPEN_BOX", keySpec: "96W · UAE three-pin", colour: "White", price: 179_00, compareAtPrice: 349_00, stock: 26, listedAt: "2026-07-11", image: { file: "dropdown/6.jpg", alt: "A white power adapter seated in a twin wall socket" } },
  { brand: "Rewire", name: "Braided USB-C Cable", category: "accessories", condition: "NEW", keySpec: "2m · 240W USB-C to USB-C", colour: "Graphite", price: 129_00, stock: 40, listedAt: "2026-08-18", image: { file: "craft/craft-01.jpg", alt: "Macro of the braided cable against the embossed Rewire sleeve" } },
  { brand: "Rewire", name: "Protective Laptop Sleeve", category: "accessories", condition: "NEW", keySpec: "For 14-inch laptops", colour: "Charcoal", price: 249_00, stock: 22, listedAt: "2026-08-03", image: { file: "craft/craft-03.jpg", alt: "Macro of the sleeve's charcoal felted surface and rolled edge" } },
];

const ADD_ONS: SeedAddOn[] = [
  { name: "Extend warranty to 24 months", note: "Doubles the included cover. Same terms, same workshop.", kind: "PROTECTION", price: 249_00, popular: true, categories: ["smartphones", "laptops", "tablets", "smartwatches", "audio"] },
  { name: "Accidental damage cover", note: "Two claims in 12 months, drops and spills included.", kind: "PROTECTION", price: 349_00, categories: ["smartphones", "laptops", "tablets", "smartwatches", "audio"] },
  { name: "Screen protector, fitted", note: "Applied here, dust-free, before it ships.", kind: "SERVICE", price: 99_00, categories: ["smartphones"] },
  { name: "Leather case", note: "Matched to the finish you chose.", kind: "ACCESSORY", price: 179_00, categories: ["smartphones"] },
  { name: "20W USB-C adapter", note: "Not included with the device. UAE three-pin.", kind: "ACCESSORY", price: 129_00, categories: ["smartphones"] },
  { name: "Protective sleeve", note: "Felted, cut for this chassis.", kind: "ACCESSORY", price: 249_00, categories: ["laptops"] },
  { name: "Spare 96W adapter", note: "A second charger for the bag. UAE three-pin.", kind: "ACCESSORY", price: 179_00, categories: ["laptops"] },
  { name: "Data transfer & setup", note: "We migrate from your old machine before dispatch.", kind: "SERVICE", price: 149_00, categories: ["laptops"] },
  { name: "Leather folio case", note: "Doubles as a stand at two angles.", kind: "ACCESSORY", price: 329_00, categories: ["tablets"] },
  { name: "Screen protector, fitted", note: "Applied here, dust-free, before it ships.", kind: "SERVICE", price: 129_00, categories: ["tablets"] },
  { name: "Fresh ear cushions", note: "A spare set beyond the pair already fitted.", kind: "ACCESSORY", price: 149_00, categories: ["audio"] },
  { name: "Hard carry case", note: "Moulded, with a cable pocket.", kind: "ACCESSORY", price: 169_00, categories: ["audio"] },
  { name: "Second strap", note: "Choose the size and finish at checkout.", kind: "ACCESSORY", price: 199_00, categories: ["smartwatches"] },
  { name: "Screen protector, fitted", note: "Applied here, dust-free, before it ships.", kind: "SERVICE", price: 89_00, categories: ["smartwatches"] },
];

export async function seedCatalogue(prisma: PrismaClient) {
  const categoryIds = await seedCategories(prisma);
  const brandIds = await seedBrands(prisma);
  const created = await seedProducts(prisma, categoryIds, brandIds);
  const addOns = await seedAddOns(prisma, categoryIds);
  console.log(`  ${created} products and ${addOns} add-ons created`);
}

async function seedCategories(prisma: PrismaClient) {
  const ids = new Map<string, string>();
  for (const category of CATEGORIES) {
    const nameKey = category.name.toLowerCase();
    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug: category.slug }, { nameKey }] },
      select: { id: true },
    });
    const row =
      existing ??
      (await prisma.category.create({
        data: { name: category.name, nameKey, slug: category.slug },
        select: { id: true },
      }));
    ids.set(category.slug, row.id);
  }
  return ids;
}

async function seedBrands(prisma: PrismaClient) {
  const ids = new Map<string, string>();
  for (const name of new Set(PRODUCTS.map((product) => product.brand))) {
    const nameKey = name.toLowerCase();
    const row = await prisma.brand.upsert({
      where: { nameKey },
      create: { name, nameKey },
      update: {},
      select: { id: true },
    });
    ids.set(name, row.id);
  }
  return ids;
}

async function seedProducts(
  prisma: PrismaClient,
  categoryIds: Map<string, string>,
  brandIds: Map<string, string>,
) {
  const media = new Map<string, string>();
  const imageFor = async (file: string) => {
    const cached = media.get(file);
    if (cached) return cached;
    const data = new Uint8Array(await readFile(path.join(IMAGE_ROOT, file)));
    const mimeType = MIME_TYPES[path.extname(file).toLowerCase()];
    const { id } = await prisma.mediaAsset.create({ data: { data, mimeType }, select: { id: true } });
    media.set(file, id);
    return id;
  };

  let created = 0;
  for (const product of PRODUCTS) {
    const slug = slugify(`${product.brand} ${product.name}`);
    const exists = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (exists) continue;

    const categoryImage = CATEGORIES.find((category) => category.slug === product.category)!.image;
    const mediaId = await imageFor(product.image?.file ?? categoryImage);
    const listedAt = new Date(product.listedAt);

    await prisma.product.create({
      data: {
        slug,
        name: product.name,
        brandId: brandIds.get(product.brand)!,
        categoryId: categoryIds.get(product.category)!,
        highlights: [product.keySpec],
        status: "PUBLISHED",
        publishedAt: listedAt,
        minPrice: product.price,
        variants: {
          create: {
            sku: [slug, product.storage].filter(Boolean).join("-").toUpperCase(),
            condition: product.condition,
            grade: product.grade ?? null,
            storage: product.storage ?? null,
            colour: product.colour,
            price: product.price,
            compareAtPrice: product.compareAtPrice ?? null,
            stock: product.stock,
          },
        },
        images: {
          create: {
            mediaId,
            alt: product.image?.alt ?? `${product.brand} ${product.name} in ${product.colour}`,
          },
        },
      },
    });
    created += 1;
  }
  return created;
}

async function seedAddOns(prisma: PrismaClient, categoryIds: Map<string, string>) {
  let created = 0;
  for (const addOn of ADD_ONS) {
    const exists = await prisma.addOn.findFirst({
      where: { name: addOn.name, price: addOn.price },
      select: { id: true },
    });
    if (exists) continue;

    const slugs = addOn.categories === "all" ? [] : addOn.categories;
    await prisma.addOn.create({
      data: {
        name: addOn.name,
        note: addOn.note,
        kind: addOn.kind,
        price: addOn.price,
        popular: addOn.popular ?? false,
        appliesToAll: addOn.categories === "all",
        categories: { create: slugs.map((slug) => ({ categoryId: categoryIds.get(slug)! })) },
      },
    });
    created += 1;
  }
  return created;
}
