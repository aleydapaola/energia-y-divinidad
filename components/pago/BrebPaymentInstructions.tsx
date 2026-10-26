"use client";

import { useState } from "react";

import type { BrebKeyType } from "@/lib/breb";

interface Props {
  orderNumber: string;
  amount: number;
  currency: string;
  itemName: string;
  configuration: {
    enabled: boolean;
    simulation: boolean;
    key: string;
    keyType: BrebKeyType | null;
    recipient: string;
    amountMode: "customer-entered";
  };
  qrAvailable?: boolean;
}

/** Banks ask for the key type first, so the wording follows what was configured. */
const KEY_HINTS: Record<BrebKeyType, string> = {
  phone: "Elige «llave Bre-B por teléfono» y pega el número.",
  email: "Elige «llave Bre-B por correo» y pega la dirección.",
  alias: "Elige «llave Bre-B alfanumérica» y pega el alias, con la @ incluida.",
  document: "Elige «llave Bre-B por documento» y pega el número.",
};

export function BrebPaymentInstructions({
  orderNumber,
  amount,
  currency,
  itemName,
  configuration,
  qrAvailable = false,
}: Props) {
  const [message, setMessage] = useState("");
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copiado`);
    } catch {
      setMessage("No se pudo copiar. Selecciona el texto y cópialo manualmente.");
    }
  }
  const amountText = `${new Intl.NumberFormat("es-CO").format(amount)} ${currency}`;
  const qrSrc = `/api/orders/${encodeURIComponent(orderNumber)}/breb-qr`;
  const box = "rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-2";
  return (
    <section className="bg-white rounded-2xl border p-5 sm:p-7 space-y-5">
      <div>
        <p className="text-sm text-purple-700">Bre-B · Global66 · Colombia</p>
        <h1 className="text-2xl font-gazeta text-[#654177]">Pedido pendiente de pago</h1>
      </div>
      <div className={box}>
        <h2 className="font-semibold break-words">{itemName}</h2>
        <p className="text-2xl font-semibold">{amountText}</p>
        <button
          type="button"
          className="underline min-h-11"
          onClick={() => copy(String(amount), "Importe")}
        >
          Copiar importe
        </button>
        <p className="text-sm break-all">Referencia: {orderNumber}</p>
        <button
          type="button"
          className="underline min-h-11"
          onClick={() => copy(orderNumber, "Referencia")}
        >
          Copiar referencia del pedido
        </button>
      </div>
      {configuration.simulation ? (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl">
          <strong>SIMULACIÓN — NO ENVÍES DINERO</strong>
          <p>
            Prueba el aviso de transferencia con una referencia ficticia. La llave y el QR que
            aparecen aquí no son datos bancarios reales y no sirven para pagar.
          </p>
        </div>
      ) : null}
      {!configuration.enabled ? (
        <p role="alert">Bre-B aún no está disponible. No realices ninguna transferencia.</p>
      ) : (
        <>
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl">
            <strong>Escribe el importe exacto: {amountText}</strong>
            <p>
              El QR y la llave no llevan el importe incorporado. Si transfieres otra cantidad, el
              pedido no se podrá verificar y tendrás que reclamarla.
            </p>
          </div>
          {qrAvailable && (
            <div className="text-center space-y-2">
              <p className="font-semibold">Escanea el QR desde tu aplicación bancaria</p>
              {/* Static account QR issued by Global66. It carries no amount. */}
              <img
                src={qrSrc}
                alt="QR Bre-B de Global66 para pagar este pedido"
                className="w-56 h-56 object-contain mx-auto bg-white p-2 border rounded-xl"
              />
              <a
                className="underline min-h-11 inline-block"
                href={qrSrc}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir el QR para guardarlo
              </a>
              <p className="text-sm text-gray-600">
                Comprueba que el destinatario es <strong>{configuration.recipient}</strong> y que tu
                aplicación te pide el importe.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <p className="font-semibold">
              {qrAvailable ? "O transfiere con la llave Bre-B" : "Transfiere con la llave Bre-B"}
            </p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>Abre la zona Bre-B de tu aplicación bancaria o financiera.</li>
              <li>
                {configuration.keyType
                  ? KEY_HINTS[configuration.keyType]
                  : "Introduce la llave Bre-B que aparece abajo."}
              </li>
              <li>
                Comprueba que el destinatario coincide con{" "}
                <strong>{configuration.recipient}</strong>.
              </li>
              <li>
                Introduce el importe exacto en COP: <strong>{amountText}</strong>. Si tu aplicación
                admite una nota, incluye la referencia del pedido.
              </li>
              <li>Confirma la transferencia en tu aplicación y guarda su referencia.</li>
            </ol>
          </div>
          <div className={box}>
            <p>
              Destinatario: <strong>{configuration.recipient}</strong>
            </p>
            <p>Entidad receptora: Global66</p>
            <p className="font-mono break-all text-lg">{configuration.key}</p>
            <button
              type="button"
              className="underline min-h-11"
              onClick={() => copy(configuration.key, "Llave")}
            >
              Copiar llave Bre-B
            </button>
          </div>
        </>
      )}
      <p aria-live="polite" className="text-sm">
        {message}
      </p>
      <div className="p-4 bg-blue-50 rounded-xl">
        <h2 className="font-semibold">¿Qué ocurre después?</h2>
        <p>
          Comunica la referencia de la transferencia aquí mismo. Aleyda comprobará el ingreso en
          Global66 antes de activar la compra. El aviso del cliente no confirma el pago.
        </p>
        <p className="mt-2">
          Recibirás un correo al confirmar el pago y las instrucciones para acceder al producto o
          gestionar tu reserva.
        </p>
      </div>
    </section>
  );
}
