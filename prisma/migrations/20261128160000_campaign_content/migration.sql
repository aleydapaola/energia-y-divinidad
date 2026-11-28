ALTER TABLE "email_campaigns" ADD COLUMN "contentBlocks" JSONB;
ALTER TYPE "EmailCampaignAudienceType" ADD VALUE 'COMBINED';
