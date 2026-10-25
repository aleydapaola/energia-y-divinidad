import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import LegalPageContent from "@/components/legal/LegalPageContent";
import { getLegalPage } from "@/lib/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalPage("aviso-legal");

  return {
    title: page?.seo?.metaTitle || page?.title || "Aviso Legal",
    description:
      page?.seo?.metaDescription ||
      "Información legal sobre Energía y Divinidad, incluyendo datos del titular y condiciones de uso.",
  };
}

export default async function AvisoLegalPage() {
  const page = await getLegalPage("aviso-legal");

  if (!page) {
    notFound();
  }

  return (
    <>
      <Header session={null} />
      <main className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <LegalPageContent
            title={page.title}
            content={page.content}
            lastUpdated={page.lastUpdated}
            version={page.version}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
