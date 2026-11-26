BEGIN;

CREATE TABLE "order_digital_products" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "legacyFiles" JSONB,
    CONSTRAINT "order_digital_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_digital_products_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "order_digital_products_orderId_productId_key" ON "order_digital_products"("orderId", "productId");
CREATE INDEX "order_digital_products_productId_idx" ON "order_digital_products"("productId");

ALTER TABLE "DriveProductDelivery"
    ALTER COLUMN "orderId" DROP NOT NULL,
    ADD COLUMN "orderProductId" TEXT,
    ADD CONSTRAINT "DriveProductDelivery_orderProductId_fkey" FOREIGN KEY ("orderProductId") REFERENCES "order_digital_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "DriveProductDelivery_one_order_source" CHECK (("orderId" IS NULL) <> ("orderProductId" IS NULL));

CREATE UNIQUE INDEX "DriveProductDelivery_orderProductId_key" ON "DriveProductDelivery"("orderProductId");

COMMIT;
