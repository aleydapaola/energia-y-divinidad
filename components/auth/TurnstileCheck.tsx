"use client";

import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (node: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let loading: Promise<void> | null = null;
function loadTurnstile() {
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        loading = null;
        reject(Error("Unavailable"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

export function TurnstileCheck({
  action,
  onToken,
  resetKey,
}: {
  action: "register" | "resend-verification";
  onToken: (token: string) => void;
  resetKey: number;
}) {
  const node = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  callback.current = onToken;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!sitekey) {
      return;
    }
    let active = true;
    loadTurnstile()
      .then(() => {
        if (active) {
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setError("No se pudo cargar la comprobación. Revisa tu conexión y reintenta.");
        }
      });
    return () => {
      active = false;
    };
  }, [retryCount, sitekey]);

  useEffect(() => {
    callback.current("");
    if (!ready || !node.current || !window.turnstile || !sitekey) {
      return;
    }
    setError("");
    const widget = window.turnstile.render(node.current, {
      sitekey,
      action,
      language: "es",
      theme: "light",
      size: "flexible",
      callback: (token: string) => {
        callback.current(token);
        setError("");
      },
      "expired-callback": () => callback.current(""),
      "error-callback": () => {
        callback.current("");
        setError("No se pudo cargar la comprobación. Reintenta o recarga la página.");
      },
    });
    return () => {
      window.turnstile?.remove(widget);
    };
  }, [action, ready, resetKey, retryCount, sitekey]);

  if (!sitekey) {
    return (
      <p role="alert" className="text-sm text-gray-600">
        La protección del formulario todavía no está disponible. Inténtalo más tarde.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div ref={node} aria-label="Comprobación de seguridad" />
      {error && (
        <div role="alert" className="text-sm text-red-600">
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => {
              setError("");
              setRetryCount((value) => value + 1);
            }}
          >
            Reintentar comprobación
          </button>
        </div>
      )}
      <p className="text-xs text-gray-500">
        Protegido frente a registros automatizados con Cloudflare Turnstile.{" "}
        <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">
          Privacidad
        </a>
      </p>
    </div>
  );
}

export function WebsiteTrap({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="registration-website">Deja este campo vacío</label>
      <input
        id="registration-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
