"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
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
}: {
  org: string;
  projectId: string;
}) {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState<{
    title: string;
    content: SummaryDocument;
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
      if (area) {
        const r = await api(
          `module-content/${projectId}/${area}${exportPDF ? "/export" : ""}`,
          org,
        );
        content = areaDocument(area, r.document);
        title = `${projectName} — ${modules.find((m) => m.id === area)?.name} — revisão ${r.document.revision}`;
      } else {
        const r = await api(
          `project-library/${projectId}/complete${exportPDF ? "/export" : ""}`,
          org,
        );
        if (!r.documents.length)
          throw new Error("Nenhum conteúdo disponível para este acesso.");
        content = consolidatedDocument(r.documents);
        title = `${r.project_name} — Business Plan`;
      }
      if (exportPDF) printSummary(content, title);
      else setOpened({ title, content });
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
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
              Conteúdo consolidado das áreas preenchidas, com a revisão e a
              autoria de cada documento.
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
                <p className="muted subtle">
                  Revisão {d.revision} · {d.author_name}
                  <br />
                  {new Date(d.updated_at).toLocaleString("pt-BR")}
                </p>
                <div className="row">
                  <button
                    className="btn module-access"
                    aria-label={`Ler documento ${modules.find((m) => m.id === d.area)?.name}`}
                    disabled={busy}
                    onClick={() => open(d.area)}
                  >
                    Ler documento
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
      {opened && (
        <article className="panel library-document" aria-label={opened.title}>
          <div className="heading">
            <h2>{opened.title}</h2>
            <button className="btn secondary" onClick={() => setOpened(null)}>
              Fechar documento
            </button>
          </div>
          <SummaryView value={opened.content} />
        </article>
      )}
    </section>
  );
}
