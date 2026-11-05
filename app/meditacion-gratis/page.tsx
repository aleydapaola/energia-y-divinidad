import Image from "next/image";
import Link from "next/link";

import { NewsletterForm } from "@/components/newsletter/NewsletterForm";

import type { CaptureSource } from "@/lib/newsletter-capture-rules";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meditación gratis del Ángel de la Guarda | Aleyda · Energía y Divinidad",
  description:
    "Recibe la meditación del Ángel de la Guarda, guiada por Aleyda. Un regalo de 18 minutos al suscribirte a la newsletter de Energía y Divinidad.",
  alternates: { canonical: "/meditacion-gratis" },
};

export default async function FreeMeditationPage({
  searchParams,
}: {
  searchParams: Promise<{ origen?: string }>;
}) {
  const { origen } = await searchParams;
  const sources: Record<string, CaptureSource> = {
    invitacion: "invitation",
    instagram: "instagram",
    whatsapp: "whatsapp",
  };
  const source: CaptureSource = Object.hasOwn(sources, origen || "")
    ? sources[origen || ""]
    : "landing";
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f0f5] to-white font-dm-sans text-[#654177]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-5 py-5">
        <Link href="/" aria-label="Energía y Divinidad — inicio">
          <Image
            src="/images/EnergiaDinividadHeading.png"
            alt="Energía y Divinidad"
            width={200}
            height={50}
            priority
            className="h-auto w-40 sm:w-48"
          />
        </Link>
        <Link href="/" className="shrink-0 py-3 text-xs underline underline-offset-4 sm:text-sm">
          Conoce la web
        </Link>
      </header>
      <main>
        <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-5 md:grid-cols-2 md:items-center md:gap-16 md:py-14">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A4BAF]">
              Un regalo de Aleyda para ti
            </p>
            <h1 className="font-gazeta text-4xl leading-tight sm:text-5xl">
              Un momento para conectar contigo
            </h1>
            <p className="text-base leading-relaxed sm:text-lg">
              Recibe la <strong>meditación del Ángel de la Guarda</strong>, guiada por Aleyda, al
              suscribirte a nuestra newsletter.
            </p>
            <p className="text-sm leading-relaxed">
              Un audio de 18 minutos y 43 segundos que puedes escuchar a tu ritmo o descargar para
              otro momento. Busca un lugar tranquilo y regálate este espacio.
            </p>
            <div className="flex items-center gap-4 border-t border-[#8A4BAF]/15 pt-5">
              <Image
                src="/images/Aleyda-home-comprimida.jpeg"
                alt="Aleyda Paola"
                width={72}
                height={72}
                className="h-16 w-16 rounded-full object-cover"
              />
              <p className="text-sm leading-relaxed">
                <strong className="block">Con amor y luz, Aleyda Paola</strong>Energía y Divinidad
              </p>
            </div>
          </div>
          <section
            aria-labelledby="meditation-signup-title"
            className="min-w-0 rounded-2xl border border-[#8A4BAF]/15 bg-white p-5 shadow-sm sm:p-8"
          >
            <h2 id="meditation-signup-title" className="mb-2 font-gazeta text-2xl">
              ¿Dónde te enviamos el regalo?
            </h2>
            <p className="mb-5 text-sm leading-relaxed">
              Recibirás también novedades de cursos, eventos, talleres y ofertas. Puedes darte de
              baja cuando quieras.
            </p>
            <NewsletterForm source={source} variant="inline" />
          </section>
        </section>
        <section className="border-t border-[#8A4BAF]/10 bg-white px-5 py-10">
          <div className="mx-auto max-w-3xl space-y-6">
            <h2 className="font-gazeta text-2xl">Así recibirás tu meditación</h2>
            <ol className="grid gap-5 text-sm leading-relaxed sm:grid-cols-3">
              <li>
                <strong className="mb-1 block text-[#8A4BAF]">1. Deja tu correo</strong>Completa el
                formulario y acepta la suscripción.
              </li>
              <li>
                <strong className="mb-1 block text-[#8A4BAF]">2. Confirma la suscripción</strong>
                Abre el correo de confirmación. Si no aparece, revisa Spam o Promociones.
              </li>
              <li>
                <strong className="mb-1 block text-[#8A4BAF]">3. Disfruta tu regalo</strong>
                Recibirás el enlace al reproductor y la descarga. No necesitas una cuenta.
              </li>
            </ol>
            <p className="text-xs leading-relaxed">
              ¿Ya estás en nuestra lista? Conservaremos una sola suscripción y no repetiremos el
              regalo. Si te diste de baja, te indicaremos cómo volver a suscribirte voluntariamente.
            </p>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-5 py-8 text-xs">
        <Link href="/privacidad" className="py-2 underline">
          Política de Privacidad
        </Link>
        <Link href="/cookies" className="py-2 underline">
          Cookies y almacenamiento
        </Link>
        <a href="mailto:contacto@energiaydivinidad.com" className="break-all py-2 underline">
          contacto@energiaydivinidad.com
        </a>
      </footer>
    </div>
  );
}
