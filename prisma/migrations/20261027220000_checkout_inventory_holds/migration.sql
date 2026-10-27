CREATE TYPE "CheckoutHoldState" AS ENUM ('HELD', 'CAPTURING', 'REPORTED', 'CONSUMED', 'RELEASED');

CREATE TABLE "checkout_holds" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "duration" INTEGER,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "state" "CheckoutHoldState" NOT NULL DEFAULT 'HELD',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "checkout_holds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "checkout_holds_orderId_key" ON "checkout_holds"("orderId");
CREATE INDEX "checkout_holds_orderType_resourceId_state_expiresAt_idx" ON "checkout_holds"("orderType", "resourceId", "state", "expiresAt");
CREATE INDEX "checkout_holds_scheduledAt_state_idx" ON "checkout_holds"("scheduledAt", "state");
ALTER TABLE "checkout_holds" ADD CONSTRAINT "checkout_holds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
