/** Shared metadata only. Private storage credentials never belong in Studio. */
export const DEFAULT_MAX_PRODUCT_FILE_BYTES = 2 * 1024 * 1024 * 1024;
export const PRODUCT_FILE_PREFIX = "digital-products/";

export type PrivateProductFile = {
  _key: string;
  title?: string;
  description?: string;
  pathname?: string;
  originalFilename?: string;
  contentType?: string;
  size?: number;
};

export function productFilePrefix(dataset: string, productId: string) {
  return `${PRODUCT_FILE_PREFIX}${dataset}/${productId.replace(/^drafts\./, "")}/`;
}

export function validProductId(id: unknown): id is string {
  return typeof id === "string" && /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,149}$/.test(id);
}

export function safeFilename(name: string) {
  return name.replace(/[\u0000-\u001f\u007f/\\]/g, "_").slice(0, 180) || "archivo";
}

export function attachmentHeader(name: string) {
  const filename = safeFilename(name);
  const ascii = filename.replace(/[^\x20-\x7e]|[";]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16)}`)}`;
}
