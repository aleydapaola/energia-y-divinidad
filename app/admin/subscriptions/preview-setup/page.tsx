import { notFound } from "next/navigation";

import { PreparePlans } from "./PreparePlans";

export default function PreviewMembershipSetup() {
  if (process.env.VERCEL_ENV !== "preview" || process.env.PAYPAL_ENVIRONMENT !== "sandbox") {
    notFound();
  }
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl">Membresías — preparación exclusiva de Preview</h1>
      <PreparePlans />
    </main>
  );
}
