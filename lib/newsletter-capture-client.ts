import {
  CAPTURE_EXPERIMENT,
  type CaptureSource,
  type CaptureVariant,
} from "./newsletter-capture-rules";

export function captureContext(source: CaptureSource) {
  let variant: CaptureVariant = "none";
  try {
    const saved = sessionStorage.getItem(CAPTURE_EXPERIMENT);
    if (saved === "control" || saved === "invitation") {
      variant = saved;
    }
  } catch {
    /* Storage may be disabled. */
  }
  return {
    source,
    variant,
    device: window.matchMedia("(max-width: 767px)").matches
      ? ("mobile" as const)
      : ("desktop" as const),
  };
}

export function captureMetric(source: CaptureSource, event: "visit" | "form" | "invitation") {
  try {
    const context = captureContext(source);
    const key = [
      CAPTURE_EXPERIMENT,
      new Date().toISOString().slice(0, 10),
      source,
      event,
      context.variant,
      context.device,
    ].join(":");
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, "1");
    void fetch("/api/newsletter/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...context, event }),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) {
          sessionStorage.removeItem(key);
        }
      })
      .catch(() => sessionStorage.removeItem(key));
  } catch {
    /* Optional counters must not obstruct navigation or signup. */
  }
}

export function rememberNewsletterRequest(subscribed: boolean) {
  try {
    localStorage.setItem(
      "eyd-newsletter-requested-until",
      String(Date.now() + (subscribed ? 365 : 30) * 86400000)
    );
    window.dispatchEvent(new Event("eyd-newsletter-requested"));
  } catch {
    /* Signup remains successful without storage. */
  }
}
