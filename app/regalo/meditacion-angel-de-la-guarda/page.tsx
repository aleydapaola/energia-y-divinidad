import Image from "next/image";

import { MeditationGiftPlayer } from "@/components/newsletter/MeditationGiftPlayer";
import { newsletterGiftConfiguration } from "@/lib/newsletter-gift-config";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tu meditación del Ángel de la Guarda | Energía y Divinidad",
  robots: { index: false, follow: false },
};

export default function MeditationGiftPage() {
  const config = newsletterGiftConfiguration();
  const available = config.enabled && !!config.giftUrl;
  return (
    <main className="min-h-screen bg-[#f8f0f5] px-5 py-10 text-center">
      <a
        href={config.appUrl}
        className="mx-auto mb-8 block w-[200px]"
        aria-label="Energía y Divinidad — inicio"
      >
        <Image
          src="/images/logoNoBackground.png"
          alt="Energía y Divinidad"
          width={200}
          height={200}
          priority
        />
      </a>
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <p className="mb-3 text-sm font-semibold text-[#8A4BAF]">Un regalo para ti</p>
        <h1 className="mb-5 text-3xl font-semibold text-[#654177]">
          Meditación del Ángel de la Guarda
        </h1>
        {available ? (
          <>
            <p className="mb-6 leading-relaxed text-gray-600">
              Busca un lugar tranquilo, acomódate y regálate este momento para conectar contigo.
              Puedes escuchar la meditación aquí o descargarla para otro momento.
            </p>
            <p className="mb-6 text-sm text-gray-500">18 min 43 s · Audio M4A · 9,3 MB</p>
            <MeditationGiftPlayer />
          </>
        ) : (
          <p role="status" className="text-gray-600">
            La meditación no está disponible en este momento. Vuelve a intentarlo más tarde o
            escribe a contacto@energiaydivinidad.com.
          </p>
        )}
        <p className="mt-8 text-sm text-gray-500">
          Con amor y luz,
          <br />
          <strong className="text-[#8A4BAF]">Aleyda Paola</strong>
        </p>
      </section>
    </main>
  );
}
