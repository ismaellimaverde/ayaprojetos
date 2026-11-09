"use client";
import { useEffect, useRef, useState } from "react";
import { Folder, FileText, Image as ImageIcon, Video } from "lucide-react";
import { api } from "@/lib/client";
import { modules } from "@/lib/catalog";
import { updatedAtLabel } from "@/lib/document-metadata";
import { SOURCE_LIMIT } from "@/lib/source-model";
type Group = { id: string; name: string; area: string };
type Entry = {
  id: string;
  folder_id: string;
  area: string;
  name: string;
  category: string;
  url: string;
  filename: string;
  bytes: number | null;
  updated_at: string;
  can_edit: boolean;
  can_download: boolean;
};
type Access = { id: string; can_create: boolean; can_edit: boolean };
type Listing = { folders: Group[]; files: Entry[]; areas: Access[] };
const labels: Record<string, string> = {
  image: "Imagens",
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
  const path = `project-files/${projectId}`;
  const [listing, setListing] = useState<Listing>({
    folders: [],
    files: [],
    areas: [],
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
  const pending = useRef(false),
    downloadUrl = useRef<string | null>(null);
  async function reload() {
    const r = await api(path, org);
    setListing({
      folders: r.folders ?? [],
      files: r.files ?? [],
      areas: r.areas ?? [],
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
  const writable = listing.areas.filter((a) => a.can_create);
  const canCreateIn = (g: Group) => writable.some((a) => a.id === g.area);
  function start(kind: "folder" | "file", entry?: Entry) {
    setError("");
    setFile(null);
    setDraft({
      id: entry?.id ?? crypto.randomUUID(),
      name: entry?.name ?? "",
      area: entry?.area ?? writable[0]?.id ?? "",
      folder_id:
        entry?.folder_id ??
        listing.folders.find((g) => g.id === folder && canCreateIn(g))?.id ??
        listing.folders.find(canCreateIn)?.id ??
        "",
      category: entry?.category || category || "image",
      url: "",
      mode: "link",
    });
    setForm(entry ? "edit" : kind);
  }
  async function save() {
    await perform(async () => {
      if (form === "folder")
        await api(`${path}/folders`, org, "POST", {
          id: draft.id,
          name: draft.name,
          area: draft.area,
        });
      else if (form === "edit")
        await api(`${path}/items/${draft.id}`, org, "PATCH", {
          name: draft.name,
          folder_id: draft.folder_id,
        });
      else {
        let upload = {};
        if (draft.mode === "upload") {
          if (!file || file.size > SOURCE_LIMIT)
            throw new Error("Escolha um arquivo de até 2 MB");
          const data = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result).split(",")[1]);
            r.onerror = () =>
              reject(new Error("Não foi possível ler o arquivo"));
            r.readAsDataURL(file);
          });
          upload = { data, filename: file.name, mime: file.type };
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
          <h3>Gerenciador de arquivos</h3>
          <p className="muted">
            Organize materiais do projeto em pastas. Eles não entram
            automaticamente no Business Plan ou no PDF.
          </p>
        </div>
        {writable.length > 0 && !form && (
          <div className="row">
            <button
              type="button"
              className="btn secondary"
              onClick={() => start("folder")}
            >
              Nova pasta
            </button>
            <button
              type="button"
              className="btn"
              disabled={!listing.folders.some(canCreateIn)}
              onClick={() => start("file")}
            >
              Adicionar arquivo ou link
            </button>
          </div>
        )}
      </div>
      <p className="muted subtle">
        Uploads: imagens PNG, JPEG, GIF, WebP e documentos PDF, até 2 MB cada.
        Limite compartilhado de 50 MB por projeto, incluindo Fontes. Vídeos e
        outros formatos: link HTTPS. Links do Google Drive mantêm as permissões
        do Drive; o BOSS não copia o vídeo nem muda seu compartilhamento.
      </p>
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
              {form === "folder" ? (
                <>
                  <label>
                    Área responsável pelo acesso
                    <select
                      value={draft.area}
                      disabled={busy}
                      onChange={(e) =>
                        setDraft({ ...draft, area: e.target.value })
                      }
                    >
                      {writable.map((a) => (
                        <option key={a.id} value={a.id}>
                          {modules.find((m) => m.id === a.id)?.name ?? a.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="muted subtle">
                    Apenas pessoas autorizadas nesta área poderão ver a pasta e
                    seus arquivos. A área da pasta não muda depois de criada.
                  </p>
                </>
              ) : (
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
                          {g.name} —{" "}
                          {modules.find((m) => m.id === g.area)?.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {form === "file" && (
                <>
                  <label>
                    Categoria
                    <select
                      value={draft.category || "image"}
                      disabled={busy}
                      onChange={(e) => {
                        setDraft({
                          ...draft,
                          category: e.target.value,
                          mode: "link",
                        });
                        setFile(null);
                      }}
                    >
                      {Object.entries(labels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
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
                      Arquivo privado (até 2 MB)
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
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  )}
                </>
              )}
              <div className="row">
                <button className="btn" disabled={busy}>
                  {busy ? "Salvando…" : "Salvar"}
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
                    · {modules.find((m) => m.id === g.area)?.name}
                  </span>
                </button>
              ))}
            </nav>
          )}
          <div className="file-filters">
            <label>
              Pasta exibida
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
              >
                <option value="">Todas as pastas</option>
                {listing.folders.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {modules.find((m) => m.id === g.area)?.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria exibida
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Todas</option>
                {Object.entries(labels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
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
            <p>Nenhuma pasta disponível para seu acesso.</p>
          )}
          {listing.folders.length > 0 && !entries.length && (
            <p>Nenhum arquivo nesta seleção.</p>
          )}
          <div className="grid file-grid">
            {entries.map((entry) => (
              <article className="panel" key={entry.id}>
                <div className="row">
                  {icon(entry.category)}
                  <span className="subtle">{labels[entry.category]}</span>
                </div>
                <h4>{entry.name}</h4>
                <p className="muted subtle">
                  <Folder aria-hidden size={14} />{" "}
                  {listing.folders.find((g) => g.id === entry.folder_id)?.name}
                </p>
                <p className="muted subtle">
                  {updatedAtLabel(entry.updated_at)}
                  {entry.bytes ? ` · ${Math.ceil(entry.bytes / 1024)} KB` : ""}
                </p>
                <div className="row">
                  {entry.url ? (
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
                      className="btn secondary"
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
                      Baixar arquivo
                    </button>
                  ) : (
                    <span className="muted subtle">
                      Download não autorizado
                    </span>
                  )}
                  {entry.can_edit && (
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={busy || !!form}
                      onClick={() => start("file", entry)}
                    >
                      Organizar {entry.name}
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
