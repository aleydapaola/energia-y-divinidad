export const CAMPAIGN_PDF_LIMIT = 10_000_000;

export type CampaignAttachmentView = {
  id: string;
  filename: string;
  size: number;
  downloadUrl: string | null;
};
