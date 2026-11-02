"use client";

import { useState } from "react";

import { NEWSLETTER_GIFT_AUDIO_PATH } from "@/lib/newsletter-gift-links";

export function MeditationGiftPlayer() {
  const [failed, setFailed] = useState(false);
  return (
    <div className="space-y-6">
      <audio
        className="w-full"
        controls
        preload="metadata"
        aria-label="Escuchar la Meditación del Ángel de la Guarda"
        src={NEWSLETTER_GIFT_AUDIO_PATH}
        onError={() => setFailed(true)}
        onCanPlay={() => setFailed(false)}
      >
        Tu navegador no permite reproducir este audio. Puedes descargarlo con el botón de abajo.
      </audio>
      {failed && (
        <p role="alert" className="text-sm text-red-800">
          No se ha podido cargar el audio. Recarga la página o prueba el botón de descarga.
        </p>
      )}
      <a
        href={`${NEWSLETTER_GIFT_AUDIO_PATH}?download=1`}
        download="meditacion-angel-de-la-guarda.m4a"
        className="inline-block rounded-lg bg-[#8A4BAF] px-8 py-4 font-semibold text-white hover:bg-[#713d90] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#654177]"
      >
        Descargar la meditación
      </a>
      <p className="text-sm leading-relaxed text-gray-500">
        Pulsa reproducir para escucharla aquí. Para guardarla, usa «Descargar la meditación»; en
        algunos móviles podrás elegir «Guardar en Archivos» desde el menú del navegador.
      </p>
    </div>
  );
}
