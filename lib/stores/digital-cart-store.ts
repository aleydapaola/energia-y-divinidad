"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface DigitalCartItem {
  id: string;
  slug: string;
  title: string;
  price?: number;
  priceUSD?: number;
  driveDelivery: boolean;
}

interface DigitalCartState {
  items: DigitalCartItem[];
  addItem: (item: DigitalCartItem) => void;
  removeItem: (id: string) => void;
}

export const useDigitalCartStore = create<DigitalCartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set(({ items }) => {
          if (items.some((existing) => existing.id === item.id)) {
            return { items };
          }
          return { items: [...items, item] };
        }),
      removeItem: (id) => set(({ items }) => ({
        items: items.filter((item) => item.id !== id),
      })),
    }),
    {
      name: "digital-products-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ items }) => ({ items }),
    }
  )
);
