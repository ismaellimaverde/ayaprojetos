"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { updatedAtLabel } from "@/lib/document-metadata";
import { modules } from "@/lib/catalog";
import {
  areaDocument,
  consolidatedDocument,
  type LibraryDocument,
} from "@/lib/planning-document";
import type { SummaryDocument } from "@/lib/rich-summary";
import { printSummary } from "@/lib/print-summary";
import { SummaryView } from "./rich-summary";
export function ProjectLibrary({
  org,
  projectId,
  onOpenArea,
}: {
  org: string;
  projectId: string;
  onOpenArea: (area: string) => void;
}) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState<{
    title: string;
    content: SummaryDocument;
    updatedAt?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    api(`project-library/${projectId}`, org)
      .then((r) => {
        if (active) {
          setDocuments(r.documents);
          setProjectName(r.project_name);
        }
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [org, projectId]);
  async function open(area: string | undefined, exportPDF = false) {
    setBusy(true);
    setMessage("");
    setOpened(null);
    try {
      let content: SummaryDocument;
      let title: string;
      let updatedAt: string | undefined;
      if (area) {
        const r = await api(
          `module-content/${projectId}/${area}${exportPDF ? "/export" : ""}`,
          org,
        );
        content = areaDocument(area, r.document);
        title = `${projectName} — ${modules.find((m) => m.id === area)?.name}`;
        updatedAt = r.document.updated_at;
      } else {
        const r = await api(
          `project-library/${projectId}/complete${exportPDF ? "/export" : ""}`,
          org,
        );
        if (!r.documents.length)
          throw new Error("Nenhum conteúdo disponível para este acesso.");
        content = consolidatedDocument(r.documents);
        updatedAt = r.documents
          .map((d: LibraryDocument) => d.updated_at)
          .filter((date: string) => Number.isFinite(Date.parse(date)))
          .sort((a: string, b: string) => Date.parse(b) - Date.parse(a))[0];
        title = `${r.project_name} — Business Plan`;
      }
      if (exportPDF) printSummary(content, title);
      else setOpened({ title, content, updatedAt });
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (opened)
    return (
      <section
        className="library-workspace"
        aria-label="Documento da Biblioteca"
      >
        <div className="heading">
          <div>
            <h2>{opened.title}</h2>
            <p className="muted subtle">{updatedAtLabel(opened.updatedAt)}</p>
          </div>
          <button className="btn secondary" onClick={() => setOpened(null)}>
            Fechar documento
          </button>
        </div>
        {documents.every((d) => d.can_export) && (
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => open(undefined, true)}
          >
            Exportar Business Plan em PDF
          </button>
        )}
        <p className="muted subtle">
          Documento consolidado. Para alterar seu conteúdo, abra a área
          correspondente na Biblioteca.
        </p>
        <article className="panel library-document" aria-label={opened.title}>
          <SummaryView value={opened.content} />
        </article>
      </section>
    );
  return (
    <section aria-label="Biblioteca do projeto" className="stack">
      <div>
        <h2>Biblioteca</h2>
        <p className="muted">
          Documentos formados pelo conteúdo salvo em cada área. O Business Plan
          reúne as áreas disponíveis para seu acesso, na ordem do plano.
        </p>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando documentos…</p>
      ) : !documents.length ? (
        <div className="panel">
          <p>
            Os documentos aparecerão aqui quando as informações das áreas forem
            salvas.
          </p>
        </div>
      ) : (
        <>
          <article className="panel library-complete">
            <h3>Business Plan</h3>
            <p className="muted">
              Conteúdo consolidado das áreas preenchidas, com a data de
              atualização de cada documento.
            </p>
            <div className="row">
              <button
                className="btn module-access"
                disabled={busy}
                onClick={() => open(undefined)}
              >
                Ler Business Plan
              </button>
              {documents.every((d) => d.can_export) && (
                <button
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => open(undefined, true)}
                >
                  Exportar Business Plan em PDF
                </button>
              )}
            </div>
          </article>
          <div className="grid">
            {documents.map((d) => (
              <article className="panel module" key={d.area}>
                <h3>{modules.find((m) => m.id === d.area)?.name}</h3>
                <p className="muted subtle">{updatedAtLabel(d.updated_at)}</p>
                <div className="row">
                  <button
                    className="btn module-access"
                    aria-label={`Abrir documento ${modules.find((m) => m.id === d.area)?.name}`}
                    disabled={busy}
                    onClick={() => onOpenArea(d.area)}
                  >
                    Abrir documento
                  </button>
                  {d.can_export && (
                    <button
                      className="btn secondary"
                      aria-label={`Exportar PDF ${modules.find((m) => m.id === d.area)?.name}`}
                      disabled={busy}
                      onClick={() => open(d.area, true)}
                    >
                      PDF
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <p className="muted subtle">
            PDF: na janela de impressão, escolha Salvar como PDF. Alterações
            ainda não salvas não entram nos documentos.
          </p>
        </>
      )}
    </section>
  );
}
