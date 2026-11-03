CREATE TABLE "registration_newsletters" (
  "userId" TEXT NOT NULL,
  "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consentVersion" TEXT NOT NULL,
  "consentText" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'registration',
  "verifiedAt" TIMESTAMP(3),
  "listId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AWAITING_EMAIL',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "registration_newsletters_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "registration_newsletters_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "registration_newsletters_status_nextAttemptAt_idx" ON "registration_newsletters"("status", "nextAttemptAt");
CREATE TABLE "public_form_limits" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "public_form_limits_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "public_form_limits_resetAt_idx" ON "public_form_limits"("resetAt");
