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
import { PdpSectionNav } from "@/components/product/detail/pdp-section-nav";
import { ProductReviews } from "@/components/product/detail/product-reviews";
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

  // Only render a tab for a section that this listing actually has —
  // Specifications drops off accessory PDPs, What's Included drops off
  // listings that don't ship extras, and pointing a tab at a section
  // that isn't rendered would scroll the reader to nothing.
  const sectionTabs = [
    { id: "overview", label: "Product Overview" },
    ...(product.specs && product.specs.length > 0
      ? [{ id: "specifications", label: "Specifications" }]
      : []),
    ...(product.included && product.included.length > 0
      ? [{ id: "included", label: "What's Included" }]
      : []),
    { id: "terms", label: "The Terms" },
    ...(product.reviews && product.reviews.length > 0
      ? [{ id: "reviews", label: "Ratings & Reviews" }]
      : []),
  ];

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

      {/* ---------- Buy stage ----------
          Grid uses `lg:items-start` so the sticky child (the gallery)
          can reach the top of the viewport instead of being stretched
          to the height of the taller buy panel. On `lg+` the gallery
          wrapper is `sticky top-24`, so the product stays in view
          while the shopper scrolls the buy panel — options, add-ons,
          quantity — and only releases once the buy panel's foot has
          overtaken the gallery's bottom edge. Below `lg` the two
          columns collapse to a stack and the gallery scrolls with the
          page like ordinary content. */}
      <Container width="wide" className="pt-8 md:pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-16 xl:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery images={product.images} />
          </div>
          <ProductBuyPanel
            product={product}
            condition={condition}
            grade={grade}
          />
        </div>
      </Container>

      {/* ---------- Section tab strip ----------
          Pill anchors that scroll to each of the long-form sections
          below, modelled on the noon.com PDP overview strip. The
          `<section>`s further down carry matching IDs and a
          `scroll-mt-24` so the fixed masthead does not cover the
          heading on jump. */}
      <Section spacing="sm">
        <Container width="wide">
          <PdpSectionNav tabs={sectionTabs} />
        </Container>
      </Section>

      {/* ---------- Overview ----------
          Editorial long-form read of the listing — title, multi-paragraph
          description, and a bulleted HIGHLIGHTS list. Structure matches
          the noon.com PDP overview so the section reads as catalogue
          copy rather than as marketing chrome. `id` and `scroll-mt-*`
          make it the anchor target of the tab above. */}
      <section
        id="overview"
        aria-labelledby="overview-heading"
        className="scroll-mt-24 pt-(--spacing-section-sm)"
      >
        <Container width="wide">
          <ProductOverview product={product} />
        </Container>
      </section>

      {/* ---------- Condition explainer ---------- */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow>The Condition</SectionEyebrow>
          <ConditionExplainer active="refurbished" grade={grade} />
        </Container>
      </Section>

      {/* ---------- Specifications ---------- */}
      {product.specs && product.specs.length > 0 && (
        <section
          id="specifications"
          className="scroll-mt-24 pt-(--spacing-section-sm)"
        >
          <Container width="wide">
            <SectionEyebrow>Specifications</SectionEyebrow>
            <SpecTable groups={product.specs} />
          </Container>
        </section>
      )}

      {/* ---------- What's included ---------- */}
      {product.included && product.included.length > 0 && (
        <section
          id="included"
          className="scroll-mt-24 pt-(--spacing-section-sm)"
        >
          <Container width="wide">
            <SectionEyebrow>What&rsquo;s Included</SectionEyebrow>
            <IncludedList items={product.included} />
          </Container>
        </section>
      )}

      {/* ---------- Trust blocks ---------- */}
      <section
        id="terms"
        className="scroll-mt-24 pt-(--spacing-section-sm)"
      >
        <Container width="wide">
          <SectionEyebrow>The Terms</SectionEyebrow>
          <TrustBlocks />
        </Container>
      </section>

      {/* ---------- Ratings & Reviews ----------
          Only rendered when the catalogue entry actually has reviews —
          an empty state on a fresh listing reads as low signal, not as
          a section waiting to be filled. The section id + `scroll-mt-*`
          make it the fourth anchor target for the tab strip above. */}
      {product.reviews && product.reviews.length > 0 && (
        <section
          id="reviews"
          className="scroll-mt-24 pt-(--spacing-section-sm)"
        >
          <Container width="wide">
            <SectionEyebrow>Ratings &amp; Reviews</SectionEyebrow>
            <ProductReviews
              reviews={product.reviews}
              rating={product.rating}
              reviewCount={product.reviewCount}
            />
          </Container>
        </section>
      )}

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
