/** Política confirmada por Xavier para las sesiones individuales de Aleyda, 25/10/2026. */
export const INDIVIDUAL_SESSION_POLICY = [
  { label: "24 horas o más", text: "Reembolso íntegro o cambio de fecha." },
  {
    label: "Menos de 24 horas",
    text: "Sin reembolso automático; Aleyda valora personalmente las excepciones.",
  },
  { label: "Si no te presentas", text: "Sin reembolso." },
  {
    label: "Si Aleyda cancela",
    text: "Reembolso íntegro o cambio de fecha, a elección del cliente.",
  },
] as const;

export const SESSION_RESCHEDULE_POLICY =
  "Puedes cambiar la fecha desde Mis Sesiones un máximo de 2 veces y con al menos 24 horas de anticipación. Ambas condiciones deben cumplirse. Para otros cambios o excepciones, contacta con Aleyda.";

export const SESSION_REFUND_CONTACT =
  "Para gestionar el reembolso, contacta con Aleyda. Cancelar la reserva no ejecuta la devolución del dinero.";
