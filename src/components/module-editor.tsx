"use client";
import { useEffect, useImperativeHandle, useState, type Ref } from "react";
import { api } from "@/lib/client";
import { moduleFields, type ModuleDocument } from "@/lib/module-fields";
import { updatedAtLabel } from "@/lib/document-metadata";
import { AreaSources, SourcesButton } from "./area-sources";
import { AreaIcon } from "./area-icon";
import { Modal } from "./modal";
import { modules } from "@/lib/catalog";
import { RichSummaryEditor, SummaryView } from "./rich-summary";
import { SUMMARY_KEY, summaryFromLegacy } from "@/lib/rich-summary";
import { fieldDocument, itemDocument, documentText } from "@/lib/rich-fields";
import { AREA_DOCUMENT_KEY, areaDocument } from "@/lib/planning-document";
import { printSummary } from "@/lib/print-summary";

export type ModuleEditorHandle = { requestClose: () => boolean };

export function ModuleEditor({
  org,
  projectId,
  area,
  title,
  onClose,
  onSaved,
  onCancelClose,
  startEditing = false,
  documentTitle,
  ref,
}: {
  org: string;
  projectId: string;
  area: string;
  title: string;
  onClose: () => void;
  onSaved: () => void;
  onCancelClose?: () => void;
  startEditing?: boolean;
  documentTitle?: string;
  ref?: Ref<ModuleEditorHandle>;
}) {
  const path = `module-content/${projectId}/${area}`;
  const [document, setDocument] = useState<ModuleDocument | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summaryInvalid, setSummaryInvalid] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  async function reload() {
    const r = await api(path, org);
    setDocument(r.document);
    setPermissions(r.permissions);
    setArchived(r.archived);
    setDirty(false);
    setSummaryInvalid(false);
    setEditing(
      (area === "executive" || startEditing) &&
        !r.archived &&
        r.permissions.includes(r.document.revision ? "edit" : "create"),
    );
  }
  useEffect(() => {
    let active = true;
    api(path, org)
      .then((r) => {
        if (active) {
          setDocument(r.document);
          setPermissions(r.permissions);
          setArchived(r.archived);
          if (
            (area === "executive" || startEditing) &&
            !r.archived &&
            r.permissions.includes(r.document.revision ? "edit" : "create")
          ) {
            if (area === "executive")
              setDocument({
                ...r.document,
                fields: {
                  ...r.document.fields,
                  [SUMMARY_KEY]: JSON.stringify(
                    summaryFromLegacy(r.document.fields, r.document.items),
                  ),
                },
              });
            setEditing(true);
          }
        }
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, org, area, startEditing]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useImperativeHandle(
    ref,
    () => ({
      requestClose: () => {
        if (busy) return false;
        setConfirmClose(true);
        return true;
      },
    }),
    [busy],
  );
  const cancelClose = () => {
    if (busy) return;
    setConfirmClose(false);
    onCancelClose?.();
  };
  const close = () => {
    if (!busy) setConfirmClose((value) => !value);
  };
  const changeField = (id: string, value: string) => {
    setDocument((d) => d && { ...d, fields: { ...d.fields, [id]: value } });
    setDirty(true);
  };
  const content = document;
  const summary = content ? areaDocument(area, content) : null;
  const narrativeKey = area === "executive" ? SUMMARY_KEY : AREA_DOCUMENT_KEY;
  const canEdit =
    !archived && permissions.includes(document?.revision ? "edit" : "create");
  async function save(closeAfter: boolean) {
    if (busy || summaryInvalid || !document) return;
    if (!dirty) {
      if (closeAfter) onClose();
      return;
    }
    if (!canEdit) {
      setMessage("Seu acesso não permite salvar alterações.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api(path, org, "POST", {
        revision: document.revision,
        fields: document.fields,
        items: document.items,
      });
      onSaved();
      if (closeAfter) {
        onClose();
        return;
      }
      await reload();
      setMessage("Informações salvas.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AreaSources
      org={org}
      projectId={projectId}
      area={area}
      document={document}
    >
      {confirmClose && (
        <Modal onClose={cancelClose}>
          <section
            className="panel editor-close-prompt"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="close-editor-title"
          >
            <h2 id="close-editor-title">Salvar antes de fechar?</h2>
            <p>
              {dirty
                ? "Você pode salvar suas alterações ou fechar sem salvar. O conteúdo já salvo será preservado."
                : "Não há alterações pendentes. O conteúdo já salvo será preservado."}
            </p>
            {message && (
              <p role="alert" className="notice">
                {message}
              </p>
            )}
            {summaryInvalid && (
              <p role="alert">
                Corrija a formatação antes de salvar, ou escolha não salvar.
              </p>
            )}
            <div className="row">
              <button
                className="btn"
                disabled={busy || summaryInvalid}
                onClick={() => save(true)}
              >
                {busy ? "Salvando…" : "Salvar e fechar"}
              </button>
              <button
                className="btn secondary"
                disabled={busy}
                onClick={onClose}
              >
                Não salvar
              </button>
              <button
                className="btn secondary"
                disabled={busy}
                autoFocus
                onClick={cancelClose}
              >
                Cancelar
              </button>
            </div>
          </section>
        </Modal>
      )}
      <section
        className="module-editor module-page"
        aria-label={`Área ${title}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
      >
        <div className="document-topbar">
          <div className="document-location">
            <button type="button" className="btn secondary" onClick={close}>
              Fechar área
            </button>
            <span className="document-breadcrumb">Business Plan / {title}</span>
          </div>
          <SourcesButton />
          {permissions.includes("export") &&
            (document?.revision ?? 0) > 0 &&
            (!editing || !dirty) && (
              <div className="summary-export">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await api(`${path}/export`, org);
                      const saved = r.document ?? r;
                      printSummary(
                        areaDocument(area, saved),
                        documentTitle ?? title,
                      );
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Exportar PDF
                </button>
              </div>
            )}
        </div>
        <header className="document-heading">
          <div className="document-identity">
            <span className="library-icon">
              <AreaIcon area={area} />
            </span>
            <span className="document-category">Business Plan</span>
          </div>
          <h2 tabIndex={-1}>{documentTitle ?? title}</h2>
          <p className="muted">
            {modules.find((module) => module.id === area)?.description}
          </p>
          {document && document.revision > 0 && (
            <p className="muted subtle document-metadata">
              {updatedAtLabel(document.updated_at)}
            </p>
          )}
        </header>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {!document ? (
          <p>Carregando conteúdo…</p>
        ) : (
          <>
            <div
              className="row"
              style={{
                marginBottom: 14,
                display: !editing && canEdit ? "flex" : "none",
              }}
            >
              {!editing && canEdit && (
                <button
                  className="btn"
                  onClick={() => {
                    if (area === "executive" && document) {
                      setDocument({
                        ...document,
                        fields: {
                          ...document.fields,
                          [SUMMARY_KEY]: JSON.stringify(
                            summaryFromLegacy(document.fields, document.items),
                          ),
                        },
                      });
                    }
                    setEditing(true);
                    setMessage("");
                  }}
                >
                  {document.revision
                    ? "Editar informações"
                    : "Preencher informações"}
                </button>
              )}
            </div>
            {archived && (
              <p className="notice">Projeto arquivado: somente leitura.</p>
            )}
            {!canEdit && !archived && (
              <p className="muted">
                Seu acesso permite consultar estas informações.
              </p>
            )}
            {content && (
              <form
                className="document-surface"
                inert={busy}
                onSubmit={async (e) => {
                  e.preventDefault();
                  await save(false);
                }}
              >
                {summary && (
                  <section className="module-field-card executive-document-section">
                    <h3>{title}</h3>
                    {editing ? (
                      <RichSummaryEditor
                        key={`${area}:${document.revision}`}
                        label={title}
                        sourceField={
                          area === "executive" ? "executive" : "document"
                        }
                        initial={summary}
                        onValidity={(valid) => {
                          setSummaryInvalid(!valid);
                          if (!valid) setDirty(true);
                        }}
                        onChange={(value) => changeField(narrativeKey, value)}
                      />
                    ) : (
                      <SummaryView value={summary} />
                    )}
                  </section>
                )}
                {area !== "executive" &&
                  (Object.keys(content.fields).some(
                    (key) => key !== AREA_DOCUMENT_KEY,
                  ) ||
                    content.items.length > 0) && (
                    <details className="legacy-planning-data">
                      <summary>
                        Consultar campos e itens anteriores preservados
                      </summary>
                      <p className="muted subtle">
                        O documento reúne o conteúdo anterior com seus títulos.
                        A edição deste documento não altera os campos e itens
                        originais abaixo, preservados para consulta. Vínculos de
                        fontes acompanham os trechos no documento; trechos
                        repetidos precisam de conferência.
                      </p>
                      {moduleFields[area].map((field) =>
                        documentText(
                          fieldDocument(content.fields, field.id),
                        ).trim() ? (
                          <section key={field.id}>
                            <h3>{field.label}</h3>
                            <SummaryView
                              value={fieldDocument(content.fields, field.id)}
                            />
                          </section>
                        ) : null,
                      )}
                      {content.items.map((item) => (
                        <section key={item.id}>
                          <h3>
                            {item.archived ? "Arquivado · " : ""}
                            {item.title}
                          </h3>
                          <SummaryView value={itemDocument(item)} />
                          <p>
                            Fonte: {item.source || "Não informada"} · Período:{" "}
                            {item.period || "Não informado"} · Responsável:{" "}
                            {item.responsible || "Não informado"}
                          </p>
                        </section>
                      ))}
                    </details>
                  )}
                {editing && (
                  <>
                    <div className="row">
                      <button
                        className="btn"
                        disabled={busy || !dirty || summaryInvalid}
                      >
                        {busy ? "Salvando…" : "Salvar informações"}
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={close}
                      >
                        Cancelar edição
                      </button>
                    </div>
                    {dirty && (
                      <p className="muted subtle">
                        Há alterações ainda não salvas.
                      </p>
                    )}
                  </>
                )}
              </form>
            )}
          </>
        )}
      </section>
    </AreaSources>
  );
}
