import { z } from "zod";

const id = z.string().trim().min(1).max(250);

export const campaignAudienceInput = z.object({
  audienceType: z.enum([
    "ALL_USERS",
    "COURSE",
    "MEMBERSHIP",
    "EVENT",
    "SELECTED_USERS",
    "MANUAL_EMAILS",
    "COMBINED",
  ]),
  audienceId: id.nullish(),
  userIds: z.array(id).max(1000).optional(),
  manualEmails: z.string().max(30000).optional(),
  groups: z
    .array(
      z.object({
        type: z.enum(["COURSE", "MEMBERSHIP", "EVENT"]),
        id,
      })
    )
    .max(50)
    .optional(),
});

export type CampaignAudienceInput = z.infer<typeof campaignAudienceInput>;
