"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import {
  moduleFields,
  type ModuleDocument,
  type ModuleItem,
} from "@/lib/module-fields";
import { Modal } from "./modal";
import { RichSummaryEditor, SummaryView } from "./rich-summary";
import { SUMMARY_KEY, summaryFromLegacy } from "@/lib/rich-summary";
import { printSummary } from "@/lib/print-summary";

type HistoryRow = { revision: number; created_at: string; author_name: string };
export function ModuleEditor({
  org,
  projectId,
  area,
  title,
  onClose,
  onSaved,
}: {
  org: string;
  projectId: string;
  area: string;
  title: string;
  onClose: () => void;
  onSaved: () => void;
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
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [snapshot, setSnapshot] = useState<ModuleDocument | null>(null);
  async function reload() {
    const r = await api(path, org);
    setDocument(r.document);
    setPermissions(r.permissions);
    setArchived(r.archived);
    setDirty(false);
    setSummaryInvalid(false);
    setEditing(false);
    setHistory(null);
    setSnapshot(null);
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
            area === "executive" &&
            !r.archived &&
            r.permissions.includes(r.document.revision ? "edit" : "create")
          ) {
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
  }, [path, org, area]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const discard = () =>
    !dirty || confirm("Descartar as alterações ainda não salvas?");
  const close = () => {
    if (!busy && discard()) onClose();
  };
  const changeField = (id: string, value: string) => {
    setDocument((d) => d && { ...d, fields: { ...d.fields, [id]: value } });
    setDirty(true);
  };
  const changeItem = (id: string, changes: Partial<ModuleItem>) => {
    setDocument(
      (d) =>
        d && {
          ...d,
          items: d.items.map((i) => (i.id === id ? { ...i, ...changes } : i)),
        },
    );
    setDirty(true);
  };
  const content = snapshot ?? document;
  const summary =
    area === "executive" && content
      ? summaryFromLegacy(content.fields, content.items)
      : null;
  const canEdit =
    !archived && permissions.includes(document?.revision ? "edit" : "create");
  return (
    <Modal onClose={close}>
      <section className="panel module-editor" aria-label={`Área ${title}`}>
        <div className="heading">
          <div>
            <div className="eyebrow">Business Plan</div>
            <h2>{title}</h2>
          </div>
          <button type="button" className="btn secondary" onClick={close}>
            Fechar área
          </button>
        </div>
        <p className="muted">
          Informações de planejamento preenchidas pela equipe. Registros
          operacionais e indicadores calculados serão integrados nas próximas
          etapas.
        </p>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {!document ? (
          <p>Carregando conteúdo…</p>
        ) : (
          <>
            <div className="row" style={{ marginBottom: 20 }}>
              {!editing && canEdit && (
                <button
                  className="btn"
                  onClick={() => {
                    setHistory(null);
                    setSnapshot(null);
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
              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={async () => {
                  if (!discard()) return;
                  try {
                    await reload();
                    setMessage("");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Recarregar
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={async () => {
                  if (!discard()) return;
                  try {
                    await reload();
                    setHistory(await api(`${path}/history`, org));
                    setMessage("");
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                Histórico
              </button>
            </div>
            {area === "executive" &&
              permissions.includes("export") &&
              document.revision > 0 &&
              (!editing || !dirty) && (
                <div className="summary-export">
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const r = await api(
                          `${path}/export${snapshot ? `/${snapshot.revision}` : ""}`,
                          org,
                        );
                        const saved = r.document ?? r;
                        printSummary(
                          summaryFromLegacy(saved.fields, saved.items),
                          `Resumo executivo — revisão ${saved.revision}`,
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
                  <p className="muted subtle">
                    Na janela de impressão, escolha Salvar como PDF. Exporta a
                    revisão salva.
                  </p>
                </div>
              )}
            {archived && (
              <p className="notice">Projeto arquivado: somente leitura.</p>
            )}
            {!canEdit && !archived && (
              <p className="muted">
                Seu acesso permite consultar estas informações.
              </p>
            )}
            {history && (
              <section aria-label="Histórico da área">
                <h3>Últimas 50 revisões</h3>
                {!history.length && <p>Nenhuma revisão salva.</p>}
                <div className="stack">
                  {history.map((h) => (
                    <button
                      key={h.revision}
                      className="btn secondary"
                      onClick={async () => {
                        try {
                          setSnapshot(
                            await api(`${path}/history/${h.revision}`, org),
                          );
                        } catch (e) {
                          setMessage((e as Error).message);
                        }
                      }}
                    >
                      Revisão {h.revision} · {h.author_name} ·{" "}
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </button>
                  ))}
                </div>
              </section>
            )}
            {content && (
              <form
                inert={busy}
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!editing || busy || summaryInvalid) return;
                  setBusy(true);
                  setMessage("");
                  try {
                    await api(path, org, "POST", {
                      revision: document.revision,
                      fields: document.fields,
                      items: document.items,
                    });
                    await reload();
                    setMessage("Informações salvas.");
                    onSaved();
                  } catch (error) {
                    setMessage((error as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p className="muted subtle">
                  {snapshot ? "Consulta de histórico · " : ""}
                  {content.revision
                    ? `Revisão ${content.revision}`
                    : "Ainda não preenchido"}
                  {content.author_name ? ` · ${content.author_name}` : ""}
                  {content.updated_at
                    ? ` · ${new Date(content.updated_at).toLocaleString("pt-BR")}`
                    : ""}
                </p>
                {summary ? (
                  <section className="module-field-card">
                    {editing ? (
                      <RichSummaryEditor
                        initial={summary}
                        onValidity={(valid) => {
                          setSummaryInvalid(!valid);
                          if (!valid) setDirty(true);
                        }}
                        onChange={(value) => changeField(SUMMARY_KEY, value)}
                      />
                    ) : (
                      <SummaryView value={summary} />
                    )}
                  </section>
                ) : (
                  moduleFields[area].map((f) => (
                    <div className="module-field-card" key={f.id}>
                      {editing ? (
                        <label>
                          {f.label}
                          <textarea
                            maxLength={10000}
                            value={document.fields[f.id] ?? ""}
                            onChange={(e) => changeField(f.id, e.target.value)}
                            aria-describedby={`hint-${f.id}`}
                          />
                          <span id={`hint-${f.id}`} className="muted subtle">
                            {f.hint}
                          </span>
                        </label>
                      ) : (
                        <>
                          <h3>{f.label}</h3>
                          <p className="module-text">
                            {content.fields[f.id] || "Não informado."}
                          </p>
                        </>
                      )}
                    </div>
                  ))
                )}
                {area !== "executive" && (
                  <>
                    <h3>Itens de informação</h3>
                    <p className="muted subtle">
                      Registre detalhes, evidências e referências desta área.
                      Não são lançamentos ou tarefas operacionais.
                    </p>
                    {!content.items.length && <p>Nenhum item cadastrado.</p>}
                    {content.items.map((item, index) => (
                      <fieldset key={item.id} className="panel module-item">
                        <legend>
                          {item.archived ? "Arquivado · " : ""}Item {index + 1}
                        </legend>
                        {editing && !item.archived ? (
                          <>
                            <label>
                              Título do item
                              <input
                                required
                                maxLength={160}
                                value={item.title}
                                onChange={(e) =>
                                  changeItem(item.id, { title: e.target.value })
                                }
                              />
                            </label>
                            <label>
                              Descrição do item
                              <textarea
                                maxLength={10000}
                                value={item.text}
                                onChange={(e) =>
                                  changeItem(item.id, { text: e.target.value })
                                }
                              />
                            </label>
                            <label>
                              Fonte ou referência
                              <input
                                maxLength={500}
                                value={item.source}
                                onChange={(e) =>
                                  changeItem(item.id, {
                                    source: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label>
                              Período ou data de referência
                              <input
                                maxLength={100}
                                value={item.period}
                                onChange={(e) =>
                                  changeItem(item.id, {
                                    period: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label>
                              Responsável pela informação
                              <input
                                maxLength={160}
                                value={item.responsible}
                                onChange={(e) =>
                                  changeItem(item.id, {
                                    responsible: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </>
                        ) : (
                          <>
                            <h3>{item.title}</h3>
                            <p className="module-text">
                              {item.text || "Sem descrição."}
                            </p>
                            <p className="subtle">
                              Fonte: {item.source || "Não informada"} · Período:{" "}
                              {item.period || "Não informado"} · Responsável:{" "}
                              {item.responsible || "Não informado"}
                            </p>
                          </>
                        )}
                        {editing &&
                          (item.archived || permissions.includes("delete")) && (
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() =>
                                changeItem(item.id, {
                                  archived: !item.archived,
                                })
                              }
                            >
                              {item.archived
                                ? "Restaurar item"
                                : "Arquivar item"}
                            </button>
                          )}
                      </fieldset>
                    ))}
                  </>
                )}
                {editing && (
                  <>
                    {area !== "executive" && permissions.includes("create") && (
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={document.items.length >= 50}
                        onClick={() => {
                          setDocument(
                            (d) =>
                              d && {
                                ...d,
                                items: [
                                  ...d.items,
                                  {
                                    id: crypto.randomUUID(),
                                    title: "",
                                    text: "",
                                    source: "",
                                    period: "",
                                    responsible: "",
                                    archived: false,
                                  },
                                ],
                              },
                          );
                          setDirty(true);
                        }}
                      >
                        Adicionar item
                      </button>
                    )}
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
                        onClick={async () => {
                          if (discard())
                            try {
                              await reload();
                            } catch (e) {
                              setMessage((e as Error).message);
                            }
                        }}
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
    </Modal>
  );
}
