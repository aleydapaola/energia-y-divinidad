import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluate, parse } from "groq-js";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { loadMembership } from "./helpers/membership-loader.mjs";

const catalog = loadMembership("lib/digital-products/catalog.ts", {
  "@/sanity/lib/projections": loadMembership("sanity/lib/projections.ts"),
});
const { HomeProducts } = loadMembership("components/products/HomeProducts.tsx", {
  "@/lib/digital-products/catalog": catalog,
  "next/link": { default: ({ children, ...props }) => React.createElement("a", props, children) },
  "next/image": { default: ({ sizes: _sizes, ...props }) => React.createElement("img", props) },
});
const product = (id, fields = {}) => ({
  _id: id,
  _type: "product",
  title: id,
  productType: "digital",
  published: true,
  status: "active",
  price: 80000,
  priceUSD: 20,
  slug: { current: id },
  privateDigitalFiles: [
    { contentType: "application/pdf", internalFileRef: "private-ref" },
    { contentType: "audio/wav", internalFileRef: "other-private-ref" },
  ],
  ...fields,
});
async function query(source, dataset) {
  return (await evaluate(parse(source), { dataset })).get();
}

test("home prioritizes editorial picks, orders them and fills at most three eligible products", async () => {
  const dataset = [
    product("fallback"),
    product("pick-later", { featured: true, displayOrder: 2 }),
    product("pick-first", { featured: true, displayOrder: 1 }),
    product("another-fallback"),
    product("hidden", { published: false, featured: true, displayOrder: 0 }),
    product("inactive", { status: "discontinued", featured: true }),
    product("physical", { productType: "physical", featured: true }),
  ];
  const results = await query(catalog.HOME_PRODUCTS_QUERY, dataset);
  assert.deepEqual(
    results.map((p) => p._id),
    ["pick-first", "pick-later", "another-fallback"]
  );
  assert.equal(new Set(results.map((p) => p._id)).size, 3);
  assert.doesNotMatch(JSON.stringify(results), /private-ref|internalFileRef/);
  assert.equal(catalog.productFormat(results[0]), "PDF + Audio");
});

test("zero through three products hide or render the exact available number of cards and routes", async () => {
  for (let count = 0; count <= 3; count++) {
    const products = await query(
      catalog.HOME_PRODUCTS_QUERY,
      Array.from({ length: count }, (_, i) => product(`product-${i}`))
    );
    const html = renderToStaticMarkup(React.createElement(HomeProducts, { products }));
    assert.equal((html.match(/<article/g) || []).length, count);
    assert.equal(html.includes('href="/productos"'), count > 0);
    assert.equal(html.includes("Productos digitales"), count > 0);
    for (let i = 0; i < count; i++) {
      assert.ok(html.includes(`href="/productos/product-${i}"`));
      assert.ok(html.includes("80.000 COP · Bre-B / Global66"));
      assert.ok(html.includes("20 USD · PayPal"));
    }
  }
});

test("home and catalog resolve the same nested and legacy prices and show the declared inclusion", async () => {
  const dataset = [
    product("nested", {
      price: 1,
      priceUSD: 2,
      pricing: { price: 90000, priceUSD: 29 },
      whatYouGet: ["PDF y audio de práctica"],
    }),
    product("legacy"),
  ];
  const home = await query(catalog.HOME_PRODUCTS_QUERY, dataset);
  const listing = await query(catalog.PRODUCT_CATALOG_QUERY, dataset);
  for (const item of home) {
    assert.deepEqual(
      catalog.productPrices(item),
      catalog.productPrices(listing.find((p) => p._id === item._id))
    );
  }
  assert.deepEqual(catalog.productPrices(home.find((p) => p._id === "nested")), [
    "90.000 COP · Bre-B / Global66",
    "29 USD · PayPal",
  ]);
  const html = renderToStaticMarkup(React.createElement(HomeProducts, { products: home }));
  assert.ok(html.includes("PDF y audio de práctica"));
  assert.equal(
    catalog.productFormat({ productType: "ebook", fileContentTypes: [null] }),
    "Guía o eBook"
  );
});
