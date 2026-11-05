"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { captureMetric } from "@/lib/newsletter-capture-client";
import {
  CAPTURE_EXPERIMENT,
  INVITATION_DISMISS_MS,
  invitationEligible,
  invitationPage,
  type CaptureVariant,
} from "@/lib/newsletter-capture-rules";
import { useCartStore } from "@/lib/stores/cart-store";

export function NewsletterInvitation() {
  const path = usePathname();
  const { status } = useSession();
  const cartOpen = useCartStore((state) => state.isOpen);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
    if (!invitationPage(path) || status !== "unauthenticated") {
      return;
    }
    let variant: CaptureVariant;
    try {
      const saved = sessionStorage.getItem(CAPTURE_EXPERIMENT);
      variant = crypto.getRandomValues(new Uint8Array(1))[0] < 128 ? "control" : "invitation";
      if (saved === "control" || saved === "invitation") {
        variant = saved;
      }
      sessionStorage.setItem(CAPTURE_EXPERIMENT, variant);
    } catch {
      return;
    }
    captureMetric("invitation", "visit");
    const started = Date.now();
    let shown = false;
    function check() {
      if (document.visibilityState !== "visible") {
        return;
      }
      const focused = document.activeElement;
      const editing = focused?.matches("input, textarea, select, [contenteditable=true]") || false;
      if (editing) {
        setOpen(false);
      }
      const progress =
        window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      try {
        if (
          !shown &&
          !sessionStorage.getItem(`${CAPTURE_EXPERIMENT}:shown`) &&
          invitationEligible({
            path,
            variant,
            elapsed: Date.now() - started,
            progress,
            dismissedUntil: Number(localStorage.getItem("eyd-newsletter-dismissed-until") || 0),
            requestedUntil: Number(localStorage.getItem("eyd-newsletter-requested-until") || 0),
            now: Date.now(),
            authenticated: status !== "unauthenticated",
            busy: cartOpen || editing || !!document.querySelector('[role="dialog"]'),
          })
        ) {
          shown = true;
          sessionStorage.setItem(`${CAPTURE_EXPERIMENT}:shown`, "1");
          setOpen(true);
          captureMetric("invitation", "invitation");
        }
      } catch {
        /* No interruption when preferences cannot be read. */
      }
    }
    const timer = window.setInterval(check, 1000);
    const hide = () => setOpen(false);
    window.addEventListener("eyd-newsletter-requested", hide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("eyd-newsletter-requested", hide);
    };
  }, [path, status, cartOpen]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(
        "eyd-newsletter-dismissed-until",
        String(Date.now() + INVITATION_DISMISS_MS)
      );
    } catch {
      /* No-op. */
    }
  }
  if (!open || cartOpen || status !== "unauthenticated" || !invitationPage(path)) {
    return null;
  }
  return (
    <aside
      aria-labelledby="newsletter-invitation-title"
      className="fixed bottom-24 left-4 right-4 z-40 rounded-2xl border border-[#8A4BAF]/20 bg-white p-5 shadow-xl sm:left-auto sm:right-24 sm:w-[340px] sm:p-6"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar invitación a la meditación"
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-[#654177] hover:bg-[#f8f0f5]"
      >
        <X className="h-5 w-5" />
      </button>
      <p className="pr-6 text-xs font-semibold uppercase tracking-wider text-[#8A4BAF]">
        Un regalo de Aleyda
      </p>
      <h2 id="newsletter-invitation-title" className="mt-2 pr-4 font-gazeta text-xl text-[#654177]">
        Un momento para ti
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[#654177]">
        Recibe la meditación del Ángel de la Guarda al suscribirte a nuestra newsletter.
      </p>
      <Link
        href="/meditacion-gratis?origen=invitacion"
        onClick={dismiss}
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#4944a4] px-5 py-2 text-sm font-semibold text-white hover:bg-[#3d3a8a]"
      >
        Quiero conocer el regalo
      </Link>
    </aside>
  );
}
