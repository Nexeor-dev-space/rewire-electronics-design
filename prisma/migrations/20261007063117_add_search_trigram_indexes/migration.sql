-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "brands_name_idx" ON "brands" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "product_variants_sku_idx" ON "product_variants" USING GIN ("sku" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products" USING GIN ("slug" gin_trgm_ops);

