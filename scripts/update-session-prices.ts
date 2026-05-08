/**
 * Script para actualizar precios y duración de la sesión en Sanity
 *
 * Ejecutar con: npx ts-node scripts/update-session-prices.ts
 */

import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token = process.env.SANITY_API_TOKEN;

console.log("📌 Proyecto Sanity:", projectId);
console.log("🔑 Token presente:", token ? "Sí (" + token.substring(0, 10) + "...)" : "No");

if (!projectId || !token) {
  console.error("❌ Falta NEXT_PUBLIC_SANITY_PROJECT_ID o SANITY_API_TOKEN en .env.local");
  process.exit(1);
}

const client = createClient({
  projectId: projectId,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  token: token,
  useCdn: false,
});

async function updateSessionPrices() {
  console.log("🔮 Buscando configuración de sesión en Sanity...\n");

  try {
    const existing = await client.fetch(
      `*[_type == "sessionConfig"][0]{ _id, title, duration, price, priceUSD, priceEUR }`
    );

    if (!existing) {
      console.error("❌ No se encontró ningún documento sessionConfig en Sanity.");
      console.log("   Ejecuta primero: npx ts-node scripts/create-session-config.ts");
      process.exit(1);
    }

    console.log("📋 Valores actuales:");
    console.log("   ID:", existing._id);
    console.log("   Título:", existing.title);
    console.log("   Duración:", existing.duration, "minutos");
    console.log("   Precio COP:", existing.price?.toLocaleString("es-CO"));
    console.log("   Precio USD:", existing.priceUSD);
    console.log("   Precio EUR:", existing.priceEUR);

    console.log("\n🔄 Actualizando precios y duración...");

    const result = await client
      .patch(existing._id)
      .set({
        duration: 120,
        price: 350000,
        priceUSD: 100,
        priceEUR: 100,
      })
      .commit();

    console.log("\n✅ Documento actualizado exitosamente!");
    console.log("\n📋 Nuevos valores:");
    console.log("   Duración:", result.duration, "minutos");
    console.log("   Precio COP:", result.price?.toLocaleString("es-CO"));
    console.log("   Precio USD:", result.priceUSD);
    console.log("   Precio EUR:", result.priceEUR);
  } catch (error) {
    console.error("❌ Error al actualizar:", error);
    process.exit(1);
  }
}

updateSessionPrices();
