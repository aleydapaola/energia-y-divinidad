import { client } from "@/sanity/lib/client";
import { pricingProjection } from "@/sanity/lib/projections";

export type PurchaseKind = "session" | "pack" | "event" | "product" | "course";
export const SESSION_PACK_PRICES = { COP: 1850000, USD: 450 }; // Existing published offer, unchanged.
export async function quoteCatalogItem(input: {
  productType: string;
  productId: string;
  currency: "COP" | "USD";
  seats?: number;
  scheduledAt?: string;
}) {
  const { productType, productId, currency } = input;
  if (!["session", "pack", "event", "product", "course"].includes(productType)) {
    throw new Error("Tipo de compra no disponible en este checkout.");
  }
  const type = productType === "session" || productType === "pack" ? "sessionConfig" : productType;
  const doc = await client.withConfig({ useCdn: false }).fetch<{
    _id: string;
    title: string;
    price?: number;
    priceUSD?: number;
    productType?: string;
    earlyBirdPrice?: number;
    earlyBirdDeadline?: string;
    eventDate?: string;
    maxPerBooking?: number;
    capacity?: number;
    visibility?: string;
  } | null>(`*[_type == $type && published == true && !(status in ["paused", "sold_out", "discontinued", "coming_soon", "inactive"]) && !(_id in path("drafts.**")) && ($type == "sessionConfig" || _id == $id)][0]{_id,title,${pricingProjection},productType,earlyBirdPrice,earlyBirdDeadline,eventDate,maxPerBooking,capacity,visibility}`, { type, id: productId });
  if (!doc || doc.visibility === "private") {
    throw new Error("Producto no disponible.");
  }
  if (
    productType === "product" &&
    !["digital", "ebook", "audio", "course"].includes(doc.productType || "")
  ) {
    throw new Error("Este checkout es para productos digitales.");
  }
  let amount =
    productType === "pack"
      ? SESSION_PACK_PRICES[currency]
      : currency === "COP"
        ? doc.price
        : doc.priceUSD;
  let scheduledAt = productType === "pack" ? null : input.scheduledAt || null;
  let seats = 1;
  if (productType === "event") {
    seats = input.seats ?? 1;
    if (!Number.isInteger(seats) || seats < 1 || seats > (doc.maxPerBooking || 10)) {
      throw new Error("Número de plazas inválido.");
    }
    if (!doc.eventDate || Date.parse(doc.eventDate) <= Date.now()) {
      throw new Error("Este evento ya no admite compras.");
    }
    scheduledAt = doc.eventDate;
    if (
      currency === "COP" &&
      doc.earlyBirdPrice != null &&
      doc.earlyBirdDeadline &&
      Date.parse(doc.earlyBirdDeadline) > Date.now()
    ) {
      amount = doc.earlyBirdPrice;
    }
    amount = amount === undefined ? undefined : amount * seats;
  }
  if (
    productType === "session" &&
    scheduledAt &&
    (!Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt) <= Date.now())
  ) {
    throw new Error("Selecciona una fecha futura válida.");
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Precio en ${currency} no configurado.`);
  }
  return {
    amount,
    capacity: doc.capacity,
    productId: doc._id,
    productName: productType === "pack" ? "Pack de 8 Sesiones" : doc.title,
    orderType: (productType === "pack" || productType === "session"
      ? "SESSION"
      : productType.toUpperCase()) as "SESSION" | "EVENT" | "PRODUCT" | "COURSE",
    metadata: {
      productType,
      scheduledAt,
      seats,
      scheduleAfterPayment: productType === "session" && !scheduledAt,
      ...(productType === "course"
        ? { courseIds: [doc._id], items: [{ id: doc._id, name: doc.title, price: amount }] }
        : {}),
    },
  };
}
