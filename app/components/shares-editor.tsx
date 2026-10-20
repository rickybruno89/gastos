import { useState } from "react";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "./ui";
import { useContacts, useCreateContact } from "../lib/sharing";
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
  const [nickname, setNickname] = useState("");
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

  return (
    <div className="shares-editor">
      {rows.map((row, index) => (
        <div className="share-row" key={row.contactId}>
          <span className="share-name">
            {byId.get(row.contactId)?.nickname ?? "Contacto"}
          </span>
          <label className="share-percent">
            <span className="sr-only">
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
            className="icon-button"
            aria-label={`Quitar a ${byId.get(row.contactId)?.nickname}`}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {rows.length > 0 && (
        <div className="share-summary">
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
        <p className="error-message" role="alert">
          {parsed.error}
        </p>
      )}
      {available.length > 0 && (
        <div className="form-field">
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
        </div>
      )}
      <div className="form-field">
        <label htmlFor="share-new">Persona nueva</label>
        <div className="inline-field">
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
            disabled={create.isPending}
          >
            <UserPlus size={16} />
            Agregar
          </Button>
        </div>
        <span className="field-help">
          No necesita tener GastApp. El apodo es privado: solo lo ves vos.
        </span>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {rows.length === 0 && (
        <p className="field-help">
          <Plus size={12} aria-hidden="true" /> Agregá personas para repartir
          este gasto. El importe completo sigue siendo tuyo frente al proveedor.
        </p>
      )}
    </div>
  );
}
