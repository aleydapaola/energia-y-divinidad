"use client";

import {
  ArrowLeft,
  Calendar,
  MapPin,
  Video,
  Users,
  Minus,
  Plus,
  Loader2,
  CreditCard,
  Key,
  Tag,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";

import type { PaymentMethodType } from "@/lib/membership-access";

interface Event {
  _id: string;
  title: string;
  slug: { current: string };
  eventType: string;
  mainImage: { asset: { url: string }; alt?: string };
  eventDate: string;
  endDate?: string;
  locationType: "online" | "in_person";
  venue?: { name?: string; city?: string; address?: string };
  price?: number;
  priceUSD?: number;
  earlyBirdPrice?: number;
  earlyBirdDeadline?: string;
  capacity?: number;
  maxPerBooking: number;
  availableSpots?: number;
  includedInMembership: boolean;
  memberDiscount?: number;
}

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

export default function EventCheckoutPage({ params }: CheckoutPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [seats, setSeats] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [country, setCountry] = useState<"colombia" | "international">("colombia");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("wompi_manual");
  const [notes, setNotes] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
    formattedDiscount: string;
  } | null>(null);

  // Cargar evento
  useEffect(() => {
    async function loadEvent() {
      try {
        const resolvedParams = await params;
        const response = await fetch(`/api/sanity/events/${resolvedParams.slug}`);
        if (!response.ok) {
          throw new Error("Evento no encontrado");
        }
        const data = await response.json();
        setEvent(data);

        // Pre-fill user data if logged in
        if (session?.user) {
          setCustomerName(session.user.name || "");
          setCustomerEmail(session.user.email || "");
        }
      } catch {
        setError("No se pudo cargar el evento");
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [params, session]);

  // Calcular precio
  const isEarlyBird =
    event?.earlyBirdPrice &&
    event?.earlyBirdDeadline &&
    new Date() <= new Date(event.earlyBirdDeadline);

  const getUnitPrice = () => {
    if (!event) {
      return 0;
    }
    if (getCurrency() === "USD") {
      return event.priceUSD || 0;
    }
    return isEarlyBird ? event.earlyBirdPrice! : event.price || 0;
  };

  const getCurrency = () =>
    country === "international" && paymentMethod?.startsWith("paypal") ? "USD" : "COP";
  const unitPrice = getUnitPrice();
  const totalPrice = unitPrice * seats;
  const finalTotalPrice = appliedDiscount ? appliedDiscount.finalAmount : totalPrice;

  const formatPrice = (amount: number, currency: string) => {
    if (currency === "USD") {
      return `USD $${amount.toLocaleString("en-US")}`;
    }
    return `$${amount.toLocaleString("es-CO")} COP`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !acceptTerms) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const currency = getCurrency();
      const amount = totalPrice;

      // Determinar endpoint según método de pago
      let endpoint: string;
      let body: Record<string, unknown>;

      if (paymentMethod === "wompi_manual") {
        // Pago manual via Wompi - Link de pago genérico
        endpoint = "/api/checkout/wompi-manual";
        body = {
          productType: "event",
          productId: event._id,
          productName: `${event.title} (${seats} cupo${seats > 1 ? "s" : ""})`,
          amount,
          currency,
          discountCode: appliedDiscount?.code,
          guestEmail: customerEmail,
          guestName: customerName,
          guestPhone: customerPhone,
          scheduledAt: event.eventDate,
          seats,
          notes,
        };
      } else if (paymentMethod === "breb_manual") {
        // Pago manual via Bre-B (Colombia)
        endpoint = "/api/checkout/breb";
        body = {
          productType: "event",
          productId: event._id,
          productName: `${event.title} (${seats} cupo${seats > 1 ? "s" : ""})`,
          amount,
          discountCode: appliedDiscount?.code,
          guestEmail: customerEmail,
          guestName: customerName,
          scheduledAt: event.eventDate,
        };
      } else {
        // Pago via PayPal (Internacional)
        endpoint = "/api/checkout/paypal";
        body = {
          productType: "event",
          productId: event._id,
          productName: `${event.title} (${seats} cupo${seats > 1 ? "s" : ""})`,
          amount,
          currency,
          discountCode: appliedDiscount?.code,
          guestEmail: customerEmail,
          guestName: customerName,
          scheduledAt: event.eventDate, // Fecha del evento para el dashboard
          seats,
          notes,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar el pago");
      }

      // Redirect según respuesta
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.redirectUrl) {
        router.push(data.redirectUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la reserva");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountInput.trim()) {
      return;
    }

    setIsValidatingDiscount(true);
    setDiscountError(null);
    setAppliedDiscount(null);

    try {
      const response = await fetch("/api/discount-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountInput.trim(),
          productType: "event",
          amount: totalPrice,
          currency: getCurrency(),
        }),
      });
      const data = await response.json();

      if (!data.valid) {
        setDiscountError(data.error || "Código inválido");
        return;
      }

      setAppliedDiscount({
        code: data.discountCode,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
        formattedDiscount: data.formattedDiscount,
      });
    } catch {
      setDiscountError("Error al validar el código");
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  const handlePaymentMethodChange = (method: PaymentMethodType) => {
    setPaymentMethod(method);
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f0f5]">
        <CheckoutHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-[#f8f0f5]">
        <CheckoutHeader />
        <div className="flex flex-col items-center justify-center py-32 p-4">
          <p className="text-red-500 mb-4">{error}</p>
          <Link href="/eventos" className="text-[#4944a4] hover:underline">
            Volver a eventos
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const maxSeats = Math.min(
    event.maxPerBooking || 1,
    event.availableSpots ?? event.maxPerBooking ?? 1
  );

  return (
    <div className="min-h-screen bg-[#f8f0f5]">
      <CheckoutHeader />

      <main className="py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          {/* Back button */}
          <Link
            href={`/eventos/${event.slug.current}`}
            className="inline-flex items-center gap-2 text-[#8A4BAF] hover:text-[#654177] mb-6 font-dm-sans text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al evento
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Event Summary */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative aspect-video bg-gradient-to-br from-[#8A4BAF]/20 to-[#2D4CC7]/20">
                {event.mainImage?.asset?.url ? (
                  <Image
                    src={event.mainImage.asset.url}
                    alt={event.mainImage.alt || event.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-8xl">📅</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h1 className="font-gazeta text-2xl text-[#654177] mb-4">{event.title}</h1>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#8A4BAF]" />
                    <span>{formatDate(event.eventDate)}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {event.locationType === "online" ? (
                      <>
                        <Video className="w-5 h-5 text-[#8A4BAF]" />
                        <span>Evento Online (Zoom)</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-5 h-5 text-[#8A4BAF]" />
                        <span>{event.venue?.name || event.venue?.city || "Presencial"}</span>
                      </>
                    )}
                  </div>

                  {event.availableSpots !== undefined && (
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-[#8A4BAF]" />
                      <span>{event.availableSpots} cupos disponibles</span>
                    </div>
                  )}
                </div>

                {/* Price Summary */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Precio por persona</span>
                    <span className="font-semibold">
                      {formatPrice(unitPrice, getCurrency())}
                      {isEarlyBird && (
                        <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                          Early Bird
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Cantidad</span>
                    <span>
                      {seats} cupo{seats > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold text-[#654177]">
                    <span>Total</span>
                    <span>{formatPrice(finalTotalPrice, getCurrency())}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between items-center text-sm text-green-600 mt-1">
                      <span>Descuento ({appliedDiscount.code})</span>
                      <span>-{appliedDiscount.formattedDiscount}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Checkout Form */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="font-gazeta text-xl text-[#654177] mb-6">Completa tu reserva</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Seats selector */}
                {maxSeats > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad de cupos
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSeats(Math.max(1, seats - 1));
                          setAppliedDiscount(null);
                          setDiscountInput("");
                          setDiscountError(null);
                        }}
                        className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        disabled={seats <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xl font-semibold w-8 text-center">{seats}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSeats(Math.min(maxSeats, seats + 1));
                          setAppliedDiscount(null);
                          setDiscountInput("");
                          setDiscountError(null);
                        }}
                        className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        disabled={seats >= maxSeats}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Customer info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                    placeholder="+57 300 123 4567"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="country"
                        value="colombia"
                        checked={country === "colombia"}
                        onChange={() => {
                          setCountry("colombia");
                          setPaymentMethod("wompi_manual");
                          setAppliedDiscount(null);
                          setDiscountInput("");
                          setDiscountError(null);
                        }}
                        className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                      />
                      <span>🇨🇴 Colombia</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="country"
                        value="international"
                        checked={country === "international"}
                        onChange={() => {
                          setCountry("international");
                          setPaymentMethod("wompi_manual");
                          setAppliedDiscount(null);
                          setDiscountInput("");
                          setDiscountError(null);
                        }}
                        className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                      />
                      <span>🌍 Internacional</span>
                    </label>
                  </div>
                </div>

                {/* Payment method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de pago
                  </label>
                  <div className="space-y-3">
                    {country === "colombia" ? (
                      <>
                        {/* Wompi Manual Colombia */}
                        <label
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            paymentMethod === "wompi_manual"
                              ? "border-[#8A4BAF] bg-[#8A4BAF]/5"
                              : "border-gray-200 hover:border-[#8A4BAF]/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="wompi_manual"
                            checked={paymentMethod === "wompi_manual"}
                            onChange={() => handlePaymentMethodChange("wompi_manual")}
                            className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                          />
                          <CreditCard className="w-5 h-5 text-[#8A4BAF]" />
                          <div>
                            <span className="font-medium">Wompi (Tarjeta, PSE, Nequi, etc.)</span>
                            <p className="text-xs text-gray-500">
                              Todos los métodos de pago colombianos
                            </p>
                          </div>
                        </label>

                        {/* Bre-B Colombia */}
                        <label
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            paymentMethod === "breb_manual"
                              ? "border-[#8A4BAF] bg-[#8A4BAF]/5"
                              : "border-gray-200 hover:border-[#8A4BAF]/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="breb_manual"
                            checked={paymentMethod === "breb_manual"}
                            onChange={() => handlePaymentMethodChange("breb_manual")}
                            className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                          />
                          <Key className="w-5 h-5 text-[#8A4BAF]" />
                          <div>
                            <span className="font-medium">Bre-B (Llave Bancolombia)</span>
                            <p className="text-xs text-gray-500">
                              Transferencia instantánea sin comisión
                            </p>
                          </div>
                        </label>

                        {/* PayPal Colombia */}
                        <label
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            paymentMethod === "paypal_direct"
                              ? "border-[#8A4BAF] bg-[#8A4BAF]/5"
                              : "border-gray-200 hover:border-[#8A4BAF]/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="paypal_direct"
                            checked={paymentMethod === "paypal_direct"}
                            onChange={() => handlePaymentMethodChange("paypal_direct")}
                            className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                          />
                          <PayPalIcon />
                          <div>
                            <span className="font-medium">PayPal</span>
                            <p className="text-xs text-gray-500">Paga con tu cuenta PayPal</p>
                          </div>
                        </label>
                      </>
                    ) : (
                      <>
                        {/* Wompi Manual International */}
                        <label
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            paymentMethod === "wompi_manual"
                              ? "border-[#8A4BAF] bg-[#8A4BAF]/5"
                              : "border-gray-200 hover:border-[#8A4BAF]/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="wompi_manual"
                            checked={paymentMethod === "wompi_manual"}
                            onChange={() => handlePaymentMethodChange("wompi_manual")}
                            className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                          />
                          <CreditCard className="w-5 h-5 text-[#8A4BAF]" />
                          <div>
                            <span className="font-medium">Wompi (Tarjeta, PSE, Nequi, etc.)</span>
                            <p className="text-xs text-gray-500">
                              Pagos con tarjeta o desde Colombia
                            </p>
                          </div>
                        </label>

                        {/* Card International via PayPal */}
                        <label
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            paymentMethod === "paypal_card"
                              ? "border-[#8A4BAF] bg-[#8A4BAF]/5"
                              : "border-gray-200 hover:border-[#8A4BAF]/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="paypal_card"
                            checked={paymentMethod === "paypal_card"}
                            onChange={() => handlePaymentMethodChange("paypal_card")}
                            className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                          />
                          <CreditCard className="w-5 h-5 text-[#8A4BAF]" />
                          <div>
                            <span className="font-medium">Credit/Debit Card</span>
                            <p className="text-xs text-gray-500">
                              Visa, Mastercard, American Express
                            </p>
                          </div>
                        </label>

                        {/* PayPal International */}
                        <label
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            paymentMethod === "paypal_direct"
                              ? "border-[#8A4BAF] bg-[#8A4BAF]/5"
                              : "border-gray-200 hover:border-[#8A4BAF]/30"
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="paypal_direct"
                            checked={paymentMethod === "paypal_direct"}
                            onChange={() => handlePaymentMethodChange("paypal_direct")}
                            className="text-[#8A4BAF] focus:ring-[#8A4BAF]"
                          />
                          <PayPalIcon />
                          <div>
                            <span className="font-medium">PayPal</span>
                            <p className="text-xs text-gray-500">Pay with your PayPal account</p>
                          </div>
                        </label>
                      </>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-gray-500 text-center">
                    {paymentMethod === "wompi_manual"
                      ? "Link de pago seguro de Wompi - Tarjeta, PSE, Nequi, Daviplata y más"
                      : paymentMethod === "breb_manual"
                        ? "Transferencia directa con Bre-B - Sin comisiones"
                        : "Pago procesado de forma segura por PayPal"}
                  </p>
                </div>

                {/* Discount Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de descuento
                  </label>
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          {appliedDiscount.code}
                        </span>
                        <span className="text-sm text-green-600">
                          -{appliedDiscount.formattedDiscount}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedDiscount(null);
                          setDiscountInput("");
                          setDiscountError(null);
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={discountInput}
                          onChange={(e) => {
                            setDiscountInput(e.target.value.toUpperCase());
                            setDiscountError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyDiscount();
                            }
                          }}
                          placeholder="CÓDIGO"
                          className="w-full pl-9 pr-4 py-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyDiscount}
                        disabled={!discountInput.trim() || isValidatingDiscount}
                        className="px-4 py-3 rounded-lg border-2 border-[#4944a4] text-[#4944a4] text-sm font-semibold hover:bg-[#4944a4] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isValidatingDiscount ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Aplicar"
                        )}
                      </button>
                    </div>
                  )}
                  {discountError && <p className="mt-2 text-sm text-red-500">{discountError}</p>}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent"
                    placeholder="¿Algo que debamos saber?"
                  />
                </div>

                {/* Terms */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                    className="mt-1 text-[#8A4BAF] focus:ring-[#8A4BAF] rounded"
                  />
                  <span className="text-sm text-gray-600">
                    Acepto los{" "}
                    <Link href="/terminos" className="text-[#8A4BAF] hover:underline">
                      términos y condiciones
                    </Link>{" "}
                    y la{" "}
                    <Link href="/privacidad" className="text-[#8A4BAF] hover:underline">
                      política de privacidad
                    </Link>
                  </span>
                </label>

                {/* Error message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || !acceptTerms}
                  className="w-full py-4 bg-[#4944a4] text-white rounded-lg font-semibold hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>Confirmar reserva - {formatPrice(finalTotalPrice, getCurrency())}</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function PayPalIcon() {
  return (
    <svg className="w-5 h-5 text-[#8A4BAF]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
    </svg>
  );
}
