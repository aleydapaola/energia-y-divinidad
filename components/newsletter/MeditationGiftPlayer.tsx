"use client";

import { useState } from "react";

import { NEWSLETTER_GIFT_AUDIO_PATH } from "@/lib/newsletter-gift-links";

export function MeditationGiftPlayer() {
  return (
    <OnlineAudioPlayer
      src={NEWSLETTER_GIFT_AUDIO_PATH}
      label="Escuchar la Meditación del Ángel de la Guarda"
    />
  );
}

/** Shared with free products; the gift retains its source and existing controls. */
export function OnlineAudioPlayer({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="space-y-6">
      <audio
        className="w-full"
        controls
        controlsList="nodownload"
        preload="metadata"
        aria-label={label}
        src={src}
        onError={() => setFailed(true)}
        onCanPlay={() => setFailed(false)}
        onContextMenu={(event) => event.preventDefault()}
      >
        Tu navegador no permite reproducir este audio. Prueba con otro navegador actualizado.
      </audio>
      {failed && (
        <p role="alert" className="text-sm text-red-800">
          No se ha podido cargar el audio. Recarga la página o vuelve a intentarlo más tarde.
        </p>
      )}
      <p className="text-sm leading-relaxed text-gray-500">
        Pulsa reproducir para escucharla en línea. Puedes pausar y volver a este enlace cuando
        quieras.
      </p>
    </div>
  );
}
