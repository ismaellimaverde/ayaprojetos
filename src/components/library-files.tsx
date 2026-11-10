"use client";
import { useEffect, useRef, useState } from "react";
import {
  Folder,
  Download,
  FileText,
  Files,
  Trash2,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { api } from "@/lib/client";
import { updatedAtLabel } from "@/lib/document-metadata";
import { PrivateFileThumbnail } from "./private-file-thumbnail";
import { libraryFileType } from "@/lib/library-file-type";
import { SOURCE_LIMIT } from "@/lib/source-model";
type Group = {
  id: string;
  name: string;
  area: string | null;
  scope: "area" | "project";
  can_create: boolean;
};
type Entry = {
  id: string;
  folder_id: string;
  area: string;
  name: string;
  category: string;
  url: string;
  filename: string;
  mime: string;
  bytes: number | null;
  updated_at: string;
  can_edit: boolean;
  can_delete: boolean;
  deleted_at: string | null;
  can_download: boolean;
};
type Access = { id: string; can_create: boolean; can_edit: boolean };
type Listing = {
  folders: Group[];
  files: Entry[];
  areas: Access[];
  can_create: boolean;
};
const labels: Record<string, string> = {
  image: "Fotos",
  video: "Vídeos",
  document: "Documentos",
};
const icon = (category: string) =>
  category === "image" ? (
    <ImageIcon aria-hidden size={22} />
  ) : category === "video" ? (
    <Video aria-hidden size={22} />
  ) : (
    <FileText aria-hidden size={22} />
  );
export function LibraryFiles({
  org,
  projectId,
}: {
  org: string;
  projectId: string;
}) {
  const [trash, setTrash] = useState(false);
  const basePath = `project-files/${projectId}`;
  const path = trash ? `${basePath}/trash` : basePath;
  const [listing, setListing] = useState<Listing>({
    folders: [],
    files: [],
    areas: [],
    can_create: false,
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState(""),
    [category, setCategory] = useState(""),
    [search, setSearch] = useState("");
  const [form, setForm] = useState<"folder" | "file" | "edit" | null>(null);
  const [draft, setDraft] = useState({
    id: "",
    name: "",
    area: "",
    folder_id: "",
    category: "image",
    url: "",
    mode: "link",
  });
  const [file, setFile] = useState<File | null>(null);
  const [continueToFile, setContinueToFile] = useState(false);
  const pending = useRef(false),
    downloadUrl = useRef<string | null>(null);
  async function reload() {
    const r = await api(path, org);
    setListing({
      folders: r.folders ?? [],
      files: r.files ?? [],
      areas: r.areas ?? [],
      can_create: r.can_create === true,
    });
  }
  useEffect(() => {
    let active = true;
    api(path, org)
      .then((r) => {
        if (active)
          setListing({
            folders: r.folders ?? [],
            files: r.files ?? [],
            areas: r.areas ?? [],
            can_create: r.can_create === true,
          });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
    };
  }, [path, org]);
  async function perform(fn: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const canCreateIn = (g: Group) => g.can_create;
  function start(kind: "folder" | "file", entry?: Entry) {
    setError("");
    setFile(null);
    const needsFolder =
      kind === "file" && !entry && !listing.folders.some(canCreateIn);
    setContinueToFile(needsFolder);
    setDraft({
      id: entry?.id ?? crypto.randomUUID(),
      name: entry?.name ?? (needsFolder ? labels[category || "image"] : ""),
      area: entry?.area ?? "",
      folder_id:
        entry?.folder_id ??
        listing.folders.find((g) => g.id === folder && canCreateIn(g))?.id ??
        listing.folders.find(canCreateIn)?.id ??
        "",
      category: entry?.category || category || "image",
      url: "",
      mode:
        (entry?.category || category || "image") === "video"
          ? "link"
          : "upload",
    });
    setForm(entry ? "edit" : needsFolder ? "folder" : kind);
  }
  async function save() {
    await perform(async () => {
      if (form === "folder") {
        await api(`${path}/folders`, org, "POST", {
          id: draft.id,
          name: draft.name,
        });
        await reload();
        if (continueToFile) {
          setFolder(draft.id);
          setDraft({
            ...draft,
            id: crypto.randomUUID(),
            name: "",
            folder_id: draft.id,
          });
          setForm("file");
          setContinueToFile(false);
          return;
        }
      } else if (form === "edit")
        await api(`${path}/items/${draft.id}`, org, "PATCH", {
          name: draft.name,
          folder_id: draft.folder_id,
        });
      else {
        let upload = {};
        if (draft.mode === "upload") {
          if (!file) throw new Error("Selecione o arquivo que deseja enviar.");
          if (!file.size)
            throw new Error("O arquivo está vazio. Escolha outro arquivo.");
          if (file.size > SOURCE_LIMIT)
            throw new Error(
              "O arquivo excede 2 MiB. Use um link HTTPS ou escolha um arquivo menor.",
            );
          const known: Record<string, string> = {
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            webp: "image/webp",
            pdf: "application/pdf",
          };
          const mime =
            file.type ||
            known[file.name.split(".").pop()?.toLowerCase() || ""] ||
            "";
          const allowed =
            draft.category === "document"
              ? ["application/pdf"]
              : ["image/png", "image/jpeg", "image/gif", "image/webp"];
          if (!allowed.includes(mime))
            throw new Error(
              draft.category === "document"
                ? "Envie um PDF. Para Word, Excel e outros documentos, escolha Link HTTPS."
                : "Envie uma foto PNG, JPEG, GIF ou WebP. Para outros formatos, escolha Link HTTPS.",
            );
          const data = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result).split(",")[1]);
            r.onerror = () =>
              reject(new Error("Não foi possível ler o arquivo"));
            r.readAsDataURL(file);
          });
          upload = { data, filename: file.name, mime };
        }
        await api(`${path}/items`, org, "POST", {
          id: draft.id,
          name: draft.name,
          folder_id: draft.folder_id,
          category: draft.category,
          url: draft.mode === "link" ? draft.url : "",
          ...upload,
        });
      }
      await reload();
      setForm(null);
      setFile(null);
    });
  }
  const entries = listing.files.filter(
    (f) =>
      (!folder || f.folder_id === folder) &&
      (!category || f.category === category) &&
      f.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <section
      className="panel file-manager"
      aria-label="Gerenciador de arquivos"
    >
      <div className="heading">
        <div>
          <h3 className="file-manager-title">
            <Files aria-hidden size={30} />
            Gerenciador de arquivos
          </h3>
          <p className="muted">
            Organize materiais do projeto em pastas. Eles não entram
            automaticamente no Business Plan ou no PDF.
          </p>
        </div>
        {!trash && listing.can_create && !form && (
          <div className="row">
            <button
              type="button"
              className="btn secondary"
              onClick={() => start("folder")}
            >
              Nova pasta
            </button>
            <button type="button" className="btn" onClick={() => start("file")}>
              Adicionar arquivo ou link
            </button>
          </div>
        )}
      </div>
      <ul className="muted subtle file-guidance">
        <li>
          <strong>Documentos:</strong> upload privado de PDF ou link HTTPS para
          qualquer documento, incluindo Word e Excel.
        </li>
        <li>
          <strong>Fotos:</strong> upload privado de PNG, JPEG, GIF e WebP ou
          link HTTPS.
        </li>
        <li>
          <strong>Vídeos:</strong> somente link HTTPS, incluindo Google Drive. O
          BOSS não copia vídeos nem muda o compartilhamento.
        </li>
        <li>
          <strong>Limites:</strong> 2 MiB por upload e 50 MiB de anexos por
          projeto, compartilhados com Fontes.
        </li>
      </ul>
      <nav className="file-categories" aria-label="Categorias de arquivos">
        {["document", "image", "video"].map((id) => (
          <button
            key={id}
            type="button"
            className="file-category"
            aria-pressed={category === id}
            disabled={busy || !!form}
            onClick={() => {
              setCategory(id);
              setSearch("");
            }}
          >
            {icon(id)}
            <strong>{labels[id]}</strong>
            <span>
              {id === "document"
                ? "PDF ou link de documento"
                : id === "image"
                  ? "PNG, JPEG, GIF, WebP ou link"
                  : "Link do Drive ou outro serviço"}
            </span>
          </button>
        ))}
      </nav>
      <div className="row file-category-heading">
        <h4>
          {category ? labels[category] : "Arquivos do projeto"}
          {trash ? " · Lixeira" : ""}
        </h4>
        <button
          type="button"
          className="btn secondary"
          disabled={busy || !!form}
          onClick={() => {
            setLoading(true);
            setListing((previous) => ({ ...previous, files: [] }));
            setTrash(!trash);
            setError("");
          }}
        >
          <Trash2 aria-hidden size={18} />
          {trash ? "Voltar aos arquivos" : "Lixeira"}
        </button>
      </div>
      {trash && (
        <p className="notice">
          Arquivos na lixeira podem ser restaurados por quem tem permissão de
          exclusão. Continuam ocupando a quota. Nenhum arquivo externo é
          apagado.
        </p>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando arquivos…</p>
      ) : (
        <>
          {form && (
            <form
              className="panel stack"
              aria-label={
                form === "folder"
                  ? "Nova pasta"
                  : form === "edit"
                    ? "Organizar arquivo"
                    : "Novo arquivo ou link"
              }
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <h4>
                {form === "folder"
                  ? "Nova pasta"
                  : form === "edit"
                    ? "Organizar arquivo"
                    : "Novo arquivo ou link"}
              </h4>
              {continueToFile && (
                <p className="notice">
                  Primeiro, dê um nome à pasta geral do projeto. Depois você
                  poderá{" "}
                  {draft.category === "video"
                    ? "adicionar o link"
                    : "selecionar o arquivo"}
                  .
                </p>
              )}
              <label>
                Nome
                <input
                  required
                  maxLength={form === "folder" ? 120 : 160}
                  value={draft.name}
                  disabled={busy}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              {form !== "folder" && (
                <label>
                  Pasta
                  <select
                    required
                    value={draft.folder_id}
                    disabled={busy}
                    onChange={(e) =>
                      setDraft({ ...draft, folder_id: e.target.value })
                    }
                  >
                    {listing.folders
                      .filter((g) =>
                        form === "edit"
                          ? g.area === draft.area
                          : canCreateIn(g),
                      )
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                          {g.scope === "area"
                            ? " — acesso legado restrito"
                            : ""}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {form === "file" && (
                <>
                  <p className="row">
                    {icon(draft.category)}
                    <strong>{labels[draft.category]}</strong>
                  </p>
                  <label>
                    Como adicionar
                    <select
                      value={draft.mode}
                      disabled={busy}
                      onChange={(e) => {
                        setDraft({ ...draft, mode: e.target.value });
                        setFile(null);
                      }}
                    >
                      <option value="link">Link HTTPS</option>
                      {draft.category !== "video" && (
                        <option value="upload">Upload privado</option>
                      )}
                    </select>
                  </label>
                  {draft.mode === "link" ? (
                    <label>
                      Link HTTPS
                      <input
                        required
                        key="link-input"
                        type="url"
                        placeholder="https://"
                        value={draft.url}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft({ ...draft, url: e.target.value })
                        }
                      />
                    </label>
                  ) : (
                    <label>
                      Arquivo privado (até 2 MiB)
                      <input
                        required
                        key="upload-input"
                        type="file"
                        disabled={busy}
                        accept={
                          draft.category === "document"
                            ? "application/pdf"
                            : "image/png,image/jpeg,image/gif,image/webp"
                        }
                        onChange={(e) => {
                          const selected = e.target.files?.[0] ?? null;
                          setFile(selected);
                          setError("");
                          if (selected && !draft.name)
                            setDraft({
                              ...draft,
                              name: selected.name.slice(0, 160),
                            });
                        }}
                      />
                    </label>
                  )}
                </>
              )}
              <div className="row">
                <button className="btn" disabled={busy}>
                  {busy
                    ? "Salvando…"
                    : continueToFile
                      ? "Criar pasta e continuar"
                      : "Salvar"}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      (draft.name || draft.url || file) &&
                      !confirm("Descartar cadastro ainda não salvo?")
                    )
                      return;
                    setForm(null);
                    setContinueToFile(false);
                    setFile(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
          {listing.folders.length > 0 && (
            <nav className="row file-folders" aria-label="Pastas de arquivos">
              <button
                type="button"
                className={`btn ${!folder ? "" : "secondary"}`}
                aria-pressed={!folder}
                onClick={() => setFolder("")}
              >
                Todas as pastas
              </button>
              {listing.folders.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`btn ${folder === g.id ? "" : "secondary"}`}
                  aria-pressed={folder === g.id}
                  onClick={() => setFolder(g.id)}
                >
                  <Folder aria-hidden size={18} />
                  {g.name}
                  <span className="subtle">
                    {" "}
                    {g.scope === "area" ? "· Acesso legado restrito" : ""}
                  </span>
                </button>
              ))}
            </nav>
          )}
          <div className="file-filters">
            <label>
              Buscar arquivo
              <input
                value={search}
                maxLength={160}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
          {!listing.folders.length && (
            <p>
              Nenhuma pasta disponível para seu acesso.{" "}
              {listing.can_create
                ? "Escolha uma categoria e clique em Adicionar arquivo ou link para criar sua primeira pasta e continuar."
                : "Este projeto está disponível somente para leitura."}
            </p>
          )}
          {listing.folders.length > 0 && !entries.length && (
            <p>Nenhum arquivo nesta seleção.</p>
          )}
          <div className="file-list" aria-label="Lista de arquivos">
            {entries.map((entry) => (
              <article className="file-list-row" key={entry.id}>
                <PrivateFileThumbnail
                  url={
                    !entry.url &&
                    !entry.deleted_at &&
                    entry.can_download &&
                    entry.mime?.startsWith("image/")
                      ? `/api/boss/${basePath}/file/${entry.id}`
                      : null
                  }
                  org={org}
                  mime={entry.mime}
                  version={entry.updated_at}
                  fallback={icon(entry.category)}
                  name={entry.name}
                />
                <div className="file-list-info">
                  <h4>{entry.name}</h4>
                  <p className="muted subtle">
                    <strong>{libraryFileType(entry)}</strong>
                    {entry.bytes
                      ? ` · ${Math.ceil(entry.bytes / 1024)} KB`
                      : ""}
                    <span className="file-list-updated">
                      {updatedAtLabel(entry.updated_at)}
                    </span>
                  </p>
                </div>
                <div className="row">
                  {!entry.deleted_at &&
                    (entry.url ? (
                      <a
                        className="btn secondary"
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                      >
                        Abrir link
                      </a>
                    ) : entry.can_download ? (
                      <button
                        type="button"
                        className="btn secondary file-download"
                        aria-label="Baixar arquivo"
                        title="Baixar arquivo"
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            const r = await fetch(
                              `/api/boss/${path}/file/${entry.id}`,
                              {
                                headers: { "x-organization-id": org },
                                cache: "no-store",
                              },
                            );
                            if (!r.ok)
                              throw new Error(
                                "Não foi possível baixar este arquivo com seu acesso atual",
                              );
                            const blob = await r.blob();
                            if (downloadUrl.current)
                              URL.revokeObjectURL(downloadUrl.current);
                            const url = URL.createObjectURL(blob);
                            downloadUrl.current = url;
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = entry.filename || entry.name;
                            a.click();
                          })
                        }
                      >
                        <Download aria-hidden size={19} />
                      </button>
                    ) : (
                      <span className="muted subtle">
                        Download não autorizado
                      </span>
                    ))}
                  {entry.can_delete && (
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={busy || !!form}
                      onClick={() => {
                        const message = entry.deleted_at
                          ? `Restaurar “${entry.name}” à pasta original? O acesso anterior será preservado.`
                          : `Mover “${entry.name}” para a lixeira? O arquivo poderá ser restaurado e continuará ocupando a quota. Links removidos do BOSS não apagam arquivos no Drive ou em outros serviços.`;
                        if (!confirm(message)) return;
                        void perform(async () => {
                          await api(
                            `${basePath}/${entry.deleted_at ? "restore" : "items"}/${entry.id}`,
                            org,
                            entry.deleted_at ? "POST" : "DELETE",
                            entry.deleted_at ? {} : undefined,
                          );
                          await reload();
                        });
                      }}
                    >
                      {entry.deleted_at
                        ? "Restaurar arquivo"
                        : "Excluir arquivo"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
