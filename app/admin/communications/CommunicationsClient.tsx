"use client";

import { Eye, Loader2, Mail, Play, RefreshCw, Search, Send, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { CommunicationAudienceOptions, EmailRecipientCandidate } from "@/lib/email-audiences";

type AudienceType =
  | "ALL_USERS"
  | "COURSE"
  | "MEMBERSHIP"
  | "EVENT"
  | "SELECTED_USERS"
  | "MANUAL_EMAILS";

interface SelectableUser {
  id: string;
  name: string | null;
  email: string;
  activeMembership: string | null;
}

interface CampaignRow {
  id: string;
  title: string;
  subject: string;
  status: string;
  audienceName: string | null;
  createdByEmail: string;
  createdAt: string;
  queuedAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  totalRecipients: number;
  sent: number;
  failed: number;
  queued: number;
}

interface PreviewState {
  count: number;
  recipients: EmailRecipientCandidate[];
}

interface CommunicationsClientProps {
  options: CommunicationAudienceOptions;
  initialCampaigns: CampaignRow[];
}

const audienceLabels: Record<AudienceType, string> = {
  ALL_USERS: "Todos los usuarios",
  COURSE: "Alumnos de un curso",
  MEMBERSHIP: "Miembros de un plan",
  EVENT: "Inscritos de un evento",
  SELECTED_USERS: "Usuarios seleccionados",
  MANUAL_EMAILS: "Direcciones de correo",
};

export function CommunicationsClient({ options, initialCampaigns }: CommunicationsClientProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [audienceType, setAudienceType] = useState<AudienceType>("COURSE");
  const [audienceId, setAudienceId] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<SelectableUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectableUser[]>([]);
  const [manualEmails, setManualEmails] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audienceOptions = useMemo(() => {
    if (audienceType === "COURSE") {
      return options.courses;
    }
    if (audienceType === "MEMBERSHIP") {
      return options.membershipTiers;
    }
    if (audienceType === "EVENT") {
      return options.events;
    }
    return [];
  }, [audienceType, options]);

  const isSelectedUsersAudience = audienceType === "SELECTED_USERS";
  const isManualEmailsAudience = audienceType === "MANUAL_EMAILS";
  const requiresAudienceId =
    audienceType !== "ALL_USERS" && !isSelectedUsersAudience && !isManualEmailsAudience;
  const selectedUserIds = selectedUsers.map((user) => user.id);

  async function refreshCampaigns() {
    const res = await fetch("/api/admin/communications/campaigns");
    if (!res.ok) {
      return;
    }
    setCampaigns(await res.json());
  }

  async function handlePreview() {
    setLoadingPreview(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/communications/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audienceType,
          audienceId: requiresAudienceId ? audienceId : null,
          userIds: isSelectedUsersAudience ? selectedUserIds : undefined,
          manualEmails: isManualEmailsAudience ? manualEmails : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo calcular la audiencia");
        return;
      }

      setPreview(data);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleUserSearch() {
    const query = userSearch.trim();
    if (query.length < 2) {
      setError("Escribe al menos 2 caracteres para buscar usuarios");
      return;
    }

    setSearchingUsers(true);
    setError(null);
    setMessage(null);

    try {
      const params = new URLSearchParams({
        q: query,
        limit: "12",
      });
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo buscar usuarios");
        return;
      }

      setUserResults(data.users ?? []);
    } finally {
      setSearchingUsers(false);
    }
  }

  function addSelectedUser(user: SelectableUser) {
    setSelectedUsers((current) => {
      if (current.some((selected) => selected.id === user.id)) {
        return current;
      }
      return [...current, user];
    });
    setPreview(null);
  }

  function removeSelectedUser(userId: string) {
    setSelectedUsers((current) => current.filter((user) => user.id !== userId));
    setPreview(null);
  }

  async function handleSendTest() {
    setSendingTest(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/communications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, subject, body }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar la prueba");
        return;
      }

      setMessage("Email de prueba enviado");
    } finally {
      setSendingTest(false);
    }
  }

  async function handleCreateCampaign() {
    if (!confirm("¿Crear la campaña y dejarla en cola de envío?")) {
      return;
    }

    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/communications/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          body,
          audienceType,
          audienceId: requiresAudienceId ? audienceId : null,
          userIds: isSelectedUsersAudience ? selectedUserIds : undefined,
          manualEmails: isManualEmailsAudience ? manualEmails : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la campaña");
        return;
      }

      setMessage(`Campaña creada con ${data.recipients} destinatario(s)`);
      setTitle("");
      setSubject("");
      setBody("");
      setPreview(null);
      if (isManualEmailsAudience) {
        setManualEmails("");
      }
      if (isSelectedUsersAudience) {
        setSelectedUsers([]);
        setUserResults([]);
        setUserSearch("");
      }
      await refreshCampaigns();
    } finally {
      setCreating(false);
    }
  }

  async function handleProcessBatch() {
    setProcessing(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/communications/process", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo procesar la cola");
        return;
      }

      setMessage(`Lote procesado: ${data.successful} enviados, ${data.failed} fallidos`);
      await refreshCampaigns();
    } finally {
      setProcessing(false);
    }
  }

  const canPreview =
    (!requiresAudienceId || Boolean(audienceId)) &&
    (!isSelectedUsersAudience || selectedUsers.length > 0) &&
    (!isManualEmailsAudience || Boolean(manualEmails.trim()));
  const canCreate = title.trim() && subject.trim() && body.trim() && canPreview;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-gazeta text-3xl text-[#654177]">Comunicaciones</h1>
          <p className="text-gray-600 font-dm-sans mt-1">
            Envía correos a grupos de usuarios o a direcciones de correo
          </p>
        </div>
        <button
          type="button"
          onClick={handleProcessBatch}
          disabled={processing}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4944a4] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d3a8a] disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Procesar cola
        </button>
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-dm-sans ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-5">
            <Send className="h-5 w-5" />
            Nueva campaña
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-gray-600 font-dm-sans">Audiencia</span>
              <select
                value={audienceType}
                onChange={(event) => {
                  setAudienceType(event.target.value as AudienceType);
                  setAudienceId("");
                  setSelectedUsers([]);
                  setUserResults([]);
                  setUserSearch("");
                  setManualEmails("");
                  setPreview(null);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
              >
                {Object.entries(audienceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {requiresAudienceId && (
              <label className="block">
                <span className="text-sm text-gray-600 font-dm-sans">Grupo</span>
                <select
                  value={audienceId}
                  onChange={(event) => {
                    setAudienceId(event.target.value);
                    setPreview(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
                >
                  <option value="">Seleccionar</option>
                  {audienceOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name} ({option.count ?? 0})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {isManualEmailsAudience && (
            <label className="mt-4 block">
              <span className="text-sm text-gray-600 font-dm-sans">Destinatarios</span>
              <textarea
                value={manualEmails}
                onChange={(event) => {
                  setManualEmails(event.target.value);
                  setPreview(null);
                }}
                rows={4}
                placeholder={"persona@ejemplo.com\notra@ejemplo.com"}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
                aria-describedby="manual-emails-help"
              />
              <span
                id="manual-emails-help"
                className="mt-2 block text-sm text-gray-500 font-dm-sans"
              >
                Escribe una o varias direcciones, separadas por comas, punto y coma o saltos de
                línea. No es necesario que estén registradas en la web. Cada persona recibirá su
                propio correo.
              </span>
            </label>
          )}

          {isSelectedUsersAudience && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="block">
                <span className="text-sm text-gray-600 font-dm-sans">Buscar usuario</span>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleUserSearch();
                        }
                      }}
                      placeholder="Nombre o email"
                      className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUserSearch}
                    disabled={searchingUsers}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4944a4] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d3a8a] disabled:opacity-50"
                  >
                    {searchingUsers ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Buscar
                  </button>
                </div>
              </label>

              {selectedUsers.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Seleccionados
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-full bg-[#f8f0f5] px-3 py-1 text-sm text-[#654177]"
                      >
                        <span className="truncate">
                          {user.name || "Sin nombre"} · {user.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelectedUser(user.id)}
                          className="rounded-full p-0.5 text-[#8A4BAF] hover:bg-white"
                          aria-label={`Quitar ${user.email}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {userResults.length > 0 && (
                <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white">
                  {userResults.map((user) => {
                    const isSelected = selectedUsers.some((selected) => selected.id === user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addSelectedUser(user)}
                        disabled={isSelected}
                        className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 text-left last:border-b-0 hover:bg-[#f8f0f5] disabled:cursor-default disabled:bg-gray-50"
                      >
                        <span>
                          <span className="block text-sm font-medium text-gray-900">
                            {user.name || "Sin nombre"}
                          </span>
                          <span className="block text-xs text-gray-500">{user.email}</span>
                          {user.activeMembership && (
                            <span className="mt-1 inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                              {user.activeMembership}
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                            isSelected ? "bg-gray-100 text-gray-500" : "bg-[#4944a4] text-white"
                          }`}
                        >
                          {isSelected ? "Añadido" : "Añadir"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-gray-600 font-dm-sans">Título interno</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600 font-dm-sans">Asunto</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm text-gray-600 font-dm-sans">Mensaje</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={9}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
            />
          </label>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canPreview || loadingPreview}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#8A4BAF] px-4 py-2 text-sm font-semibold text-[#654177] transition-colors hover:bg-[#f8f0f5] disabled:opacity-50"
            >
              {loadingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Previsualizar audiencia
            </button>
            <button
              type="button"
              onClick={handleCreateCampaign}
              disabled={!canCreate || creating}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#654177] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#563666] disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Crear campaña
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
              <Users className="h-5 w-5" />
              Destinatarios
            </h2>
            <p className="text-3xl font-semibold text-[#4944a4]">{preview?.count ?? 0}</p>
            <div className="mt-4 max-h-64 space-y-2 overflow-auto">
              {preview?.recipients.map((recipient) => (
                <div key={recipient.email} className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-sm font-medium text-gray-800">
                    {recipient.name || "Sin nombre"}
                  </p>
                  <p className="text-xs text-gray-500">{recipient.email}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5" />
              Prueba
            </h2>
            <input
              type="email"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              placeholder="email@dominio.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={!subject.trim() || !body.trim() || !testEmail.trim() || sendingTest}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#4944a4] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d3a8a] disabled:opacity-50"
            >
              {sendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Enviar prueba
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="font-gazeta text-xl text-[#654177]">Campañas recientes</h2>
          <button
            type="button"
            onClick={refreshCampaigns}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Campaña</th>
                <th className="px-4 py-3">Audiencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Progreso</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-900">{campaign.title}</p>
                    <p className="text-sm text-gray-500">{campaign.subject}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{campaign.audienceName}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-[#f8f0f5] px-2 py-1 text-xs font-medium text-[#654177]">
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">
                    {campaign.sent}/{campaign.totalRecipients} enviados
                    {campaign.failed > 0 ? ` · ${campaign.failed} fallidos` : ""}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {new Date(campaign.createdAt).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={5}>
                    Sin campañas todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
