import { Headphones, Mail, Download } from "lucide-react";

import { NewsletterForm } from "./NewsletterForm";

import type { CaptureSource } from "@/lib/newsletter-capture-rules";

export function MeditationSignup({ source = "home" }: { source?: CaptureSource }) {
  return (
    <section
      aria-labelledby={`meditation-gift-${source}`}
      className="bg-[#f8f0f5] px-5 py-12 sm:py-16"
    >
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 md:items-center md:gap-16">
        <div className="space-y-4 text-[#654177]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A4BAF]">
            Un regalo de Aleyda para ti
          </p>
          <h2
            id={`meditation-gift-${source}`}
            className="font-gazeta text-3xl leading-tight sm:text-4xl"
          >
            Regálate un momento de conexión
          </h2>
          <p className="text-base leading-relaxed">
            Recibe la meditación del Ángel de la Guarda, guiada por Aleyda, al unirte a nuestra
            newsletter.
          </p>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Headphones className="h-5 w-5 shrink-0" aria-hidden="true" />
              18 minutos para escuchar a tu ritmo
            </li>
            <li className="flex gap-3">
              <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
              Un enlace en tu correo al confirmar la suscripción
            </li>
            <li className="flex gap-3">
              <Download className="h-5 w-5 shrink-0" aria-hidden="true" />
              Reproduce el audio o descárgalo para otro momento
            </li>
          </ul>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#8A4BAF]/10 bg-white p-5 shadow-sm sm:p-7">
          <NewsletterForm source={source} variant="inline" />
        </div>
      </div>
    </section>
  );
}
