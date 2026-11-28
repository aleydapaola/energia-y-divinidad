CREATE TABLE "campaign_drive_folders" (
  "environment" TEXT PRIMARY KEY,
  "fileId" TEXT NOT NULL UNIQUE
);

CREATE TABLE "campaign_attachments" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL REFERENCES "email_campaigns"("id") ON DELETE RESTRICT,
  "fileId" TEXT NOT NULL UNIQUE,
  "folderId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "encryptedSession" TEXT,
  "downloadUrl" TEXT,
  "removedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("campaignId", "sha256", "filename")
);
CREATE INDEX "campaign_attachments_campaignId_removedAt_idx"
  ON "campaign_attachments" ("campaignId", "removedAt");
