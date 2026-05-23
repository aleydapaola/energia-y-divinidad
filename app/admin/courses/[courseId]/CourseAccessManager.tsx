"use client";

import { UserPlus, UserMinus, Users, Mail, Calendar } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface AccessEntry {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  grantedAt: Date;
  grantType: string;
}

interface CourseAccessManagerProps {
  courseId: string;
  courseTitle: string;
  initialAccessList: AccessEntry[];
}

export function CourseAccessManager({
  courseId,
  courseTitle,
  initialAccessList,
}: CourseAccessManagerProps) {
  const [accessList, setAccessList] = useState<AccessEntry[]>(initialAccessList);
  const [emails, setEmails] = useState(
    initialAccessList
      .map((entry) => entry.userEmail)
      .filter(Boolean)
      .join("\n")
  );
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (
      !emails.trim() &&
      !confirm("La lista está vacía. ¿Quieres revocar el acceso a todos los usuarios?")
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al otorgar acceso");
        return;
      }

      let successMessage = `Lista guardada: ${data.successCount ?? 0} usuario con acceso`;
      if ((data.successCount ?? 0) !== 1) {
        successMessage = `Lista guardada: ${data.successCount ?? 0} usuarios con acceso`;
      }
      if (data.revokedCount > 0) {
        successMessage += `. ${data.revokedCount} acceso revocado.`;
      }
      if (data.failedCount > 0) {
        successMessage += `. ${data.failedCount} email no se pudo procesar.`;
      }

      setSuccess(successMessage);

      const refreshed = await fetch(`/api/admin/courses/${courseId}/access`);
      if (refreshed.ok) {
        const refreshedList = await refreshed.json();
        setAccessList(refreshedList);
        setEmails(
          refreshedList
            .map((entry: AccessEntry) => entry.userEmail)
            .filter(Boolean)
            .join("\n")
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(userId: string, userName: string | null) {
    if (!confirm(`¿Revocar acceso de ${userName ?? userId}?`)) {
      return;
    }

    setRevoking(userId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/courses/${courseId}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al revocar acceso");
        return;
      }

      setAccessList((prev) => {
        const next = prev.filter((u) => u.userId !== userId);
        setEmails(
          next
            .map((entry) => entry.userEmail)
            .filter(Boolean)
            .join("\n")
        );
        return next;
      });
      setSuccess("Acceso revocado correctamente");
    } finally {
      setRevoking(null);
    }
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Panel izquierdo: añadir acceso */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5" />
            Editar accesos
          </h2>
          <form onSubmit={handleGrant} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 font-dm-sans mb-1">
                Lista de emails con acceso
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={emails}
                  onChange={(e) => {
                    setEmails(e.target.value);
                    setError(null);
                    setSuccess(null);
                  }}
                  placeholder={`usuario@email.com
otra.persona@email.com
tercera@email.com`}
                  required
                  rows={5}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg font-dm-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] focus:border-transparent resize-y"
                />
              </div>
              <p className="text-xs text-gray-400 font-dm-sans mt-1">
                Al guardar, solo los emails que queden en esta lista tendrán acceso al curso.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 font-dm-sans bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-700 font-dm-sans bg-green-50 px-3 py-2 rounded-lg">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4944a4] hover:bg-[#3d3a8a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-dm-sans font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              {loading ? "Guardando lista..." : "Guardar lista de accesos"}
            </button>
          </form>

          <p className="text-xs text-gray-400 font-dm-sans mt-3">
            Si un usuario no existe, se crea su cuenta y recibe un enlace para establecer
            contraseña. Si borras un email de la lista y guardas, se revoca su acceso.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-[#f8f0f5] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <Users className="w-5 h-5 text-[#8A4BAF]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#4944a4] font-gazeta">{accessList.length}</p>
              <p className="text-sm text-gray-600 font-dm-sans">
                {accessList.length === 1 ? "usuario con acceso" : "usuarios con acceso"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho: lista de usuarios */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            Usuarios con acceso a &ldquo;{courseTitle}&rdquo;
          </h2>

          {accessList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-dm-sans">Ningún usuario tiene acceso todavía.</p>
              <p className="text-sm text-gray-400 font-dm-sans mt-1">
                Usa el formulario para dar acceso por email.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {accessList.map((entry) => (
                <div
                  key={entry.userId}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  {entry.userImage ? (
                    <Image
                      src={entry.userImage}
                      alt={entry.userName ?? "Usuario"}
                      width={36}
                      height={36}
                      className="rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#f8f0f5] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[#8A4BAF]">
                        {(entry.userName ?? entry.userEmail ?? "?")[0].toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-dm-sans font-medium text-gray-900 text-sm truncate">
                      {entry.userName ?? entry.userEmail}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.userName && (
                        <p className="text-xs text-gray-500 font-dm-sans truncate">
                          {entry.userEmail}
                        </p>
                      )}
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-dm-sans">
                        <Calendar className="w-3 h-3" />
                        {formatDate(entry.grantedAt)}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          entry.grantType === "admin"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {entry.grantType === "admin" ? "Admin" : "Compra"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(entry.userId, entry.userName)}
                    disabled={revoking === entry.userId}
                    title="Revocar acceso"
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
