type OrderStatus = { paymentStatus: string; [key: string]: unknown };

function pause(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
    if (signal.aborted) {
      finish();
    }
  });
}

// Only reads the existing order. Never repeats a capture or creates another purchase.
export async function pollPaymentStatus(
  reference: string,
  signal: AbortSignal,
  attempts = 12,
  interval = 2500
): Promise<OrderStatus | null> {
  for (let attempt = 0; attempt < attempts && !signal.aborted; attempt++) {
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(reference)}/status`, {
        cache: "no-store",
        signal,
      });
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return null;
      }
      if (response.ok) {
        const data: OrderStatus = await response.json();
        if (signal.aborted) {
          return null;
        }
        if (["COMPLETED", "FAILED", "CANCELLED"].includes(data.paymentStatus)) {
          return data;
        }
      }
    } catch {
      if (signal.aborted) {
        return null;
      }
      // A temporary network error does not turn an unconfirmed payment into a failed payment.
    }
    if (attempt + 1 < attempts) {
      await pause(interval, signal);
    }
  }
  return null;
}
