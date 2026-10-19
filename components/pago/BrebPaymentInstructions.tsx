"use client";

import { useState } from "react";

interface Props {
  orderNumber: string;
  amount: number;
  currency: string;
  itemName: string;
  configuration: { enabled: boolean; simulation: boolean; key: string; recipient: string };
  qrCodeUrl?: string | null;
}
export function BrebPaymentInstructions({
  orderNumber,
  amount,
  currency,
  itemName,
  configuration,
  qrCodeUrl,
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
  const box = "rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-2";
  return (
    <section className="bg-white rounded-2xl border p-5 sm:p-7 space-y-5">
      <div>
        <p className="text-sm text-purple-700">Bre-B · Global66 · Colombia</p>
        <h1 className="text-2xl font-gazeta text-[#654177]">Pedido pendiente de pago</h1>
      </div>
      <div className={box}>
        <h2 className="font-semibold break-words">{itemName}</h2>
        <p className="text-2xl font-semibold">
          {new Intl.NumberFormat("es-CO").format(amount)} {currency}
        </p>
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
            Prueba el aviso de transferencia con una referencia ficticia. No mostramos llaves ni QR
            bancarios reales.
          </p>
        </div>
      ) : !configuration.enabled ? (
        <p role="alert">Bre-B aún no está disponible. No realices ninguna transferencia.</p>
      ) : (
        <>
          <ol className="list-decimal pl-5 space-y-3">
            <li>Abre la zona Bre-B de tu aplicación bancaria o financiera.</li>
            <li>Copia la llave y comprueba que el destinatario coincide con el mostrado aquí.</li>
            <li>
              Introduce el importe exacto en COP. Si tu aplicación admite una nota, incluye la
              referencia del pedido.
            </li>
            <li>Confirma la transferencia en tu aplicación y guarda su referencia.</li>
          </ol>
          <div className={box}>
            <p>
              Destinatario: <strong>{configuration.recipient}</strong>
            </p>
            <p>Entidad receptora: Global66</p>
            <p className="font-mono break-all">{configuration.key}</p>
            <button
              type="button"
              className="underline min-h-11"
              onClick={() => copy(configuration.key, "Llave")}
            >
              Copiar llave Bre-B
            </button>
            <button
              type="button"
              className="underline min-h-11 ml-4"
              onClick={() => copy(String(amount), "Importe")}
            >
              Copiar importe
            </button>
          </div>
          {qrCodeUrl ? (
            <div className="text-center">
              <p>
                QR verificado para este pedido. Comprueba importe y destinatario en tu aplicación.
              </p>
              {/* Bank image is used unchanged; never generate a generic text QR. */}
              <img
                src={qrCodeUrl}
                alt="QR Bre-B del pedido"
                className="w-56 h-56 object-contain mx-auto"
              />
              <a
                className="underline min-h-11 inline-block"
                href={qrCodeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir QR para guardarlo
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              QR todavía no disponible para este pedido. Utiliza la llave verificada.
            </p>
          )}
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
