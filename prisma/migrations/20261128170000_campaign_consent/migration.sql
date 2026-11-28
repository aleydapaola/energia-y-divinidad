CREATE TYPE "EmailCampaignKind" AS ENUM ('NEWSLETTER', 'OPERATIONAL');
ALTER TABLE "email_campaigns" ADD COLUMN "kind" "EmailCampaignKind";
ALTER TABLE "email_campaign_recipients" ADD COLUMN "nextAttemptAt" TIMESTAMP(3);
CREATE INDEX "email_campaign_recipients_campaignId_status_nextAttemptAt_idx"
  ON "email_campaign_recipients" ("campaignId", "status", "nextAttemptAt");
