CREATE TABLE "newsletter_captures" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "device" TEXT NOT NULL,
  "consentVersion" TEXT NOT NULL,
  "consentText" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "newsletter_captures_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "newsletter_captures_createdAt_source_variant_idx" ON "newsletter_captures"("createdAt", "source", "variant");
CREATE TABLE "newsletter_metrics" (
  "id" TEXT NOT NULL,
  "day" TIMESTAMP(3) NOT NULL,
  "source" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "device" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "newsletter_metrics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "newsletter_metrics_day_idx" ON "newsletter_metrics"("day");
