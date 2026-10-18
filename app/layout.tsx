import { Open_Sans, Roboto_Slab, Playfair_Display, DM_Sans } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";

import type { Metadata, Viewport } from "next";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  display: "swap",
});

const rightland = localFont({
  src: "../fonts/Rightland 400.otf",
  variable: "--font-rightland",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const gazetaItalic = localFont({
  src: "../public/fonts/fonnts.com-715946/fonts/fonnts.com-gazetaitalic.otf",
  variable: "--font-gazeta-italic",
  display: "swap",
  weight: "700",
});

const ukijDiwani = localFont({
  src: "../public/fonts/UKIJDiT.ttf",
  variable: "--font-ukij-diwani",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Energía y Divinidad - Canalización y Sanación",
  description: "Sesiones de canalización, chamanismo y terapia holística con Aleyda Vargas",
  keywords: ["canalización", "chamanismo", "sanación", "terapia holística", "energía"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${openSans.variable} ${robotoSlab.variable} ${rightland.variable} ${playfairDisplay.variable} ${dmSans.variable} ${gazetaItalic.variable} ${ukijDiwani.variable}`}
    >
      <body className="font-sans antialiased">
        {process.env.VERCEL_ENV === "preview" && (
          <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
            Entorno de pruebas. No realices pagos ni transferencias reales.
          </div>
        )}
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
