import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import LegalPageContent from "@/components/legal/LegalPageContent";
import { getTermsPage } from "@/lib/terms";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getTermsPage();

  return {
    title: page?.seo?.metaTitle || page?.title || "Términos y Condiciones",
    description:
      page?.seo?.metaDescription ||
      "Lee los términos y condiciones de uso de los servicios de Energía y Divinidad.",
    robots: page?._id === "eyd-preview-terms-review" ? { index: false, follow: false } : undefined,
  };
}

export default async function TerminosPage() {
  const page = await getTermsPage();

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
