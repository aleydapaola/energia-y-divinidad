"use client";

import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Copy, Check } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface DiscountCode {
  _id: string;
  code: string;
  description?: string;
  active: boolean;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  currency?: string;
  usageType: "single_use" | "multi_use";
  maxUses?: number;
  validFrom?: string;
  validUntil?: string;
  minPurchaseAmount?: number;
  usageCount: number;
  _createdAt: string;
}

const emptyForm = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed_amount",
  discountValue: "",
  currency: "COP" as "COP" | "USD",
  usageType: "multi_use" as "single_use" | "multi_use",
  maxUses: "",
  validFrom: "",
  validUntil: "",
  minPurchaseAmount: "",
};

export default function DiscountCodesAdminPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/discount-codes");
      const data = await res.json();
      setCodes(data.codes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCodes();
  }, [loadCodes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        usageType: form.usageType,
      };
      if (form.discountType === "fixed_amount") {
        payload.currency = form.currency;
      }
      if (form.usageType === "multi_use" && form.maxUses) {
        payload.maxUses = Number(form.maxUses);
      }
      if (form.validFrom) {
        payload.validFrom = new Date(form.validFrom).toISOString();
      }
      if (form.validUntil) {
        payload.validUntil = new Date(form.validUntil).toISOString();
      }
      if (form.minPurchaseAmount) {
        payload.minPurchaseAmount = Number(form.minPurchaseAmount);
      }

      const res = await fetch("/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear el código");
        return;
      }
      setForm(emptyForm);
      setShowForm(false);
      await loadCodes();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(code: DiscountCode) {
    await fetch(`/api/admin/discount-codes/${code._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !code.active }),
    });
    await loadCodes();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este código de descuento? Esta acción no se puede deshacer.")) {
      return;
    }
    await fetch(`/api/admin/discount-codes?id=${id}`, { method: "DELETE" });
    await loadCodes();
  }

  function handleCopy(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function formatDiscount(c: DiscountCode) {
    if (c.discountType === "percentage") {
      return `${c.discountValue}%`;
    }
    const currency = c.currency || "COP";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(c.discountValue);
  }

  function isExpired(code: DiscountCode) {
    return !!code.validUntil && new Date(code.validUntil) < new Date();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-gazeta text-3xl text-[#654177] mb-1">Códigos de Descuento</h1>
          <p className="font-dm-sans text-gray-500 text-sm">
            Crea y gestiona códigos de descuento para sesiones, cursos y más.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError(null);
          }}
          className="flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white px-4 py-2 rounded-lg font-dm-sans font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Código
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="font-gazeta text-xl text-[#654177] mb-4">Crear Nuevo Código</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="DESCUENTO20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20 uppercase"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                  Descripción interna
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej: Código para redes sociales"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                  Tipo de descuento <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      discountType: e.target.value as "percentage" | "fixed_amount",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF]"
                >
                  <option value="percentage">📊 Porcentaje (%)</option>
                  <option value="fixed_amount">💰 Monto Fijo</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                  Valor del descuento <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    max={form.discountType === "percentage" ? 100 : undefined}
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    placeholder={form.discountType === "percentage" ? "20" : "50000"}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20"
                  />
                  {form.discountType === "percentage" && (
                    <span className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-dm-sans text-sm text-gray-600">
                      %
                    </span>
                  )}
                  {form.discountType === "fixed_amount" && (
                    <select
                      value={form.currency}
                      onChange={(e) =>
                        setForm({ ...form, currency: e.target.value as "COP" | "USD" })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF]"
                    >
                      <option value="COP">COP</option>
                      <option value="USD">USD</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Usage Type */}
              <div>
                <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                  Tipo de uso <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.usageType}
                  onChange={(e) =>
                    setForm({ ...form, usageType: e.target.value as "single_use" | "multi_use" })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF]"
                >
                  <option value="multi_use">♾️ Multi-uso</option>
                  <option value="single_use">1️⃣ Un solo uso</option>
                </select>
              </div>

              {/* Max Uses (only for multi_use) */}
              {form.usageType === "multi_use" && (
                <div>
                  <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                    Máximo de usos (vacío = ilimitado)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    placeholder="Ej: 50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20"
                  />
                </div>
              )}

              {/* Valid From */}
              <div>
                <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                  Válido desde (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF]"
                />
              </div>

              {/* Valid Until */}
              <div>
                <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                  Válido hasta (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF]"
                />
              </div>

              {/* Min Purchase */}
              <div>
                <label className="block font-dm-sans text-sm font-semibold text-gray-700 mb-1">
                  Monto mínimo de compra COP (opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.minPurchaseAmount}
                  onChange={(e) => setForm({ ...form, minPurchaseAmount: e.target.value })}
                  placeholder="Ej: 100000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:border-[#8A4BAF] focus:ring-2 focus:ring-[#8A4BAF]/20"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 font-dm-sans text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-[#4944a4] hover:bg-[#3d3a8a] text-white px-5 py-2 rounded-lg font-dm-sans font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Crear Código
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm);
                  setError(null);
                }}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-dm-sans font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Codes List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#8A4BAF]" />
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-gazeta text-xl text-gray-500 mb-2">No hay códigos de descuento</p>
          <p className="font-dm-sans text-sm text-gray-400">
            Crea tu primer código con el botón &quot;Nuevo Código&quot;.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="text-left px-5 py-3 font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Descuento
                </th>
                <th className="text-left px-5 py-3 font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Uso
                </th>
                <th className="text-left px-5 py-3 font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Vigencia
                </th>
                <th className="text-left px-5 py-3 font-dm-sans text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {codes.map((code) => {
                const expired = isExpired(code);
                const statusColor = !code.active
                  ? "text-gray-400"
                  : expired
                    ? "text-orange-500"
                    : "text-green-600";
                const statusLabel = !code.active ? "Inactivo" : expired ? "Expirado" : "Activo";

                return (
                  <tr key={code._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-dm-sans font-bold text-[#654177] tracking-wide">
                          {code.code}
                        </span>
                        <button
                          onClick={() => handleCopy(code.code, code._id)}
                          className="text-gray-400 hover:text-[#8A4BAF] transition-colors"
                          title="Copiar código"
                        >
                          {copiedId === code._id ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {code.description && (
                        <p className="font-dm-sans text-xs text-gray-400 mt-0.5">
                          {code.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-dm-sans font-semibold text-[#4944a4]">
                        {formatDiscount(code)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-dm-sans text-sm text-gray-600">
                      {code.usageType === "single_use" ? (
                        <span>1️⃣ Un uso · {code.usageCount} usado</span>
                      ) : (
                        <span>
                          ♾️ {code.usageCount}
                          {code.maxUses ? `/${code.maxUses}` : ""} usos
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-dm-sans text-xs text-gray-500">
                      {code.validFrom && (
                        <div>Desde: {new Date(code.validFrom).toLocaleDateString("es-CO")}</div>
                      )}
                      {code.validUntil && (
                        <div className={expired ? "text-orange-500 font-semibold" : ""}>
                          Hasta: {new Date(code.validUntil).toLocaleDateString("es-CO")}
                        </div>
                      )}
                      {!code.validFrom && !code.validUntil && (
                        <span className="text-gray-400">Sin límite</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-dm-sans text-sm font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleToggle(code)}
                          className="text-gray-400 hover:text-[#8A4BAF] transition-colors"
                          title={code.active ? "Desactivar" : "Activar"}
                        >
                          {code.active ? (
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(code._id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
