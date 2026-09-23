import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
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
import { SpecTable } from "@/components/product/detail/spec-table";
import { IncludedList } from "@/components/product/detail/included-list";
import { TrustBlocks } from "@/components/product/detail/trust-blocks";
import { RelatedProducts } from "@/components/product/detail/related-products";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import { findShopProductPage } from "@/services/catalogue.service";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

const getProduct = cache(findShopProductPage);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.brand} ${product.name}`,
    description: product.description || product.highlights[0],
  };
}

export default async function ProductPage({ params }: Params) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const { addOns, related } = product;
  const condition = CONDITION_META[product.condition].label;
  const grade = product.grade ? GRADE_META[product.grade].label : undefined;

  const sectionTabs = [
    { id: "overview", label: "Product Overview" },
    ...(product.specs.length > 0 ? [{ id: "specifications", label: "Specifications" }] : []),
    ...(product.included.length > 0 ? [{ id: "included", label: "What's Included" }] : []),
    { id: "terms", label: "The Terms" },
  ];

  return (
    <>
      {/* ---------- Breadcrumb ---------- */}
      <Container width="wide" className="pt-10 md:pt-14">
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Shop", href: SHOP_INDEX_HREF },
            { label: product.category.name, href: productHrefForCategory(product.category.slug) },
            { label: product.name },
          ]}
        />
      </Container>

      {/* ---------- Buy stage ----------
          Grid uses `lg:items-start` so the sticky child (the gallery)
          can reach the top of the viewport instead of being stretched
          to the height of the taller buy panel. */}
      <Container width="wide" className="pt-8 md:pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-16 xl:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductGallery images={product.images} />
          </div>
          <ProductBuyPanel
            product={product}
            addOns={addOns}
            condition={condition}
            grade={grade}
          />
        </div>
      </Container>

      {/* ---------- Section tab strip ---------- */}
      <Section spacing="sm">
        <Container width="wide">
          <PdpSectionNav tabs={sectionTabs} />
        </Container>
      </Section>

      {/* ---------- Overview ---------- */}
      <section
        id="overview"
        aria-labelledby="overview-heading"
        className="scroll-mt-24 pt-(--spacing-section-sm)"
      >
        <Container width="wide">
          <ProductOverview description={product.description} highlights={product.highlights} />
        </Container>
      </section>

      {/* ---------- Condition explainer ---------- */}
      <Section spacing="sm">
        <Container width="wide">
          <SectionEyebrow>The Condition</SectionEyebrow>
          <ConditionExplainer active={product.condition} grade={grade} />
        </Container>
      </Section>

      {/* ---------- Specifications ---------- */}
      {product.specs.length > 0 && (
        <section id="specifications" className="scroll-mt-24 pt-(--spacing-section-sm)">
          <Container width="wide">
            <SectionEyebrow>Specifications</SectionEyebrow>
            <SpecTable groups={product.specs} />
          </Container>
        </section>
      )}

      {/* ---------- What's included ---------- */}
      {product.included.length > 0 && (
        <section id="included" className="scroll-mt-24 pt-(--spacing-section-sm)">
          <Container width="wide">
            <SectionEyebrow>What&rsquo;s Included</SectionEyebrow>
            <IncludedList items={product.included} />
          </Container>
        </section>
      )}

      {/* ---------- Trust blocks ---------- */}
      <section id="terms" className="scroll-mt-24 pt-(--spacing-section-sm)">
        <Container width="wide">
          <SectionEyebrow>The Terms</SectionEyebrow>
          <TrustBlocks />
        </Container>
      </section>

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
