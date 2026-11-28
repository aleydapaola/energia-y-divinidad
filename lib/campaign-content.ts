import { z } from "zod";

function allowedUrl(value: string, image = false) {
  try {
    const url = new URL(value);
    if (url.username || url.password || !["https:", "http:"].includes(url.protocol)) {
      return false;
    }
    if (!image) {
      return true;
    }
    const project = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
    return (
      url.origin === "https://cdn.sanity.io" &&
      Boolean(project && dataset) &&
      url.pathname.startsWith(`/images/${project}/${dataset}/`)
    );
  } catch {
    return false;
  }
}

const contentBlock = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("link"),
    label: z.string().trim().min(1).max(200),
    url: z
      .string()
      .trim()
      .max(2048)
      .refine((url) => allowedUrl(url), "El enlace debe usar HTTP o HTTPS"),
  }),
  z.object({
    type: z.literal("image"),
    alt: z.string().trim().min(1).max(240),
    url: z
      .string()
      .trim()
      .max(2048)
      .refine((url) => allowedUrl(url, true), "Usa una imagen pública de Sanity de este entorno"),
  }),
]);

export const campaignBlocks = z.array(contentBlock).max(20).default([]);
export type CampaignBlock = z.infer<typeof contentBlock>;

export const campaignMessage = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(30000),
  blocks: campaignBlocks,
});

export const campaignDraft = z.object({
  title: z.string().trim().max(200),
  subject: z.string().trim().max(200),
  body: z.string().trim().max(30000),
  blocks: campaignBlocks,
});
