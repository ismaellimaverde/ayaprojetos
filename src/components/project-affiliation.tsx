"use client";
import { useState } from "react";

export type CompanyOption = {
  id: string;
  name: string;
  kind: string;
  status: string;
  parent_id?: string | null;
};
export function ProjectAffiliation({
  companies,
  current,
}: {
  companies: CompanyOption[];
  current: string | null;
}) {
  const linked = companies.find((c) => c.id === current);
  const parent =
    linked?.kind === "unit"
      ? companies.find((c) => c.id === linked.parent_id && c.kind === "company")
      : undefined;
  const initialCompany =
    linked?.kind === "company" ? linked.id : (parent?.id ?? "");
  const legacy = !!current && !initialCompany;
  const [company, setCompany] = useState(
    legacy ? "preserve-current" : initialCompany,
  );
  const [unit, setUnit] = useState(parent ? linked!.id : "");
  const eligible = companies.filter(
    (c) =>
      c.kind === "company" &&
      (c.status === "active" || c.id === initialCompany),
  );
  const units = companies.filter(
    (c) =>
      c.kind === "unit" &&
      c.parent_id === company &&
      (c.status === "active" || c.id === current),
  );
  return (
    <>
      <input
        type="hidden"
        name="company_id"
        value={
          company === "preserve-current" ? (current ?? "") : unit || company
        }
      />
      <label>
        Empresa
        <select
          value={company}
          onChange={(e) => {
            setCompany(e.target.value);
            setUnit("");
          }}
        >
          <option value="">Projeto geral da organização</option>
          {legacy && (
            <option value="preserve-current">
              Manter vínculo atual: {linked?.name ?? "registro existente"}
              {linked?.kind === "brand" ? " (Marca)" : ""}
            </option>
          )}
          {eligible.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.status !== "active" ? " (arquivada)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Unidade (opcional)
        <select
          value={unit}
          disabled={!company || company === "preserve-current"}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option value="">Sem unidade específica</option>
          {units.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.status !== "active" ? " (arquivada)" : ""}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
