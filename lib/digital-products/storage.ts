import { DEFAULT_MAX_PRODUCT_FILE_BYTES } from "./files";

/** Deliberately no fallback from Preview to a Production store. */
export function productStorageConfig() {
  const production = process.env.VERCEL_ENV === "production";
  const token = production
    ? process.env.DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN
    : process.env.PREVIEW_DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN;
  const configuredLimit = Number(process.env.DIGITAL_PRODUCTS_MAX_FILE_BYTES);
  const maximumSizeInBytes =
    Number.isSafeInteger(configuredLimit) && configuredLimit > 0
      ? configuredLimit
      : DEFAULT_MAX_PRODUCT_FILE_BYTES;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  if (
    !dataset ||
    (!production && (dataset !== "preview" || dataset !== process.env.PREVIEW_SANITY_DATASET))
  ) {
    throw new Error("Los archivos requieren el dataset aislado de Preview.");
  }
  if (!token || (!production && token === process.env.DIGITAL_PRODUCTS_BLOB_READ_WRITE_TOKEN)) {
    throw new Error("Falta configurar el almacenamiento privado de productos en este entorno.");
  }
  return { token, dataset, maximumSizeInBytes };
}
