import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ConditionGrade } from "@/types";
import {
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/catalog";
import {
  Container,
  Section,
  SectionEyebrow,
} from "@/components/layout/container";
import { Breadcrumb } from "@/components/product/detail/breadcrumb";
import { productHrefForCategory, SHOP_INDEX_HREF } from "@/lib/route-map";
import { ProductGallery } from "@/components/product/detail/product-gallery";
import { ProductBuyPanel } from "@/components/product/detail/product-buy-panel";
import { ConditionExplainer } from "@/components/product/detail/condition-explainer";
import { ProductOverview } from "@/components/product/detail/product-overview";
import { SpecTable } from "@/components/product/detail/spec-table";
import { IncludedList } from "@/components/product/detail/included-list";
import { TrustBlocks } from "@/components/product/detail/trust-blocks";
import { RelatedProducts } from "@/components/product/detail/related-products";

/**
 * Product Detail — one template, every category.
 *
 * The catalogue in `@/lib/catalog` is the single source of truth; every
 * section on this page reads from a Product field and renders nothing
 * when that field is absent. That keeps the template honest for
 * accessories (no battery, no storage) and rich for flagships (both).
 *
 * Condition and Grade are surfaced as two distinct facts. All certified
 * devices here are `Refurbished`, so we hardcode the outer condition
 * label and derive the grade from `ConditionGrade`. When Pre-Owned or
 * Just Opened stock joins the catalogue, extend `Product` with an
 * explicit `condition` union rather than inferring it here.
 */

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} — ${product.variant}`,
    description: product.description,
  };
}

const GRADE_LABELS: Record<ConditionGrade, string> = {
  pristine: "A — Pristine",
  excellent: "B — Excellent",
  good: "C — Good",
};

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const related = getRelatedProducts(product, 4);
  const condition = "Refurbished";
  const grade = GRADE_LABELS[product.condition];

  return (
    <>
      {/* ---------- Breadcrumb ---------- */}
      <Container width="wide" className="pt-10 md:pt-14">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Shop", href: SHOP_INDEX_HREF },
            product.category && product.categorySlug
              ? {
                  label: product.category,
                  href: productHrefForCategory(product.categorySlug),
                }
              : { label: "Catalogue" },
            { label: product.name },
          ]}
        />
      </Container>

      {/* ---------- Buy stage ---------- */}
      <Container width="wide" className="pt-8 md:pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20">
          <ProductGallery images={product.images} />
          <ProductBuyPanel
            product={product}
            condition={condition}
            grade={grade}
          />
        </div>
      </Container>

      {/* ---------- Overview ----------
          Editorial read of the listing — the description, the four
          guarantee numbers, and the highlight cards. Placed above the
          condition explainer so a shopper who scrolls past the price
          panel meets the *why* of the device before the *what* of the
          condition grade. Auto-hides if the catalogue entry has no
          description and no highlights (accessories, adapters). */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow>Overview</SectionEyebrow>
          <ProductOverview
            product={product}
            condition={condition}
            grade={grade}
          />
        </Container>
      </Section>

      {/* ---------- Condition explainer ---------- */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow>The Condition</SectionEyebrow>
          <ConditionExplainer active="refurbished" grade={grade} />
        </Container>
      </Section>

      {/* ---------- Specifications ---------- */}
      {product.specs && product.specs.length > 0 && (
        <Section spacing="sm">
          <Container width="wide">
            <SectionEyebrow index="02">Specifications</SectionEyebrow>
            <SpecTable groups={product.specs} />
          </Container>
        </Section>
      )}

      {/* ---------- What's included ---------- */}
      {product.included && product.included.length > 0 && (
        <Section spacing="sm">
          <Container width="wide">
            <SectionEyebrow index="03">What&rsquo;s Included</SectionEyebrow>
            <IncludedList items={product.included} />
          </Container>
        </Section>
      )}

      {/* ---------- Trust blocks ---------- */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow index="04">The Terms</SectionEyebrow>
          <TrustBlocks />
        </Container>
      </Section>

      {/* ---------- Related products ---------- */}
      {related.length > 0 && (
        <Section spacing="sm" className="pb-(--spacing-section)">
          <Container width="wide">
            <SectionEyebrow index="05">You may also like</SectionEyebrow>
            <RelatedProducts items={related} />
          </Container>
        </Section>
      )}
    </>
  );
}
