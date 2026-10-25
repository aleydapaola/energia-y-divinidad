import { sanityFetch } from "@/sanity/lib/fetch";
import { LEGAL_PAGE_BY_SLUG_QUERY } from "@/sanity/lib/queries";

import { getPreviewTermsPage } from "./preview-terms";

export async function getTermsPage() {
  const cmsPage = await sanityFetch<ReturnType<typeof getPreviewTermsPage>>({
    query: LEGAL_PAGE_BY_SLUG_QUERY,
    params: { slug: "terminos" },
    tags: ["page", "legal"],
  });
  return cmsPage || getPreviewTermsPage();
}
