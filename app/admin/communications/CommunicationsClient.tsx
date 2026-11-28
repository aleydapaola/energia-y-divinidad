"use client";

import { Eye, Loader2, Mail, Play, RefreshCw, Search, Send, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import { CampaignAttachments } from "./CampaignAttachments";

import type { CampaignAttachmentView } from "@/lib/campaign-attachment";
import type { CampaignBlock, CampaignKind } from "@/lib/campaign-content";
import type { CommunicationAudienceOptions, EmailRecipientCandidate } from "@/lib/email-audiences";


type AudienceType =
  | "ALL_USERS"
  | "COURSE"
  | "MEMBERSHIP"
  | "EVENT"
  | "SELECTED_USERS"
  | "MANUAL_EMAILS"
  | "COMBINED";

type Group = { type: "COURSE" | "MEMBERSHIP" | "EVENT"; id: string; name: string };

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
  fingerprint: string;
  count: number;
  recipients: EmailRecipientCandidate[];
}

interface CommunicationsClientProps {
  options: CommunicationAudienceOptions;
  initialCampaigns: CampaignRow[];
}

const audienceLabels: Record<AudienceType, string> = {
  COMBINED: "Grupos y usuarios",
  ALL_USERS: "Todos los usuarios",
  COURSE: "Alumnos de un curso",
  MEMBERSHIP: "Miembros de un plan",
  EVENT: "Inscritos de un evento",
  SELECTED_USERS: "Usuarios seleccionados",
  MANUAL_EMAILS: "Direcciones de correo",
};

export function CommunicationsClient({ options, initialCampaigns }: CommunicationsClientProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [audienceType, setAudienceType] = useState<AudienceType>("COMBINED");
  const [audienceId, setAudienceId] = useState("");
  const [groupChoice, setGroupChoice] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<CampaignKind | "">("");
  const [blocks, setBlocks] = useState<CampaignBlock[]>([]);
  const [draft, setDraft] = useState<{ id: string; updatedAt: string } | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachments, setAttachments] = useState<CampaignAttachmentView[]>([]);
  const [messagePreview, setMessagePreview] = useState<string | null>(null);
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

  const isCombined = audienceType === "COMBINED";
  const isSelectedUsersAudience = audienceType === "SELECTED_USERS" || isCombined;
  const availableGroups: Group[] = [
    ...options.courses.map(({ id, name }) => ({
      type: "COURSE" as const,
      id,
      name: `Curso · ${name}`,
    })),
    ...options.membershipTiers.map(({ id, name }) => ({
      type: "MEMBERSHIP" as const,
      id,
      name: `Membresía · ${name}`,
    })),
    ...options.events.map(({ id, name }) => ({
      type: "EVENT" as const,
      id,
      name: `Evento · ${name}`,
    })),
  ];
  const isManualEmailsAudience = audienceType === "MANUAL_EMAILS";
  const requiresAudienceId =
    audienceType !== "ALL_USERS" && !isSelectedUsersAudience && !isManualEmailsAudience;
  const selectedUserIds = selectedUsers.map((user) => user.id);
  const audienceSelection = {
    audienceType,
    audienceId: requiresAudienceId ? audienceId : null,
    userIds: isSelectedUsersAudience ? selectedUserIds : undefined,
    manualEmails: isManualEmailsAudience ? manualEmails : undefined,
    groups: isCombined ? groups.map(({ type, id }) => ({ type, id })) : undefined,
  };

  async function refreshCampaigns() {
    const res = await fetch("/api/admin/communications/campaigns");
    if (!res.ok) {
      return;
    }
    setCampaigns(await res.json());
  }

  async function saveDraft() {
    setDraftBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        draft ? `/api/admin/communications/drafts/${draft.id}` : "/api/admin/communications/drafts",
        {
          method: draft ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            subject,
            body,
            blocks,
            kind: kind || null,
            updatedAt: draft?.updatedAt,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo guardar el borrador");
      }
      setDraft({ id: data.id, updatedAt: data.updatedAt });
      setMessage("Borrador guardado");
      await refreshCampaigns();
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo guardar el borrador");
    } finally {
      setDraftBusy(false);
    }
  }

  async function openDraft(id: string) {
    setDraftBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/communications/drafts/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo abrir el borrador");
      }
      setDraft({ id: data.id, updatedAt: data.updatedAt });
      setTitle(data.title);
      setSubject(data.subject);
      setBody(data.body);
      setKind(data.kind ?? "");
      setAttachments(data.attachments ?? []);
      setBlocks(data.contentBlocks ?? []);
      setAudienceType("COMBINED");
      setAudienceId("");
      setGroupChoice("");
      setGroups([]);
      setSelectedUsers([]);
      setManualEmails("");
      setMessagePreview(null);
      setPreview(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo abrir el borrador");
    } finally {
      setDraftBusy(false);
    }
  }

  async function previewMessage() {
    setError(null);
    setMessagePreview(null);
    try {
      const res = await fetch("/api/admin/communications/message-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, subject, body, blocks, draftId: draft?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo previsualizar el correo");
      }
      setMessagePreview(data.html);
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo previsualizar el correo");
    }
  }

  function changeBlock(index: number, block: CampaignBlock) {
    setBlocks((current) => current.map((item, position) => (position === index ? block : item)));
    setMessagePreview(null);
  }

  async function handlePreview() {
    setLoadingPreview(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/communications/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audienceSelection),
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
        body: JSON.stringify({ to: testEmail, kind, subject, body, blocks, draftId: draft?.id }),
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
    if (
      !preview?.count ||
      !confirm(`¿Poner en cola el correo para los ${preview.count} destinatarios confirmados?`)
    ) {
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
          kind,
          subject,
          body,
          blocks,
          draft,
          ...audienceSelection,
          audienceFingerprint: preview.fingerprint,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setPreview(null);
        }
        setError(data.error ?? "No se pudo crear la campaña");
        return;
      }

      setMessage(`Campaña creada con ${data.recipients} destinatario(s)`);
      setTitle("");
      setSubject("");
      setBody("");
      setKind("");
      setBlocks([]);
      setDraft(null);
      setAttachments([]);
      setGroups([]);
      setGroupChoice("");
      setMessagePreview(null);
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

      setMessage(
        `Lote procesado: ${data.successful} aceptados, ${data.failed} fallidos, ${data.skipped} omitidos y ${data.deferred} aplazados`
      );
      await refreshCampaigns();
    } finally {
      setProcessing(false);
    }
  }

  const canPreview =
    (!requiresAudienceId || Boolean(audienceId)) &&
    (!isSelectedUsersAudience || selectedUsers.length > 0 || (isCombined && groups.length > 0)) &&
    (!isManualEmailsAudience || Boolean(manualEmails.trim()));
  const canCreate =
    Boolean(kind) &&
    title.trim() &&
    subject.trim() &&
    body.trim() &&
    canPreview &&
    Boolean(preview?.count);

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
        <div className="min-w-0 xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-gazeta text-xl text-[#654177] flex items-center gap-2 mb-5">
            <Send className="h-5 w-5" />
            {draft ? "Editar borrador" : "Nueva campaña"}
          </h2>

          <label className="mb-4 block text-sm text-gray-600">
            Tipo de correo
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as CampaignKind | "");
                setMessagePreview(null);
              }}
              className="mt-1 block min-h-11 w-full rounded-lg border border-gray-300 px-3"
            >
              <option value="">Seleccionar tipo</option>
              <option value="NEWSLETTER">Newsletter</option>
              <option value="OPERATIONAL">Aviso operativo</option>
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-gray-600 font-dm-sans">Audiencia</span>
              <select
                value={audienceType}
                onChange={(event) => {
                  setAudienceType(event.target.value as AudienceType);
                  setAudienceId("");
                  setGroups([]);
                  setGroupChoice("");
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

          {isCombined && (
            <div className="mt-4 space-y-2">
              <label className="block text-sm">
                Añadir grupo
                <select
                  className="mt-1 block min-h-11 w-full rounded-lg border px-3"
                  value={groupChoice}
                  onChange={(event) => setGroupChoice(event.target.value)}
                >
                  <option value="">Seleccionar grupo</option>
                  {availableGroups.map((group) => {
                    const key = `${group.type}:${group.id}`;
                    return (
                      <option key={key} value={key}>
                        {group.name}
                      </option>
                    );
                  })}
                </select>
              </label>
              <button
                type="button"
                className="min-h-11 rounded-lg border px-3 text-sm"
                disabled={!groupChoice || groups.length >= 50}
                onClick={() => {
                  const group = availableGroups.find(
                    (item) => `${item.type}:${item.id}` === groupChoice
                  );
                  if (
                    group &&
                    !groups.some((item) => item.type === group.type && item.id === group.id)
                  ) {
                    setGroups((current) => [...current, group]);
                    setPreview(null);
                  }
                  setGroupChoice("");
                }}
              >
                Añadir grupo
              </button>
              <ul className="space-y-1">
                {groups.map((group) => (
                  <li
                    key={`${group.type}:${group.id}`}
                    className="flex items-center gap-2 break-words text-sm"
                  >
                    <span>{group.name}</span>
                    <button
                      type="button"
                      aria-label={`Quitar ${group.name}`}
                      className="min-h-11 shrink-0 px-2 text-[#654177]"
                      onClick={() => {
                        setGroups((current) =>
                          current.filter((item) => item.type !== group.type || item.id !== group.id)
                        );
                        setPreview(null);
                      }}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                onChange={(event) => {
                  setSubject(event.target.value);
                  setMessagePreview(null);
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm text-gray-600 font-dm-sans">Mensaje</span>
            <textarea
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setMessagePreview(null);
              }}
              rows={9}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
            />
          </label>

          {blocks.map((block, index) => (
            <fieldset key={index} className="mt-4 min-w-0 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">
                {block.type === "link" ? "Enlace" : "Imagen de Sanity"} {index + 1}
              </legend>
              <label className="block text-sm">
                {block.type === "link" ? "Texto del enlace" : "Texto alternativo"}
                <input
                  value={block.type === "link" ? block.label : block.alt}
                  onChange={(event) =>
                    changeBlock(
                      index,
                      block.type === "link"
                        ? { ...block, label: event.target.value }
                        : { ...block, alt: event.target.value }
                    )
                  }
                  className="mt-1 block min-h-11 w-full rounded-lg border px-3"
                />
              </label>
              <label className="mt-2 block text-sm">
                {block.type === "link" ? "URL del enlace" : "URL pública de Sanity"}
                <input
                  type="url"
                  value={block.url}
                  onChange={(event) => changeBlock(index, { ...block, url: event.target.value })}
                  className="mt-1 block min-h-11 w-full rounded-lg border px-3"
                />
              </label>
              <button
                type="button"
                className="min-h-11 text-sm font-semibold text-[#654177]"
                onClick={() => {
                  setBlocks((current) => current.filter((_, position) => position !== index));
                  setMessagePreview(null);
                }}
              >
                Quitar {block.type === "link" ? "enlace" : "imagen"}
              </button>
            </fieldset>
          ))}

          <CampaignAttachments
            key={draft?.id ?? "new"}
            draftId={draft?.id}
            attachments={attachments}
            onChange={(value) => {
              setAttachments(value);
              setMessagePreview(null);
            }}
            onBusy={setAttachmentBusy}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-lg border px-3 text-sm"
              disabled={blocks.length >= 20}
              onClick={() => {
                setBlocks((current) => [...current, { type: "link", label: "", url: "" }]);
                setMessagePreview(null);
              }}
            >
              Añadir enlace
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg border px-3 text-sm"
              disabled={blocks.length >= 20}
              onClick={() => {
                setBlocks((current) => [...current, { type: "image", alt: "", url: "" }]);
                setMessagePreview(null);
              }}
            >
              Añadir imagen
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg border px-3 text-sm"
              disabled={draftBusy || creating || attachmentBusy}
              onClick={saveDraft}
            >
              Guardar borrador
            </button>
            {draft && (
              <button
                type="button"
                className="min-h-11 rounded-lg border px-3 text-sm"
                disabled={draftBusy || creating || attachmentBusy}
                onClick={() => {
                  setDraft(null);
                  setAttachments([]);
                  setTitle("");
                  setSubject("");
                  setBody("");
                  setKind("");
                  setBlocks([]);
                  setMessagePreview(null);
                }}
              >
                Nuevo borrador
              </button>
            )}
            <button
              type="button"
              className="min-h-11 rounded-lg border px-3 text-sm"
              disabled={!kind || !subject.trim() || !body.trim() || attachmentBusy}
              onClick={previewMessage}
            >
              Vista previa móvil
            </button>
          </div>
          {messagePreview && (
            <iframe
              title="Vista previa móvil del correo"
              sandbox=""
              srcDoc={messagePreview}
              className="mt-4 h-[560px] w-full max-w-[375px] rounded-lg border"
            />
          )}

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
              disabled={!canCreate || creating || draftBusy || attachmentBusy}
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

        <div className="min-w-0 space-y-6">
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
              autoCapitalize="none"
              autoCorrect="off"
              onBlur={(event) => setTestEmail(event.target.value.trim().toLowerCase())}
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
              placeholder="email@dominio.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-dm-sans focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={
                !kind ||
                !subject.trim() ||
                !body.trim() ||
                !testEmail.trim() ||
                sendingTest ||
                attachmentBusy
              }
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
                    {campaign.status === "DRAFT" ? (
                      <button
                        type="button"
                        disabled={draftBusy || creating || attachmentBusy}
                        className="min-h-11 text-left font-semibold text-[#654177]"
                        onClick={() => openDraft(campaign.id)}
                      >
                        Abrir borrador · {campaign.title || campaign.subject || "Sin título"}
                      </button>
                    ) : (
                      <p className="font-medium text-gray-900">{campaign.title}</p>
                    )}
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
