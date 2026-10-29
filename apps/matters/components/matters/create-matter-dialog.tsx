"use client";

import { FileTextIcon, UploadIcon, XIcon } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";

import {
  createMatterAction,
  listClientsAction,
  peekFileNumberAction,
} from "@/lib/matters/actions";
import { extractMatterIntakeAction } from "@/lib/matters/extract-intake-action";
import {
  extractableDocumentFormat,
  MAX_MATTER_FILES_PER_UPLOAD,
  validateMatterFileMeta,
} from "@/lib/matters/files-types";
import {
  emptyIntakeDraft,
  matchExistingClient,
  type MatterIntakeDraft,
} from "@/lib/matters/intake";
import { LEGAL_AREAS, PARTY_ROLE_LABELS } from "@/lib/matters/labels";
import { suggestShortTitle } from "@/lib/matters/title";
import type {
  ClientListItem,
  MatterCollisionMatch,
  MatterListItem,
} from "@/lib/matters/types";
import type { ClientKind } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function CreateMatterDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (matter: MatterListItem) => void;
}) {
  const titleId = useId();
  const [step, setStep] = useState<"drop" | "review">("drop");
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [draft, setDraft] = useState<MatterIntakeDraft>(emptyIntakeDraft());
  const [files, setFiles] = useState<File[]>([]);
  const [titleTouched, setTitleTouched] = useState(false);
  const [fileNumber, setFileNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatterCollisionMatch[]>([]);
  const [collisionReason, setCollisionReason] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const suggestedTitle = useMemo(
    () => suggestShortTitle(draft.clientName, draft.opponentName),
    [draft.clientName, draft.opponentName]
  );

  useEffect(() => {
    if (!open) return;
    setStep("drop");
    setDraft(emptyIntakeDraft());
    setFiles([]);
    setTitleTouched(false);
    setError(null);
    setMatches([]);
    setCollisionReason("");
    setDragOver(false);
    void Promise.all([listClientsAction(), peekFileNumberAction()]).then(
      ([items, nextNumber]) => {
        setClients(items);
        setFileNumber(nextNumber);
      }
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function patchDraft<K extends keyof MatterIntakeDraft>(
    key: K,
    value: MatterIntakeDraft[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addFiles(incoming: File[]) {
    setError(null);
    setFiles((current) => {
      const next = [...current];
      for (const file of incoming) {
        const metaError = validateMatterFileMeta(file.name, file.size);
        if (metaError) {
          setError(metaError);
          continue;
        }
        if (next.length >= MAX_MATTER_FILES_PER_UPLOAD) {
          setError(`Maximal ${MAX_MATTER_FILES_PER_UPLOAD} Dateien.`);
          break;
        }
        if (
          next.some(
            (item) =>
              item.name === file.name && item.size === file.size
          )
        ) {
          continue;
        }
        next.push(file);
      }
      return next;
    });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  async function goReview() {
    setError(null);
    const extractFile = files.find((file) =>
      extractableDocumentFormat(file.name, file.type)
    );
    if (!extractFile) {
      setDraft((current) => matchExistingClient(current, clients));
      setStep("review");
      return;
    }
    setExtracting(true);
    const formData = new FormData();
    formData.append("file", extractFile);
    const result = await extractMatterIntakeAction(formData);
    setExtracting(false);
    if (!result.success) {
      setError(result.error);
      setStep("review");
      return;
    }
    setDraft((current) => ({
      ...current,
      ...result.draft,
      clientId: result.draft.clientId || current.clientId,
    }));
    setStep("review");
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    const result = await createMatterAction(
      {
        clientId: draft.clientId || undefined,
        clientKind: draft.clientKind,
        clientName: draft.clientName,
        clientFirstName: draft.clientFirstName,
        clientLastName: draft.clientLastName,
        clientStreet: draft.clientStreet,
        clientPostalCode: draft.clientPostalCode,
        clientCity: draft.clientCity,
        opponentName: draft.opponentName,
        subject: draft.subject,
        title: titleTouched ? draft.title : suggestedTitle,
        legalArea: draft.legalArea,
        courtName: draft.courtName,
        courtFileNumber: draft.courtFileNumber,
        amountInDispute: draft.amountInDispute,
        collisionReason: matches.length > 0 ? collisionReason : undefined,
      },
      files.length > 0 ? formData : undefined
    );
    setSaving(false);
    if (result.success) {
      onCreated(result.matter);
      return;
    }
    if ("error" in result) {
      setError(result.error);
      setStep("review");
      return;
    }
    setMatches(result.matches);
    setStep("review");
  }

  const fieldClass =
    "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/25 disabled:opacity-60";
  const busy = extracting || saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/20"
        aria-label="Schließen"
        onClick={onClose}
      />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={(event) => {
          void submit(event);
        }}
        className="relative max-h-[90vh] w-full max-w-[32rem] overflow-y-auto rounded-2xl bg-card p-6 shadow-[var(--shadow-soft)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id={titleId}
              className="font-heading text-lg font-medium tracking-tight"
            >
              Akte anlegen
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {fileNumber
                ? `Aktennummer ${fileNumber}`
                : "Dokumente ablegen oder später nachtragen."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Schließen"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {step === "drop" ? (
          <div className="mt-5 grid gap-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "rounded-2xl border border-dashed px-4 py-10 text-center transition-colors",
                dragOver
                  ? "border-foreground/40 bg-muted/80"
                  : "border-border bg-muted/40"
              )}
            >
              <UploadIcon className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-[14px]">Dokumente hierher ziehen</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                PDF, Word oder Bild — optional. Daten werden vorausgefüllt.
              </p>
              <label className="mt-4 inline-flex h-9 cursor-pointer items-center rounded-full bg-foreground px-3.5 text-[13px] font-medium text-background">
                Dateien wählen
                <input
                  type="file"
                  multiple
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {files.length > 0 ? (
              <ul className="grid gap-1.5">
                {files.map((file) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-[13px]"
                  >
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={`${file.name} entfernen`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((item) => item !== file)
                        )
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="matter-client" className="text-[13px] font-medium">
                Mandant
              </label>
              <select
                id="matter-client"
                value={draft.clientId}
                disabled={busy}
                onChange={(event) => {
                  const id = event.target.value;
                  const selected = clients.find((item) => item.id === id);
                  if (!selected) {
                    patchDraft("clientId", "");
                    return;
                  }
                  setDraft((current) => ({
                    ...current,
                    clientId: selected.id,
                    clientKind: selected.kind,
                    clientName: selected.name,
                    clientFirstName: selected.firstName,
                    clientLastName: selected.lastName,
                    clientStreet: selected.street,
                    clientPostalCode: selected.postalCode,
                    clientCity: selected.city,
                  }));
                }}
                className={fieldClass}
              >
                <option value="">Neuer Mandant</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <label className="grid gap-1.5 text-[13px] font-medium">
                Art
                <select
                  value={draft.clientKind}
                  disabled={busy}
                  onChange={(event) =>
                    patchDraft("clientKind", event.target.value as ClientKind)
                  }
                  className={fieldClass}
                >
                  <option value="company">Firma</option>
                  <option value="person">Person</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-[13px] font-medium">
                Name
                <input
                  value={draft.clientName}
                  disabled={busy}
                  onChange={(event) =>
                    patchDraft("clientName", event.target.value)
                  }
                  placeholder="optional"
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-3">
              <input
                value={draft.clientStreet}
                disabled={busy}
                onChange={(event) =>
                  patchDraft("clientStreet", event.target.value)
                }
                placeholder="Straße"
                className={fieldClass}
              />
              <input
                value={draft.clientPostalCode}
                disabled={busy}
                onChange={(event) =>
                  patchDraft("clientPostalCode", event.target.value)
                }
                placeholder="PLZ"
                className={fieldClass}
              />
              <input
                value={draft.clientCity}
                disabled={busy}
                onChange={(event) =>
                  patchDraft("clientCity", event.target.value)
                }
                placeholder="Ort"
                className={fieldClass}
              />
            </div>
            <label className="grid gap-1.5 text-[13px] font-medium">
              Gegner
              <input
                value={draft.opponentName}
                disabled={busy}
                onChange={(event) =>
                  patchDraft("opponentName", event.target.value)
                }
                placeholder="optional"
                className={fieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium">
              Gegenstand
              <input
                value={draft.subject}
                disabled={busy}
                onChange={(event) => patchDraft("subject", event.target.value)}
                placeholder="wegen …"
                className={fieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-[13px] font-medium">
              Kurzbezeichnung
              <input
                value={titleTouched ? draft.title : suggestedTitle}
                disabled={busy}
                onChange={(event) => {
                  setTitleTouched(true);
                  patchDraft("title", event.target.value);
                }}
                placeholder="Neue Akte"
                className={fieldClass}
              />
            </label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <label className="grid gap-1.5 text-[13px] font-medium">
                Rechtsgebiet
                <select
                  value={draft.legalArea}
                  disabled={busy}
                  onChange={(event) =>
                    patchDraft("legalArea", event.target.value)
                  }
                  className={fieldClass}
                >
                  <option value="">—</option>
                  {LEGAL_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-[13px] font-medium">
                Gericht
                <input
                  value={draft.courtName}
                  disabled={busy}
                  onChange={(event) =>
                    patchDraft("courtName", event.target.value)
                  }
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <label className="grid gap-1.5 text-[13px] font-medium">
                Aktenzeichen
                <input
                  value={draft.courtFileNumber}
                  disabled={busy}
                  onChange={(event) =>
                    patchDraft("courtFileNumber", event.target.value)
                  }
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-[13px] font-medium">
                Streitwert
                <input
                  value={draft.amountInDispute}
                  disabled={busy}
                  onChange={(event) =>
                    patchDraft("amountInDispute", event.target.value)
                  }
                  className={fieldClass}
                />
              </label>
            </div>
          </div>
        )}

        {matches.length > 0 ? (
          <div className="mt-5 rounded-xl border border-border bg-muted/50 p-3">
            <p className="text-[13px] font-medium">Mögliche Kollision</p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-muted-foreground">
              {matches.map((match) => (
                <li key={`${match.matterId}-${match.role}-${match.name}`}>
                  {match.name} ist {PARTY_ROLE_LABELS[match.role].toLowerCase()}{" "}
                  in {match.fileNumber ? `${match.fileNumber} · ` : ""}
                  {match.matterTitle}
                </li>
              ))}
            </ul>
            <label
              htmlFor="matter-collision-reason"
              className="mt-3 block text-[13px] font-medium text-foreground"
            >
              Trotzdem anlegen, Begründung
            </label>
            <textarea
              id="matter-collision-reason"
              required
              value={collisionReason}
              onChange={(event) => setCollisionReason(event.target.value)}
              disabled={busy}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {step === "review" ? (
            <button
              type="button"
              onClick={() => setStep("drop")}
              className="inline-flex h-10 items-center rounded-lg px-3 text-sm hover:bg-muted"
            >
              Zurück
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-lg px-3 text-sm hover:bg-muted"
            >
              Abbrechen
            </button>
          )}
          {step === "drop" ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void submit();
                }}
                className="inline-flex h-10 items-center rounded-full px-4 text-sm hover:bg-muted disabled:opacity-50"
              >
                {saving ? "Anlegen…" : "Sofort arbeiten"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void goReview();
                }}
                className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
              >
                {extracting ? "Lesen…" : "Daten prüfen"}
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
            >
              {saving
                ? "Anlegen…"
                : matches.length > 0
                  ? "Trotzdem anlegen"
                  : "Akte anlegen"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
