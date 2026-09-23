"use client";

import type { ShopAddOn, ShopImage, ShopProductDetail } from "@/types/catalogue";
import { ProductBuyPanel } from "./product-buy-panel";
import { ProductGallery } from "./product-gallery";
import { useSelectedVariant } from "./selected-variant";

function imagesForColour(images: ShopImage[], colour: string | null) {
  const matching = images.filter((image) => image.colour === null || image.colour === colour);
  return matching.length > 0 ? matching : images;
}

export function ProductStage({
  product,
  addOns,
}: {
  product: ShopProductDetail;
  addOns: ShopAddOn[];
}) {
  const { variant, select } = useSelectedVariant();

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-16 xl:gap-20">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          key={variant.colour ?? ""}
          images={imagesForColour(product.images, variant.colour)}
        />
      </div>
      <ProductBuyPanel product={product} addOns={addOns} variant={variant} onVariantChange={select} />
    </div>
  );
}
