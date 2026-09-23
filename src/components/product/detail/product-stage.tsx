"use client";

import { useState } from "react";
import type { ShopAddOn, ShopImage, ShopProductDetail } from "@/types/catalogue";
import { ProductBuyPanel } from "./product-buy-panel";
import { ProductGallery } from "./product-gallery";

function imagesForColour(images: ShopImage[], colour: string | null) {
  const matching = images.filter((image) => image.colour === null || image.colour === colour);
  return matching.length > 0 ? matching : images;
}

export function ProductStage({
  product,
  addOns,
  condition,
  grade,
}: {
  product: ShopProductDetail;
  addOns: ShopAddOn[];
  condition: string;
  grade?: string;
}) {
  const [variantId, setVariantId] = useState(
    () => (product.variants.find((variant) => variant.stock > 0) ?? product.variants[0]).id,
  );
  const colour = product.variants.find((variant) => variant.id === variantId)?.colour ?? null;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-16 xl:gap-20">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery key={colour ?? ""} images={imagesForColour(product.images, colour)} />
      </div>
      <ProductBuyPanel
        product={product}
        addOns={addOns}
        condition={condition}
        grade={grade}
        variantId={variantId}
        onVariantChange={setVariantId}
      />
    </div>
  );
}
