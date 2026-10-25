import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import LegalPageContent from "@/components/legal/LegalPageContent";
import { getLegalPage } from "@/lib/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalPage("privacidad");

  return {
    title: page?.seo?.metaTitle || page?.title || "Política de Privacidad",
    description:
      page?.seo?.metaDescription ||
      "Conoce cómo protegemos y utilizamos tus datos personales en Energía y Divinidad.",
  };
}

export default async function PrivacidadPage() {
  const page = await getLegalPage("privacidad");

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
