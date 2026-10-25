import { sanityFetch } from "@/sanity/lib/fetch";
import { LEGAL_PAGE_BY_SLUG_QUERY } from "@/sanity/lib/queries";

import { getPreviewLegalPage, type ReviewLegalSlug } from "./preview-legal-pages";

export async function getLegalPage(slug: ReviewLegalSlug) {
  const cmsPage = await sanityFetch<ReturnType<typeof getPreviewLegalPage>>({
    query: LEGAL_PAGE_BY_SLUG_QUERY,
    params: { slug },
    tags: ["page", "legal"],
  });
  return cmsPage || getPreviewLegalPage(slug);
}
