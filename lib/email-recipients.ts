import { z } from "zod";

export function parseManualEmails(value: string): string[] {
  const emails = Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (emails.length === 0) {
    throw new Error("Escribe al menos una dirección de correo");
  }
  if (emails.length > 1000) {
    throw new Error("Puedes introducir hasta 1000 direcciones por campaña");
  }

  const invalid = emails.filter((email) => !z.string().email().safeParse(email).success);
  if (invalid.length > 0) {
    throw new Error(`Direcciones de correo no válidas: ${invalid.slice(0, 5).join(", ")}`);
  }

  return emails;
}
