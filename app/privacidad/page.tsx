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
          <section className="mx-auto mt-8 max-w-4xl space-y-4 rounded-xl bg-white p-6 sm:p-8 text-gray-700">
            <h2 className="text-xl font-semibold text-[#654177]">
              Newsletter y protección del registro
            </h2>
            <p>
              Este formulario de alta requiere aceptar la suscripción a la newsletter junto con los
              Términos y Condiciones y esta Política de Privacidad, mediante una única casilla que
              aparece sin marcar. La cuenta se crea al elegir «Crear cuenta y suscribirme».
              Guardamos la fecha, el origen y el texto de la autorización. La suscripción se activa
              al verificar el correo de la cuenta, sin una segunda confirmación de newsletter. El
              formulario independiente de newsletter mantiene su confirmación por correo.
            </p>
            <p>
              Utilizamos Mailchimp para gestionar las suscripciones y Resend para entregar el regalo
              de bienvenida. Puedes retirar tu autorización mediante el enlace de baja de los
              correos sin perder el acceso a tu cuenta ni a tus compras. Las bajas anteriores se
              conservan y requieren reinscripción voluntaria.
            </p>
            <p>
              Para reducir registros y correos automatizados utilizamos Cloudflare Turnstile y
              límites de solicitudes. Turnstile comprueba señales técnicas del navegador; el
              servidor valida su resultado. Los contadores temporales usan identificadores mediante
              HMAC en lugar de guardar la dirección IP o el correo en claro, y se eliminan al
              caducar mediante la tarea diaria. Estos controles protegen el registro y el reenvío de
              la verificación.
            </p>
            <p>
              La prueba de autorización queda vinculada a la cuenta para gestionar y acreditar tu
              solicitud. Un registro de consentimiento anterior no autoriza nuevos envíos después de
              una baja. Puedes consultar o solicitar la supresión de tus datos mediante
              contacto@energiaydivinidad.com, sin perjuicio de la conservación que resulte
              legalmente exigible.
            </p>
            <p className="text-sm">
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacidad de Cloudflare
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
