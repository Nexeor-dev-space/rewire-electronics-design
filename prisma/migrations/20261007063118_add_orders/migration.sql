-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'APPLE_PAY', 'COD');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('STANDARD', 'EXPRESS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userId" TEXT,
    "placedAsGuest" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrderStatus" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "returnableUntil" TIMESTAMP(3),
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "staffNote" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT false,
    "address1" TEXT NOT NULL,
    "address2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL DEFAULT '',
    "emirate" "Emirate" NOT NULL,
    "deliveryMethod" "DeliveryMethod" NOT NULL,
    "deliveryEtaMinDays" INTEGER NOT NULL,
    "deliveryEtaMaxDays" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "deliveryFee" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "vatIncluded" INTEGER NOT NULL,
    "vatRatePercent" INTEGER NOT NULL,
    "refundedAmount" INTEGER NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT,
    "imageId" TEXT,
    "productName" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "storage" TEXT,
    "colour" TEXT,
    "condition" "ProductCondition" NOT NULL,
    "grade" "ProductGrade",
    "warrantyMonths" INTEGER NOT NULL,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "unitPrice" INTEGER NOT NULL,
    "addOnUnitPrice" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_add_ons" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "addOnId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "AddOnKind" NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "discount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_number_key" ON "orders"("number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_createdAt_idx" ON "orders"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");

-- CreateIndex
CREATE INDEX "order_items_imageId_idx" ON "order_items"("imageId");

-- CreateIndex
CREATE INDEX "order_item_add_ons_orderItemId_idx" ON "order_item_add_ons"("orderItemId");

-- CreateIndex
CREATE INDEX "order_item_add_ons_addOnId_idx" ON "order_item_add_ons"("addOnId");

-- CreateIndex
CREATE INDEX "order_status_events_orderId_createdAt_idx" ON "order_status_events"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_orderId_key" ON "coupon_redemptions"("orderId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponId_userId_idx" ON "coupon_redemptions"("couponId", "userId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_add_ons" ADD CONSTRAINT "order_item_add_ons_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_add_ons" ADD CONSTRAINT "order_item_add_ons_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "add_ons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
