import { useState } from "react";
import { Mail, Plus, Trash2, UserPlus } from "lucide-react";
import { FormField, Button } from "./ui";
import {
  useConnectionAction,
  useContacts,
  useCreateContact,
} from "../lib/sharing";
import { errorMessage } from "../lib/expenses";
import { formatShare, parseShare } from "../lib/format";
import type { ShareInput } from "../../shared/contracts/sharing";

export type ShareRow = { contactId: string; percent: string };

export function rowsFromShares(shares: ShareInput): ShareRow[] {
  return shares.map((share) => ({
    contactId: share.contactId,
    percent: formatShare(share.shareBps).replace("%", ""),
  }));
}

// Convierte las filas a basis points; el propietario conserva el resto.
export function sharesFromRows(
  rows: ShareRow[],
): { shares: ShareInput } | { error: string } {
  const shares: ShareInput = [];
  for (const row of rows) {
    const shareBps = parseShare(row.percent);
    if (!shareBps)
      return { error: "Cada porcentaje debe estar entre 0,01% y 100%." };
    shares.push({ contactId: row.contactId, shareBps });
  }
  if (shares.reduce((sum, s) => sum + s.shareBps, 0) > 10_000)
    return { error: "El reparto no puede superar el 100%." };
  return { shares };
}

export function SharesEditor({
  userId,
  rows,
  onChange,
}: {
  userId: string;
  rows: ShareRow[];
  onChange: (rows: ShareRow[]) => void;
}) {
  const contacts = useContacts(userId);
  const create = useCreateContact(userId);
  const invite = useConnectionAction(userId);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const active = (contacts.data ?? []).filter((c) => !c.archived);
  const byId = new Map((contacts.data ?? []).map((c) => [c.id, c]));
  const available = active.filter(
    (c) => !rows.some((row) => row.contactId === c.id),
  );
  const parsed = sharesFromRows(rows);
  const ownerBps =
    "shares" in parsed
      ? 10_000 - parsed.shares.reduce((sum, s) => sum + s.shareBps, 0)
      : null;

  function add(contactId: string) {
    onChange([...rows, { contactId, percent: "50" }]);
  }
  // Partes iguales entre vos y cada persona; el centésimo restante queda para vos.
  function equal() {
    const each = Math.floor(10_000 / (rows.length + 1));
    onChange(
      rows.map((row) => ({
        ...row,
        percent: formatShare(each).replace("%", ""),
      })),
    );
  }
  function createContact() {
    const name = nickname.trim();
    if (!name) return setError("Escribí un apodo para la persona.");
    setError("");
    create.mutate(
      { nickname: name },
      {
        onSuccess: (contact) => {
          setNickname("");
          add(contact.id);
        },
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }

  // Por email: crea (o reutiliza) el contacto e invita en un paso. No revela si
  // el email ya tiene cuenta; la invitación espera a que ingrese con ese email.
  async function inviteByEmail() {
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
      return setError("Escribí un email válido.");
    setError("");
    try {
      const existing = (contacts.data ?? []).find((c) => c.email === address);
      const contact =
        existing ??
        (await create.mutateAsync({
          nickname: address.split("@")[0].slice(0, 60),
          email: address,
        }));
      if (contact.archived)
        return setError(
          "Ese contacto está archivado. Restauralo en Compartidos.",
        );
      const linked =
        contact.connection &&
        ["PENDING", "ACCEPTED"].includes(contact.connection.status);
      if (!linked)
        await invite.mutateAsync({ action: "invite", id: contact.id });
      setEmail("");
      if (!rows.some((row) => row.contactId === contact.id)) add(contact.id);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  return (
    <div className="shares-editor mb-4.5 [background:#fafbfd] p-3.5 border border-solid border-[#e3e8f2] rounded-[10px]">
      {rows.map((row, index) => (
        <div
          className="share-row grid grid-cols-[minmax(0,_1fr)_96px_44px] items-center mb-2 gap-2"
          key={row.contactId}
        >
          <span className="share-name text-[0.875rem] font-[550] wrap-anywhere desktop:text-[12px]">
            {byId.get(row.contactId)?.nickname ?? "Contacto"}
          </span>
          <label className="share-percent flex items-center [background:white] px-2.5 py-0 border border-solid border-[#dce3ef] rounded-[8px] gap-1 focus-within:[outline:2px_solid_#597af0] focus-within:[outline-offset:2px] [&_input]:[outline:none] [&_input]:w-full [&_input]:min-h-11 [&_input]:text-[16px] [&_input]:text-right [&_input]:[background:transparent] [&_input]:border-0 [&_input]:border-none [&_input]:border-current desktop:[&_input]:min-h-10 desktop:[&_input]:text-[12px] [&_input[aria-invalid='true']]:text-[#b64f51]">
            <span className="sr-only absolute w-[1px] h-[1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap m-[-1px] p-0 border-0 border-none border-current">
              Porcentaje de {byId.get(row.contactId)?.nickname}
            </span>
            <input
              inputMode="decimal"
              value={row.percent}
              onChange={(event) =>
                onChange(
                  rows.map((r, i) =>
                    i === index ? { ...r, percent: event.target.value } : r,
                  ),
                )
              }
              aria-invalid={!parseShare(row.percent)}
            />
            <span aria-hidden="true">%</span>
          </label>
          <button
            type="button"
            className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
            aria-label={`Quitar a ${byId.get(row.contactId)?.nickname}`}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {rows.length > 0 && (
        <div className="share-summary flex items-center justify-between text-[0.875rem] mt-1 mb-3.5 text-muted mx-0 desktop:text-[12px] [&_strong]:text-ink">
          <span>
            Tu parte:{" "}
            <strong>{ownerBps !== null ? formatShare(ownerBps) : "—"}</strong>
          </span>
          <Button variant="ghost" onClick={equal}>
            Partes iguales
          </Button>
        </div>
      )}
      {"error" in parsed && rows.length > 0 && (
        <p
          className="error-message text-[12px] text-[#b64f51] leading-[1.7] mx-0 my-3"
          role="alert"
        >
          {parsed.error}
        </p>
      )}
      {available.length > 0 && (
        <FormField>
          <label htmlFor="share-add">Agregar a alguien</label>
          <select
            id="share-add"
            value=""
            onChange={(event) => event.target.value && add(event.target.value)}
          >
            <option value="">Elegí un contacto…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nickname}
                {c.connection?.status === "ACCEPTED" ? " · conectado" : ""}
              </option>
            ))}
          </select>
        </FormField>
      )}
      <FormField>
        <label htmlFor="share-new">Persona nueva</label>
        <div className="inline-field flex gap-2 [&_input]:flex-1 [&_input]:min-w-0">
          <input
            id="share-new"
            placeholder="Apodo, ej. Juan"
            value={nickname}
            maxLength={60}
            autoComplete="off"
            onChange={(event) => setNickname(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                createContact();
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={createContact}
            disabled={create.isPending || invite.isPending}
            loading={create.isPending && !create.variables?.email}
          >
            <UserPlus size={16} />
            Agregar
          </Button>
        </div>
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          No necesita tener GastApp. El apodo es privado: solo lo ves vos.
        </span>
      </FormField>
      <FormField>
        <label htmlFor="share-email">O invitala por email</label>
        <div className="inline-field flex gap-2 [&_input]:flex-1 [&_input]:min-w-0">
          <input
            id="share-email"
            type="email"
            inputMode="email"
            placeholder="persona@email.com"
            value={email}
            maxLength={254}
            autoComplete="off"
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void inviteByEmail();
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={() => void inviteByEmail()}
            disabled={create.isPending || invite.isPending}
            loading={
              invite.isPending ||
              (create.isPending && !!create.variables?.email)
            }
          >
            <Mail size={16} />
            Invitar
          </Button>
        </div>
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          Vos ves su parte desde ya. Cuando ingrese a GastApp con ese email y
          acepte, va a ver lo que comparten, con todo el historial.
        </span>
      </FormField>
      {error && (
        <p
          className="error-message text-[12px] text-[#b64f51] leading-[1.7] mx-0 my-3"
          role="alert"
        >
          {error}
        </p>
      )}
      {rows.length === 0 && (
        <p className="field-help text-[0.75rem] text-muted leading-[1.7]">
          <Plus size={12} aria-hidden="true" /> Agregá personas para repartir
          este gasto. El importe completo sigue siendo tuyo frente al proveedor.
        </p>
      )}
    </div>
  );
}
