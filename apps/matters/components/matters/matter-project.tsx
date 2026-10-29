"use client";

import {
  ClipboardListIcon,
  FileTextIcon,
  LandmarkIcon,
  StarIcon,
  StickyNoteIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { useMattersSession } from "@/components/app/matters-shell";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { AktenPathNav } from "@/components/matters/akten-path-nav";
import { MatterDocuments } from "@/components/matters/matter-documents";
import {
  addMatterPartyAction,
  deleteMatterPartyAction,
  updateMatterAction,
} from "@/lib/matters/actions";
import type { MatterFileRecord } from "@/lib/matters/files-types";
import type { MatterLetterListItem } from "@/lib/letters/types";
import { formatMatterDate } from "@/lib/matters/gallery";
import {
  EDITABLE_PARTY_ROLES,
  LEGAL_AREAS,
  MATTER_STATUS_LABELS,
  PARTY_ROLE_LABELS,
  PROCEEDING_INSTANCES,
} from "@/lib/matters/labels";
import { clientAktenPath } from "@/lib/matters/paths";
import type { MatterCardInput, MatterDetail, StaffListItem } from "@/lib/matters/types";
import type { ClientKind, MatterPartyRole, MatterStatus } from "@/lib/db/schema";

const fieldClass =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/25";

type RecentElement = {
  kind: "chat" | "file" | "letter";
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
  chatId?: string | null;
};

export function MatterProject({
  initial,
  staff,
  initialFiles,
  initialLetters,
}: {
  initial: MatterDetail;
  staff: StaffListItem[];
  initialFiles: MatterFileRecord[];
  initialLetters: MatterLetterListItem[];
}) {
  const {
    conversations,
    active,
    busy,
    draft,
    composerRef,
    setDraft,
    send,
    stop,
    openSidebar,
    openChat,
    closeChat,
    loadScope,
  } = useMattersSession();
  const [matter, setMatter] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<MatterCardInput>(cardFrom(initial));
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyRole, setPartyRole] = useState<MatterPartyRole>("opponent");
  const [partyKind, setPartyKind] = useState<ClientKind>("company");
  const [partyName, setPartyName] = useState("");
  const [partySaving, setPartySaving] = useState(false);
  const [files, setFiles] = useState(initialFiles);
  const [letters, setLetters] = useState(initialLetters);

  useEffect(() => {
    void loadScope(matter.id);
  }, [loadScope, matter.id]);

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  useEffect(() => {
    setLetters(initialLetters);
  }, [initialLetters]);

  const opponent = useMemo(
    () => matter.parties.find((party) => party.role === "opponent"),
    [matter.parties]
  );
  const matterChats = useMemo(
    () =>
      conversations.filter(
        (chat) => chat.matterId === matter.id && !chat.id.startsWith("draft-")
      ),
    [conversations, matter.id]
  );
  const pinned = matterChats.filter((chat) => chat.pinned);
  const recent = useMemo(() => {
    const chats: RecentElement[] = matterChats
      .filter((chat) => !chat.pinned)
      .map((chat) => ({
        kind: "chat" as const,
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt,
        pinned: chat.pinned,
      }));
    const docs: RecentElement[] = files.map((file) => ({
      kind: "file" as const,
      id: file.id,
      title: file.filename,
      updatedAt: file.updatedAt,
    }));
    const fromChats: RecentElement[] = matterChats.flatMap((chat) =>
      chat.letter
        ? [
            {
              kind: "letter" as const,
              id: chat.letter.id,
              title: chat.letter.title,
              updatedAt: chat.letter.updatedAt,
              chatId: chat.id,
            },
          ]
        : []
    );
    const letterItems: RecentElement[] = [
      ...letters.map((item) => ({
        kind: "letter" as const,
        id: item.id,
        title: item.title,
        updatedAt: item.updatedAt,
        chatId: item.chatId,
      })),
      ...fromChats.filter(
        (item) => !letters.some((letter) => letter.id === item.id)
      ),
    ];
    return [...chats, ...docs, ...letterItems].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [files, letters, matterChats]);
  const inSession = Boolean(
    active &&
      active.matterId === matter.id &&
      (active.messages.length > 0 || busy)
  );

  function patchForm<K extends keyof MatterCardInput>(
    key: K,
    value: MatterCardInput[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await updateMatterAction(matter.id, form);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMatter(result.matter);
    setForm(cardFrom(result.matter));
    setEditing(false);
  }

  async function addParty(event: FormEvent) {
    event.preventDefault();
    if (partySaving) return;
    setPartySaving(true);
    const result = await addMatterPartyAction({
      matterId: matter.id,
      role: partyRole,
      kind: partyKind,
      name: partyName,
    });
    setPartySaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMatter((current) => ({
      ...current,
      parties: [...current.parties, result.party],
    }));
    setPartyName("");
    setPartyOpen(false);
  }

  async function removeParty(partyId: string) {
    const result = await deleteMatterPartyAction(matter.id, partyId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMatter((current) => ({
      ...current,
      parties: current.parties.filter((party) => party.id !== partyId),
    }));
  }

  const rail = (
    <MatterRail
      matter={matter}
      opponentName={opponent?.name ?? ""}
      partyOpen={partyOpen}
      partyRole={partyRole}
      partyKind={partyKind}
      partyName={partyName}
      partySaving={partySaving}
      error={error}
      onEdit={() => {
        setForm(cardFrom(matter));
        setEditing(true);
      }}
      onToggleParty={() => setPartyOpen((value) => !value)}
      onPartyRole={setPartyRole}
      onPartyKind={setPartyKind}
      onPartyName={setPartyName}
      onAddParty={(event) => {
        void addParty(event);
      }}
      onRemoveParty={(partyId) => {
        void removeParty(partyId);
      }}
    />
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <AktenPathNav
        clientName={matter.clientName}
        clientHref={clientAktenPath(matter.clientId)}
        matterTitle={matter.title}
        onMatterClick={closeChat}
        onMenu={openSidebar}
      />

      {inSession ? (
        <ChatWorkspace matterId={matter.id} hideHeader />
      ) : (
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[46rem] px-5 py-6 sm:px-8 sm:py-8">
              <h1 className="font-heading text-[clamp(1.6rem,3vw,2.15rem)] font-medium tracking-[-0.03em] text-balance">
                {matter.title}
              </h1>

              <div className="mt-6">
                <ChatComposer
                  draft={draft}
                  busy={busy}
                  composerRef={composerRef}
                  onDraftChange={setDraft}
                  onSend={send}
                  onStop={stop}
                  placeholder={`Neuer Chat in ${matter.title}`}
                  variant="inline"
                />
              </div>

              <MatterDocuments
                matterId={matter.id}
                files={files}
                onFiles={setFiles}
              />

              {pinned.length > 0 ? (
                <ElementList
                  label="Angepinnt"
                  items={pinned.map((chat) => ({
                    kind: "chat",
                    id: chat.id,
                    title: chat.title,
                    updatedAt: chat.updatedAt,
                    pinned: true,
                  }))}
                  onSelectChat={openChat}
                />
              ) : null}

              <ElementList
                label="Letzte Elemente"
                items={recent}
                empty="Noch keine Chats, Dokumente oder Schreiben in dieser Akte."
                onSelectChat={openChat}
              />

              <div className="mt-10 xl:hidden">{rail}</div>
            </div>
          </div>

          <aside className="hidden w-[18.5rem] shrink-0 overflow-y-auto border-l border-border/80 xl:block">
            {rail}
          </aside>
        </div>
      )}

      {editing ? (
        <EditMatterDialog
          form={form}
          staff={staff}
          saving={saving}
          error={error}
          onPatch={patchForm}
          onClose={() => {
            setForm(cardFrom(matter));
            setEditing(false);
            setError(null);
          }}
          onSave={() => {
            void save();
          }}
        />
      ) : null}
    </section>
  );
}

function ElementList({
  label,
  items,
  empty,
  onSelectChat,
}: {
  label: string;
  items: RecentElement[];
  empty?: string;
  onSelectChat: (id: string) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-[13px] font-medium">{label}</h2>
      {items.length === 0 ? (
        empty ? (
          <p className="mt-3 text-[13px] text-muted-foreground">{empty}</p>
        ) : null
      ) : (
        <ul className="mt-1">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="border-b border-border/70">
              {item.kind === "file" ? (
                <a
                  href={`/api/matters/files/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80"
                >
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[13px] text-muted-foreground">
                    {formatMatterDate(item.updatedAt)}
                  </span>
                </a>
              ) : item.kind === "letter" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (item.chatId) onSelectChat(item.chatId);
                  }}
                  className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80"
                >
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[13px] text-muted-foreground">
                    {formatMatterDate(item.updatedAt)}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectChat(item.id)}
                  className="flex w-full items-center gap-3 py-3 text-left hover:opacity-80"
                >
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">
                    {item.title}
                    {item.pinned ? (
                      <StarIcon className="ml-1.5 inline size-3 fill-current align-[-1px] text-muted-foreground" />
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[13px] text-muted-foreground">
                    {formatMatterDate(item.updatedAt)}
                  </span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MatterRail({
  matter,
  opponentName,
  partyOpen,
  partyRole,
  partyKind,
  partyName,
  partySaving,
  error,
  onEdit,
  onToggleParty,
  onPartyRole,
  onPartyKind,
  onPartyName,
  onAddParty,
  onRemoveParty,
}: {
  matter: MatterDetail;
  opponentName: string;
  partyOpen: boolean;
  partyRole: MatterPartyRole;
  partyKind: ClientKind;
  partyName: string;
  partySaving: boolean;
  error: string | null;
  onEdit: () => void;
  onToggleParty: () => void;
  onPartyRole: (role: MatterPartyRole) => void;
  onPartyKind: (kind: ClientKind) => void;
  onPartyName: (name: string) => void;
  onAddParty: (event: FormEvent) => void;
  onRemoveParty: (partyId: string) => void;
}) {
  const cardBits = [
    matter.fileNumber,
    MATTER_STATUS_LABELS[matter.status],
    matter.legalArea,
  ].filter(Boolean);
  const peopleBits = [matter.clientName, opponentName].filter(Boolean);
  const proceedingBits = [
    matter.proceedingInstance,
    matter.courtName,
    matter.courtFileNumber,
  ].filter(Boolean);

  return (
    <div className="px-4 py-5">
      <RailBlock
        icon={<ClipboardListIcon className="size-4" strokeWidth={1.75} />}
        title="Aktendaten"
        action="Bearbeiten"
        onAction={onEdit}
      >
        <p>{cardBits.join(" · ")}</p>
        {peopleBits.length > 0 ? <p>{peopleBits.join(" · ")}</p> : null}
        {matter.clientStreet || matter.clientCity ? (
          <p>
            {[
              matter.clientStreet,
              [matter.clientPostalCode, matter.clientCity]
                .filter(Boolean)
                .join(" "),
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : null}
        {matter.subject ? <p>wegen {matter.subject}</p> : null}
        {matter.lawyerName ? <p>{matter.lawyerName}</p> : null}
      </RailBlock>

      <RailBlock
        icon={<UsersIcon className="size-4" strokeWidth={1.75} />}
        title="Beteiligte"
        action="Hinzufügen"
        onAction={onToggleParty}
      >
        {matter.parties.length === 0 ? (
          <p>Keine Beteiligten.</p>
        ) : (
          <ul className="space-y-1">
            {matter.parties.map((party) => (
              <li key={party.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {PARTY_ROLE_LABELS[party.role]} · {party.name}
                </span>
                {party.role !== "client" ? (
                  <button
                    type="button"
                    onClick={() => onRemoveParty(party.id)}
                    aria-label={`${party.name} entfernen`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-3" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {partyOpen ? (
          <form onSubmit={onAddParty} className="mt-3 grid gap-2">
            <select
              value={partyRole}
              onChange={(event) =>
                onPartyRole(event.target.value as MatterPartyRole)
              }
              className={fieldClass}
            >
              {EDITABLE_PARTY_ROLES.map((role) => (
                <option key={role} value={role}>
                  {PARTY_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <select
              value={partyKind}
              onChange={(event) =>
                onPartyKind(event.target.value as ClientKind)
              }
              className={fieldClass}
            >
              <option value="company">Firma</option>
              <option value="person">Person</option>
            </select>
            <input
              value={partyName}
              onChange={(event) => onPartyName(event.target.value)}
              placeholder="Name"
              className={fieldClass}
              required
            />
            <button
              type="submit"
              disabled={partySaving}
              className="inline-flex h-9 items-center justify-center rounded-full bg-foreground px-3 text-[13px] font-medium text-background disabled:opacity-50"
            >
              {partySaving ? "…" : "Hinzufügen"}
            </button>
          </form>
        ) : null}
      </RailBlock>

      <RailBlock
        icon={<LandmarkIcon className="size-4" strokeWidth={1.75} />}
        title="Verfahren"
        action="Bearbeiten"
        onAction={onEdit}
      >
        {proceedingBits.length > 0 ? (
          <p>{proceedingBits.join(" · ")}</p>
        ) : (
          <p>Noch kein Verfahren hinterlegt.</p>
        )}
      </RailBlock>

      <RailBlock
        icon={<StickyNoteIcon className="size-4" strokeWidth={1.75} />}
        title="Hinweise"
        action={matter.notes ? "Bearbeiten" : "Hinzufügen"}
        onAction={onEdit}
      >
        {matter.notes ? <p className="line-clamp-4">{matter.notes}</p> : null}
      </RailBlock>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RailBlock({
  icon,
  title,
  action,
  onAction,
  children,
}: {
  icon: ReactNode;
  title: string;
  action: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-border/70 py-3.5 first:pt-0 last:border-b-0">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px]">{title}</p>
            <button
              type="button"
              onClick={onAction}
              className="text-[13px] text-muted-foreground hover:text-foreground"
            >
              {action}
            </button>
          </div>
          <div className="mt-1 space-y-0.5 text-[12px] leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditMatterDialog({
  form,
  staff,
  saving,
  error,
  onPatch,
  onClose,
  onSave,
}: {
  form: MatterCardInput;
  staff: StaffListItem[];
  saving: boolean;
  error: string | null;
  onPatch: <K extends keyof MatterCardInput>(
    key: K,
    value: MatterCardInput[K]
  ) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/20"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="matter-edit-title"
        className="relative max-h-[90vh] w-full max-w-[36rem] overflow-y-auto rounded-2xl bg-card p-6 shadow-[var(--shadow-soft)]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="matter-edit-title"
            className="font-heading text-lg font-medium tracking-tight"
          >
            Aktendaten
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Mandant">
            <input
              value={form.clientName}
              onChange={(event) => onPatch("clientName", event.target.value)}
              className={fieldClass}
              placeholder="Neuer Mandant"
            />
          </Field>
          <Field label="Art">
            <select
              value={form.clientKind}
              onChange={(event) =>
                onPatch("clientKind", event.target.value as ClientKind)
              }
              className={fieldClass}
            >
              <option value="company">Firma</option>
              <option value="person">Person</option>
            </select>
          </Field>
          <Field label="Straße">
            <input
              value={form.clientStreet}
              onChange={(event) => onPatch("clientStreet", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:col-span-1">
            <Field label="PLZ">
              <input
                value={form.clientPostalCode}
                onChange={(event) =>
                  onPatch("clientPostalCode", event.target.value)
                }
                className={fieldClass}
              />
            </Field>
            <Field label="Ort">
              <input
                value={form.clientCity}
                onChange={(event) => onPatch("clientCity", event.target.value)}
                className={fieldClass}
              />
            </Field>
          </div>
          <Field label="Kurzbezeichnung">
            <input
              value={form.title}
              onChange={(event) => onPatch("title", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Gegenstand">
            <input
              value={form.subject}
              onChange={(event) => onPatch("subject", event.target.value)}
              className={fieldClass}
              placeholder="wegen …"
            />
          </Field>
          <Field label="Rechtsgebiet">
            <select
              value={form.legalArea}
              onChange={(event) => onPatch("legalArea", event.target.value)}
              className={fieldClass}
            >
              <option value="">—</option>
              {LEGAL_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sachbearbeiter">
            <select
              value={form.lawyerId ?? ""}
              onChange={(event) =>
                onPatch("lawyerId", event.target.value || null)
              }
              className={fieldClass}
            >
              <option value="">—</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assistenz">
            <select
              value={form.assistantId ?? ""}
              onChange={(event) =>
                onPatch("assistantId", event.target.value || null)
              }
              className={fieldClass}
            >
              <option value="">—</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Mandatsübernahme">
            <input
              type="date"
              value={form.openedAt}
              onChange={(event) => onPatch("openedAt", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                onPatch("status", event.target.value as MatterStatus)
              }
              className={fieldClass}
            >
              <option value="open">Offen</option>
              <option value="closed">Abgeschlossen</option>
            </select>
          </Field>
          <Field label="Gegenstandswert">
            <input
              value={form.amountInDispute}
              onChange={(event) =>
                onPatch("amountInDispute", event.target.value)
              }
              className={fieldClass}
              placeholder="optional"
            />
          </Field>
          <Field label="Instanz">
            <select
              value={form.proceedingInstance}
              onChange={(event) =>
                onPatch("proceedingInstance", event.target.value)
              }
              className={fieldClass}
            >
              <option value="">—</option>
              {PROCEEDING_INSTANCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gericht">
            <input
              value={form.courtName}
              onChange={(event) => onPatch("courtName", event.target.value)}
              className={fieldClass}
            />
          </Field>
          <Field label="Gerichtliches Aktenzeichen">
            <input
              value={form.courtFileNumber}
              onChange={(event) =>
                onPatch("courtFileNumber", event.target.value)
              }
              className={fieldClass}
            />
          </Field>
          <label className="grid gap-1 text-[12px] text-muted-foreground sm:col-span-2">
            Hinweise
            <textarea
              value={form.notes}
              onChange={(event) => onPatch("notes", event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/25"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-full px-4 text-sm text-muted-foreground hover:text-foreground"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-[12px] text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function cardFrom(matter: MatterDetail): MatterCardInput {
  return {
    title: matter.title,
    subject: matter.subject,
    legalArea: matter.legalArea,
    lawyerId: matter.lawyerId,
    assistantId: matter.assistantId,
    openedAt: matter.openedAt,
    status: matter.status,
    closedAt: matter.closedAt,
    amountInDispute: matter.amountInDispute,
    proceedingInstance: matter.proceedingInstance,
    courtName: matter.courtName,
    courtFileNumber: matter.courtFileNumber,
    notes: matter.notes,
    clientKind: matter.clientKind,
    clientName: matter.clientName,
    clientFirstName: matter.clientFirstName,
    clientLastName: matter.clientLastName,
    clientStreet: matter.clientStreet,
    clientPostalCode: matter.clientPostalCode,
    clientCity: matter.clientCity,
  };
}
