import { INDIVIDUAL_SESSION_POLICY, SESSION_RESCHEDULE_POLICY } from "@/lib/session-policy";

export function SessionPolicy() {
  return (
    <div className="space-y-3 text-sm font-dm-sans text-gray-600">
      <p className="font-medium text-[#654177]">Política de sesiones individuales</p>
      <ul className="list-disc space-y-1 pl-5">
        {INDIVIDUAL_SESSION_POLICY.map(({ label, text }) => (
          <li key={label}>
            <strong>{label}:</strong> {text}
          </li>
        ))}
      </ul>
      <p>{SESSION_RESCHEDULE_POLICY}</p>
      <a href="/contacto" className="inline-block text-[#8A4BAF] underline">
        Contactar con Aleyda para reembolsos o excepciones
      </a>
    </div>
  );
}
