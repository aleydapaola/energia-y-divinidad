import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import LegalPageContent from "@/components/legal/LegalPageContent";
import { getLegalPage } from "@/lib/legal-pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalPage("cookies");

  return {
    title: page?.seo?.metaTitle || page?.title || "Política de Cookies",
    description:
      page?.seo?.metaDescription ||
      "Información sobre el uso de cookies en el sitio web de Energía y Divinidad.",
  };
}

export default async function CookiesPage() {
  const page = await getLegalPage("cookies");

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
          <section className="mx-auto mt-8 max-w-4xl rounded-xl bg-white p-6 text-sm leading-relaxed text-gray-700 sm:p-8">
            <h2 className="mb-3 text-xl font-semibold text-[#654177]">
              Preferencias de la invitación a la newsletter
            </h2>
            <p>
              Al cerrar la invitación guardamos una preferencia durante 14 días. Tras solicitar la
              suscripción, la ocultamos durante 30 días; si la dirección ya está suscrita, durante
              un año. No guardamos el correo en el navegador. La variante de presentación y los
              avisos ya contados se conservan en el almacenamiento de la pestaña para no repetirlos
              durante la sesión. Si este almacenamiento está bloqueado, la invitación automática no
              aparece. Puedes borrar estas preferencias desde los ajustes del navegador.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
