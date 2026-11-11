"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import {
  captureContext,
  captureMetric,
  rememberNewsletterRequest,
} from "@/lib/newsletter-capture-client";
import {
  NEWSLETTER_CONSENT_TEXT,
  NEWSLETTER_CONSENT_VERSION,
  type CaptureSource,
} from "@/lib/newsletter-capture-rules";

interface NewsletterFormProps {
  variant?: "footer" | "inline" | "card";
  source?: CaptureSource;
  className?: string;
}

export function NewsletterForm({
  variant = "footer",
  source = "footer",
  className = "",
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [signupUrl, setSignupUrl] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [website, setWebsite] = useState("");
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const element = form.current;
    if (!element || !("IntersectionObserver" in window)) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          captureMetric(source, "form");
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [source]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "loading") {
      return;
    }
    if (!accepted) {
      setStatus("error");
      setMessage("Acepta la suscripción a la newsletter antes de continuar.");
      return;
    }
    setStatus("loading");
    setMessage("");
    setSignupUrl(null);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          acceptedNewsletter: accepted,
          consentVersion: NEWSLETTER_CONSENT_VERSION,
          ...captureContext(source),
          website,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
        setEmail("");
        rememberNewsletterRequest(data.subscriptionStatus === "subscribed");
      } else {
        setStatus("error");
        setMessage(
          data.error || "No hemos podido completar tu solicitud. Reintenta en unos minutos."
        );
        setSignupUrl(data.signupUrl || null);
      }
    } catch {
      setStatus("error");
      setMessage("No hay conexión. Tu solicitud no se ha confirmado; vuelve a intentarlo.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`rounded-xl border border-[#4944a4]/20 bg-[#eef1fa] p-5 ${className}`}
      >
        <CheckCircle className="mb-3 h-6 w-6 text-[#4944a4]" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-[#654177]">{message}</p>
        <p className="mt-3 text-xs text-[#654177]">
          Puedes cerrar esta página. No necesitas crear una cuenta.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "card" ? `rounded-2xl bg-[#f8f0f5] p-6 sm:p-8 ${className}` : className
      }
    >
      {variant === "card" && (
        <h3 className="mb-4 font-gazeta text-2xl text-[#654177]">Un regalo de Aleyda para ti</h3>
      )}
      <form ref={form} data-newsletter-form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={`${id}-email`} className="mb-2 block text-sm font-medium text-[#654177]">
            Tu correo electrónico
          </label>
          <input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={(event) => setEmail(event.target.value.trim().toLowerCase())}
            placeholder="tu@correo.com"
            required
            disabled={status === "loading"}
            className="min-h-12 w-full min-w-0 rounded-xl border border-[#8A4BAF]/25 bg-white px-4 py-3 text-base text-[#654177] outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20 disabled:opacity-50"
          />
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-[#654177]">
          <input
            type="checkbox"
            required
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            disabled={status === "loading"}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#4944a4]"
          />
          <span>
            {NEWSLETTER_CONSENT_TEXT}{" "}
            <Link
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Política de Privacidad
            </Link>
            .
          </span>
        </label>
        <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
          <label htmlFor={`${id}-website`}>Deja este campo vacío</label>
          <input
            id={`${id}-website`}
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !accepted}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4944a4] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d3a8a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4944a4] disabled:opacity-60"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Enviando solicitud…
            </>
          ) : (
            "Recibir mi meditación y suscribirme"
          )}
        </button>
        {status === "error" && (
          <div role="alert" className="text-sm text-red-700">
            <p>{message}</p>
            {signupUrl && (
              <a
                href={signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block underline"
              >
                Volver a suscribirme
              </a>
            )}
          </div>
        )}
        <p className="text-xs leading-relaxed text-[#654177]/80">
          Confirma tu correo para recibir el regalo. Gratis y sin crear una cuenta. Si ya estás en
          la lista, no duplicaremos tu suscripción.
        </p>
      </form>
    </div>
  );
}
