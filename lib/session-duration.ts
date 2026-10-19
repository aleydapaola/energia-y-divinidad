import { getSessionConfig } from "@/lib/sanity/queries/sessionConfig";

const DEFAULT_SESSION_DURATION_MINUTES = 90;

function isValidDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** Preserve the booked duration; legacy bookings use the session configuration. */
export async function resolveSessionDuration(storedDuration?: number | null): Promise<number> {
  if (isValidDuration(storedDuration)) {
    return storedDuration;
  }

  try {
    const config = await getSessionConfig();
    if (isValidDuration(config?.duration)) {
      return config.duration;
    }
  } catch {
    // A temporary CMS outage must not prevent a paid booking from being created.
  }

  return DEFAULT_SESSION_DURATION_MINUTES;
}
