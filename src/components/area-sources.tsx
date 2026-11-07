"use client";
import Image from "next/image";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { api } from "@/lib/client";
import { modules } from "@/lib/catalog";
import {
  SOURCE_LIMIT,
  fieldText,
  quoteState,
  type ProjectSource,
} from "@/lib/source-model";
import type { ModuleDocument } from "@/lib/module-fields";
export const SourcesContext = createContext<{
  open: () => void;
} | null>(null);
export function SourcesButton() {
  const ctx = useContext(SourcesContext);
  return (
    <button type="button" className="btn secondary" onClick={() => ctx?.open()}>
      Fontes
    </button>
  );
}
export function AreaSources({
  org,
  projectId,
  area,
  document,
  children,
}: {
  org: string;
  projectId: string;
  area: string;
  document: ModuleDocument | null;
  children: ReactNode;
}) {
  const [sources, setSources] = useState<ProjectSource[]>([]),
    [writable, setWritable] = useState(false),
    [opened, setOpened] = useState(false),
    [selected, setSelected] = useState<string>(),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [creating, setCreating] = useState(false),
    [draft, setDraft] = useState({
      id: "",
      name: "",
      kind: "link",
      origin: "",
      note: "",
      url: "",
    }),
    [file, setFile] = useState<File | null>(null),
    [asset, setAsset] = useState<{
      url: string;
      mime: string;
      name: string;
    } | null>(null);
  const pending = useRef(false),
    dialog = useRef<HTMLDialogElement>(null),
    generation = useRef(0);
  const path = `sources/${projectId}/${area}`;
  async function reload() {
    const r = await api(path, org);
    setSources(r.sources ?? []);
    setWritable(!!r.writable);
  }
  useEffect(() => {
    let alive = true;
    api(path, org)
      .then((r) => {
        if (alive) {
          setSources(r.sources ?? []);
          setWritable(!!r.writable);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
      // Invalidate pending private-file reads on unmount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
  }, [path, org, document?.revision]);
  useEffect(() => {
    if (opened) dialog.current?.showModal();
    else dialog.current?.close();
  }, [opened]);
  useEffect(
    () => () => {
      if (asset) URL.revokeObjectURL(asset.url);
    },
    [asset],
  );
  function close() {
    if (pending.current) return;
    if (
      creating &&
      (draft.name || draft.note || draft.origin || draft.url || file) &&
      !confirm("Descartar o cadastro de fonte ainda não salvo?")
    )
      return;
    generation.current++;
    setOpened(false);
    setCreating(false);
    setAsset(null);
  }
  function open(id?: string) {
    setSelected(id);
    setError("");
    setOpened(true);
    const source = sources.find((s) => s.id === id);
    if (source?.mime) void inspect(source);
    else void reload().catch((e) => setError(e.message));
  }
  async function perform(fn: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function inspect(source: ProjectSource) {
    setSelected(source.id);
    setAsset(null);
    if (!source.mime) return;
    const ticket = ++generation.current;
    await perform(async () => {
      const r = await fetch(`/api/boss/${path}/file/${source.id}`, {
        headers: { "x-organization-id": org },
        cache: "no-store",
      });
      if (!r.ok) throw new Error("Anexo indisponível para este acesso");
      const blob = await r.blob();
      if (ticket === generation.current)
        setAsset({
          url: URL.createObjectURL(blob),
          mime: source.mime,
          name: source.filename || source.name,
        });
    });
  }
  const current = sources.find((s) => s.id === selected);
  return (
    <SourcesContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialog}
        className="source-drawer"
        aria-label="Fontes da área"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="heading">
          <h2>Fontes</h2>
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={close}
          >
            Fechar fontes
          </button>
        </div>
        <p className="muted">
          Materiais internos do projeto. Não entram automaticamente no Business
          Plan ou no PDF. Os usos históricos listados respeitam seu acesso às
          áreas.
        </p>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {writable && !creating && (
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft({
                id: crypto.randomUUID(),
                name: "",
                kind: "link",
                origin: "",
                note: "",
                url: "",
              });
              setFile(null);
              setCreating(true);
            }}
          >
            Adicionar fonte
          </button>
        )}
        {creating && (
          <form
            className="stack source-create"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(async () => {
                let data: string | undefined;
                if (file) {
                  if (file.size > SOURCE_LIMIT)
                    throw new Error("Limite de 2 MB por anexo");
                  data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () =>
                      resolve(String(reader.result).split(",")[1]);
                    reader.onerror = () =>
                      reject(new Error("Falha ao ler anexo"));
                    reader.readAsDataURL(file);
                  });
                }
                const r = await api(path, org, "POST", {
                  ...draft,
                  ...(file
                    ? { filename: file.name, mime: file.type, data }
                    : {}),
                });
                setCreating(false);
                setFile(null);
                setSelected(r.id);
              });
            }}
          >
            <label>
              Nome da fonte
              <input
                required
                maxLength={160}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              Tipo de fonte
              <select
                value={draft.kind}
                onChange={(e) => {
                  setDraft({ ...draft, kind: e.target.value });
                  setFile(null);
                }}
              >
                <option value="link">Link</option>
                <option value="book">Livro / referência bibliográfica</option>
                <option value="image">Print / imagem</option>
                <option value="audio">Áudio</option>
                <option value="pdf">PDF</option>
              </select>
            </label>
            {draft.kind === "link" && (
              <label>
                Endereço do link
                <input
                  type="url"
                  required
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
              </label>
            )}
            {["image", "audio", "pdf"].includes(draft.kind) && (
              <label>
                Anexo privado (até 2 MB)
                <input
                  key={draft.kind}
                  type="file"
                  required
                  accept={
                    draft.kind === "image"
                      ? "image/png,image/jpeg,image/gif,image/webp"
                      : draft.kind === "pdf"
                        ? "application/pdf"
                        : "audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4"
                  }
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <label>
              Origem (opcional)
              <input
                maxLength={1000}
                placeholder="Autor, obra, página, conversa ou contexto"
                value={draft.origin}
                onChange={(e) => setDraft({ ...draft, origin: e.target.value })}
              />
            </label>
            <label>
              Observação (opcional)
              <textarea
                maxLength={4000}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </label>
            <div className="row">
              <button className="btn" disabled={busy}>
                {busy ? "Salvando fonte…" : "Salvar fonte"}
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={() => {
                  if (confirm("Descartar cadastro não salvo?"))
                    setCreating(false);
                }}
              >
                Cancelar cadastro
              </button>
            </div>
          </form>
        )}
        {current && !creating && (
          <section className="source-detail" aria-label="Detalhes da fonte">
            <h3>{current.name}</h3>
            <p>{current.origin}</p>
            <p className="source-note">{current.note}</p>
            {current.kind === "link" && (
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
              >
                Abrir link externo
              </a>
            )}
            {asset && (
              <>
                <a
                  className="btn secondary"
                  href={asset.url}
                  download={asset.name}
                >
                  Baixar anexo privado
                </a>
                {asset.mime.startsWith("image/") && (
                  <Image
                    src={asset.url}
                    alt={current.name}
                    width={480}
                    height={320}
                    unoptimized
                    style={{ width: "auto", height: "auto" }}
                  />
                )}
                {asset.mime.startsWith("audio/") && (
                  <audio controls src={asset.url} />
                )}
              </>
            )}
            <h4>Usos acessíveis</h4>
            {current.links.length === 0 && <p>Ainda sem vínculos.</p>}
            {current.links.map((l) => (
              <div key={l.id} className="source-use">
                <strong>{modules.find((m) => m.id === l.area)?.name}</strong>
                {l.quote && <blockquote>{l.quote}</blockquote>}
                <p>
                  {l.area === area
                    ? quoteState(fieldText(document, l.field, area), l.quote)
                    : l.status}
                </p>
              </div>
            ))}
          </section>
        )}
        {!creating && (
          <>
            <h3>Fontes disponíveis no projeto</h3>
            {!sources.length && (
              <p>Nenhuma fonte cadastrada para seu acesso.</p>
            )}
            <div className="source-list">
              {sources.map((s) => (
                <article className="panel" key={s.id}>
                  <h4>{s.name}</h4>
                  <p className="muted subtle">
                    {{
                      image: "Imagem",
                      audio: "Áudio",
                      pdf: "PDF",
                      link: "Link",
                      book: "Livro",
                    }[s.kind] ?? s.kind}{" "}
                    ·{" "}
                    {s.links.some((l) => l.area === area)
                      ? "Usada nesta área"
                      : "Material do projeto"}
                  </p>
                  <div className="row">
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={busy}
                      onClick={() => void inspect(s)}
                    >
                      Consultar {s.name}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </dialog>
    </SourcesContext.Provider>
  );
}
