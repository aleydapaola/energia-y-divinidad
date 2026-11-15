import { pricingProjection } from "@/sanity/lib/projections";

export interface CatalogProduct {
  _id: string;
  title: string;
  slug?: { current?: string };
  productType?: string;
  shortDescription?: string;
  whatYouGet?: string[];
  coverUrl?: string;
  coverAlt?: string;
  fileContentTypes?: string[];
  price?: number;
  priceUSD?: number;
  isFree?: boolean;
}

const catalogFilter = `_type == "product" && published == true && status == "active" && productType in ["digital","ebook","audio","course"]`;

// Only public card metadata: never project file references or delivery URLs.
const catalogProjection = `{
  _id, title, slug, productType, shortDescription, whatYouGet,
  "coverUrl": images[0].asset->url,
  "coverAlt": images[0].alt,
  "fileContentTypes": array::unique(coalesce(privateDigitalFiles[].contentType, []) + coalesce(digitalFiles[].asset->mimeType, [])),
  ${pricingProjection}
}`;

export const PRODUCT_CATALOG_QUERY = `*[${catalogFilter}]${catalogProjection}`;

// Only editorial picks, in the order chosen in Studio; no unselected fillers.
export const HOME_PRODUCTS_QUERY = `*[${catalogFilter} && featured == true]
  | order(coalesce(displayOrder, 2147483647) asc, title asc, _id asc)
  [0...4]${catalogProjection}`;

export function productHref(product: CatalogProduct): string {
  return `/productos/${encodeURIComponent(product.slug?.current || product._id)}`;
}

export function productPrices(product: CatalogProduct): string[] {
  if (product.isFree) {
    return ["Gratis"];
  }
  return [
    product.price ? `${product.price.toLocaleString("es-CO")} COP · Bre-B / Global66` : "",
    product.priceUSD ? `${product.priceUSD} USD · PayPal` : "",
  ].filter(Boolean);
}

export function productFormat(product: CatalogProduct): string {
  const formats = (product.fileContentTypes || [])
    .filter((type) => typeof type === "string")
    .map((type) => {
      if (type === "application/pdf") {
        return "PDF";
      }
      if (type.startsWith("audio/")) {
        return "Audio";
      }
      if (type.startsWith("video/")) {
        return "Vídeo";
      }
      if (type.startsWith("image/")) {
        return "Imagen";
      }
      if (["application/zip", "application/x-zip-compressed"].includes(type)) {
        return "ZIP";
      }
      if (type === "application/epub+zip") {
        return "eBook";
      }
      return null;
    })
    .filter(Boolean);
  const fallback: Record<string, string> = {
    ebook: "Guía o eBook",
    audio: "Audio",
    course: "Curso",
  };
  return (
    [...new Set(formats)].join(" + ") || fallback[product.productType || ""] || "Contenido digital"
  );
}
