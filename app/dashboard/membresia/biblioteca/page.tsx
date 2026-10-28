import { Loader2, Crown } from "lucide-react";
import { Suspense } from "react";

import { PremiumLibrary } from "@/components/membership/premium-library";
import { auth } from "@/lib/auth";
import { getMembershipStatus } from "@/lib/membership-access";
import { getPremiumContentForTier } from "@/lib/sanity/queries/membership";

export const metadata = {
  title: "Biblioteca Premium | Membresía",
  description: "Accede a todo el contenido premium exclusivo para miembros",
};

export default async function BibliotecaPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  // Obtener suscripción activa
  const membership = await getMembershipStatus(session.user.id);
  const subscription = membership.subscription;

  if (!subscription) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-[#e8d5e0]">
        <div className="text-4xl mb-4">🔒</div>
        <p className="text-[#654177] font-dm-sans">No tienes una membresía activa</p>
      </div>
    );
  }

  if (!membership.canAccessPremiumContent) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#e8d5e0] text-[#654177]">
        <h1 className="font-gazeta text-2xl mb-3">Biblioteca premium</h1>
        <p>
          Tu plan {subscription.membershipTierName} no incluye la biblioteca premium. Para consultar
          un cambio de nivel, contacta con Aleyda en contacto@energiaydivinidad.com.
        </p>
      </div>
    );
  }

  // Obtener contenido premium para el tier del usuario
  let premiumContent = [];
  try {
    premiumContent = await getPremiumContentForTier(subscription.membershipTierId);
  } catch (error) {
    console.error("Error fetching premium content:", error);
  }

  return (
    <div>
      {/* Header de la sección */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-[#e8d5e0]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-gazeta text-3xl sm:text-4xl text-[#8A4BAF] mb-2">Biblioteca</h1>
            <p className="text-[#654177]/70 font-dm-sans">
              Videos, audios, masterclasses y recursos exclusivos
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#8A4BAF]/10 to-[#654177]/10 px-4 py-2 rounded-xl border border-[#8A4BAF]/20">
            <Crown className="w-5 h-5 text-[#8A4BAF]" />
            <span className="text-sm font-dm-sans font-medium text-[#654177]">
              Tu nivel:{" "}
              <span className="text-[#8A4BAF] font-semibold">
                {subscription.membershipTierName}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Biblioteca de contenido */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
          </div>
        }
      >
        <PremiumLibrary content={premiumContent} />
      </Suspense>
    </div>
  );
}
