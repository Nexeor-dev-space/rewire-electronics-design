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
import { ProductStage } from "@/components/product/detail/product-stage";
import {
  SelectedConditionExplainer,
  SelectedVariantProvider,
} from "@/components/product/detail/selected-variant";
import { ProductOverview } from "@/components/product/detail/product-overview";
import { PdpSectionNav } from "@/components/product/detail/pdp-section-nav";
import { SpecTable } from "@/components/product/detail/spec-table";
import { IncludedList } from "@/components/product/detail/included-list";
import { TrustBlocks } from "@/components/product/detail/trust-blocks";
import { RelatedProducts } from "@/components/product/detail/related-products";
import { productJsonLd } from "@/lib/seo";
import { productHref } from "@/lib/shop";
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
    alternates: { canonical: productHref(product) },
    openGraph: { images: product.images.slice(0, 1).map((image) => image.url) },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const { addOns, related, ...detail } = product;

  const sectionTabs = [
    { id: "overview", label: "Product Overview" },
    ...(product.specs.length > 0 ? [{ id: "specifications", label: "Specifications" }] : []),
    ...(product.included.length > 0 ? [{ id: "included", label: "What's Included" }] : []),
    { id: "terms", label: "The Terms" },
  ];

  return (
    <SelectedVariantProvider variants={product.variants}>
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

      <Container width="wide" className="pt-8 md:pt-12">
        <ProductStage product={detail} addOns={addOns} />
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
          <SelectedConditionExplainer />
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJsonLd(product) }}
      />
    </SelectedVariantProvider>
  );
}
