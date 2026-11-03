"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { ProjectLibrary } from "@/components/project-library";
import {
  ModuleEditor,
  type ModuleEditorHandle,
} from "@/components/module-editor";
import { Brand } from "@/components/brand";
import { ProjectAffiliation } from "@/components/project-affiliation";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Users,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Sun,
  Moon,
  LogOut,
  History,
} from "lucide-react";
import { api, authClient } from "@/lib/client";
import {
  modules,
  actions,
  actionLabels,
  roles,
  roleLabels,
  profile,
  type Permissions,
} from "@/lib/catalog";
type Organization = {
  id: string;
  name: string;
  workspace_name: string;
  role: string;
};
type Project = {
  id: string;
  name: string;
  description: string;
  company_id: string | null;
  company_name?: string;
  company_kind?: string;
  parent_company_id?: string;
  parent_company_name?: string;
  currency: string;
  timezone: string;
  modules: string[];
  status: string;
  template_version: number;
  module_summaries?: Array<{
    area: string;
    revision: number;
    updated_at: string;
  }>;
};
type Company = {
  id: string;
  name: string;
  kind: string;
  status: string;
  parent_id?: string | null;
};
type User = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  job_title: string;
  twoFactorEnabled: boolean;
  last_login: string | null;
};
type Invitation = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  project_id: string;
  role: string;
};
type Grant = {
  user_id: string;
  project_id: string;
  role: string;
  permissions: Permissions;
  status: string;
};
type Audit = {
  id: string;
  actor: string;
  action: string;
  target_id: string;
  created_at: string;
};
type Overview = { projects: Project[]; companies: Company[]; admin: boolean };
const initial: Overview = { projects: [], companies: [], admin: false };
export default function Home() {
  const [editingArea, setEditingArea] = useState<{
    projectId: string;
    area: string;
    title: string;
  } | null>(null);
  const initialAddress = useRef<URLSearchParams | null>(null);
  const addressReady = useRef(false);
  const editorRef = useRef<ModuleEditorHandle>(null);
  const pendingNavigation = useRef<(() => void) | null>(null);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  function navigate(action: () => void) {
    if (editingArea && editorRef.current) {
      if (editorRef.current.requestClose()) pendingNavigation.current = action;
    } else {
      pendingNavigation.current = null;
      setEditingArea(null);
      action();
    }
  }
  function finishClose() {
    const action = pendingNavigation.current;
    pendingNavigation.current = null;
    setEditingArea(null);
    action?.();
  }
  const [companyFilter, setCompanyFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]),
    [org, setOrg] = useState(""),
    [name, setName] = useState(""),
    [data, setData] = useState(initial),
    [tab, setTab] = useState("portfolio"),
    [selected, setSelected] = useState<Project | null>(null),
    [modal, setModal] = useState(""),
    [edit, setEdit] = useState<Project | null>(null),
    [companyEdit, setCompanyEdit] = useState<Company | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(true),
    [dark, setDark] = useState(false),
    [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]),
    [invites, setInvites] = useState<Invitation[]>([]),
    [grants, setGrants] = useState<Grant[]>([]),
    [logs, setLogs] = useState<Audit[]>([]);
  const [target, setTarget] = useState(""),
    [projectId, setProjectId] = useState(""),
    [role, setRole] = useState("viewer"),
    [permissions, setPermissions] = useState<Permissions>(profile("viewer"));
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    api("me")
      .then((me) => {
        setName(me.user.name);
        setOrgs(me.organizations);
        const address = new URLSearchParams(window.location.search);
        const requestedOrg = address.get("workspace");
        const available = me.organizations.some(
          (o: Organization) => o.id === requestedOrg,
        );
        initialAddress.current = available ? address : null;
        setOrg(available ? requestedOrg! : (me.organizations[0]?.id ?? ""));
        if (requestedOrg && !available)
          setMessage(
            "O endereço solicitado não está disponível para este acesso.",
          );
        setBusy(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);
  useEffect(() => {
    if (!org) return;
    let active = true;
    Promise.all([
      api("overview", org),
      tab === "users" ? api("users", org) : Promise.resolve(null),
      tab === "audit" ? api("audit", org) : Promise.resolve(null),
    ])
      .then(([overview, people, audit]) => {
        if (!active) return;
        setData(overview);
        const address = initialAddress.current;
        initialAddress.current = null;
        addressReady.current = true;
        if (address?.get("project")) {
          const project = overview.projects.find(
            (p: Project) => p.id === address.get("project"),
          );
          if (project) {
            setSelected(project);
            setProjectsExpanded(true);
            setTab(address.get("view") === "library" ? "library" : "plan");
            const area = modules.find(
              (m) =>
                m.id === address.get("area") && project.modules.includes(m.id),
            );
            if (area && address.get("view") !== "library")
              setEditingArea({
                projectId: project.id,
                area: area.id,
                title: area.name,
              });
            else if (address.get("area"))
              setMessage("Área indisponível para este acesso.");
          } else setMessage("Projeto indisponível para este acesso.");
        } else
          setSelected((current) =>
            current
              ? (overview.projects.find((p: Project) => p.id === current.id) ??
                null)
              : null,
          );
        if (people) {
          setUsers(people.users);
          setInvites(people.invitations);
          setGrants(people.grants);
        }
        if (audit) setLogs(audit);
      })
      .catch((e) => {
        if (active) setMessage((e as Error).message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [org, tab, revision]);
  useEffect(() => {
    if (!addressReady.current || !org) return;
    const address = new URLSearchParams();
    address.set("workspace", org);
    if (selected && ["plan", "library"].includes(tab)) {
      address.set("project", selected.id);
      if (tab === "library") address.set("view", "library");
      else if (editingArea) address.set("area", editingArea.area);
    }
    window.history.replaceState(window.history.state, "", `/?${address}`);
  }, [org, tab, selected, editingArea]);
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>(
      editingArea ? ".module-page .heading h2" : "main h1",
    );
    heading?.focus({ preventScroll: true });
    document
      .querySelector<HTMLElement>(".project-menu [aria-current='page']")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab, selected?.id, editingArea]);
  async function run(path: string, method: string, body?: unknown) {
    setMessage("");
    try {
      const r = await api(path, org, method, body);
      setModal("");
      setRevision((v) => v + 1);
      setMessage(
        r.delivery
          ? r.delivery === "local-only"
            ? "Convite salvo na caixa local privada. Nenhum e-mail externo enviado."
            : "Convite aceito pelo serviço de e-mail. A entrega ao destinatário depende do provedor."
          : "Alteração salva.",
      );
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    }
  }
  function startInvite() {
    setProjectId(data.projects.find((p) => p.status === "active")?.id ?? "");
    setRole("viewer");
    setPermissions(profile("viewer"));
    setTarget("");
    setModal("invite");
  }
  const affiliations = data.projects.map((p) => ({
    project: p,
    companyId: p.parent_company_id || p.company_id || "general",
    companyName:
      p.parent_company_name ||
      p.company_name ||
      (p.company_id ? "Vínculo existente" : "Projeto geral da organização"),
  }));
  const companyOptions = [
    ...new Map(affiliations.map((a) => [a.companyId, a.companyName])).entries(),
  ];
  const unitOptions = data.projects.filter(
    (p) =>
      p.company_kind === "unit" &&
      (!companyFilter ||
        (p.parent_company_id || p.company_id) === companyFilter),
  );
  const active = data.projects.filter((p) => p.status === "active");
  const titles: Record<string, string> = {
    portfolio: "Seu portfólio, em perspectiva.",
    companies: "Empresas e unidades",
    projects: "Projetos em movimento",
    users: "Usuários e acessos",
    audit: "Histórico de alterações",
    plan: selected?.name ?? "Business Plan",
    library: selected?.name ?? "Biblioteca",
  };
  return (
    <div className={`shell ${dark ? "dark" : ""}`}>
      <aside className="sidebar">
        <Link
          href="/"
          aria-label="BOSS — AYA Projetos — início"
          onClick={(e) => {
            e.preventDefault();
            navigate(() => {
              setTab("portfolio");
              setEditingArea(null);
            });
          }}
        >
          <Brand />
        </Link>
        <nav>
          {[
            {
              id: "portfolio",
              name: "Visão do portfólio",
              icon: LayoutDashboard,
            },
            { id: "projects", name: "Projetos", icon: FolderKanban },
            ...(data.admin
              ? [
                  {
                    id: "companies",
                    name: "Empresas e unidades",
                    icon: Building2,
                  },
                  { id: "users", name: "Usuários e acessos", icon: Users },
                  { id: "audit", name: "Histórico", icon: History },
                ]
              : []),
          ].map((n) => (
            <Fragment key={n.id}>
              <button
                className={tab === n.id ? "active" : ""}
                aria-expanded={
                  n.id === "projects" ? projectsExpanded : undefined
                }
                aria-controls={
                  n.id === "projects" ? "project-shortcuts" : undefined
                }
                onClick={() => {
                  if (n.id === "projects") {
                    setProjectsExpanded((v) => !v);
                    return;
                  }
                  navigate(() => {
                    setTab(n.id);
                    setEditingArea(null);
                    setMessage("");
                    setQuery("");
                  });
                }}
              >
                <n.icon size={18} />
                {n.name}
                {n.id === "projects" && (
                  <span aria-hidden="true">{projectsExpanded ? "−" : "+"}</span>
                )}
              </button>
              {n.id === "projects" && projectsExpanded && (
                <div id="project-shortcuts" className="project-shortcuts">
                  <button
                    onClick={() =>
                      navigate(() => {
                        setTab("projects");
                        setEditingArea(null);
                      })
                    }
                  >
                    Todos os projetos
                  </button>
                  {data.projects.map((p) => (
                    <button
                      key={p.id}
                      aria-current={
                        selected?.id === p.id &&
                        ["plan", "library"].includes(tab)
                          ? "page"
                          : undefined
                      }
                      onClick={() =>
                        navigate(() => {
                          setSelected(p);
                          setEditingArea(null);
                          setTab("plan");
                        })
                      }
                    >
                      {p.name}
                      {p.status === "archived" ? " · Arquivado" : ""}
                    </button>
                  ))}
                  {!data.projects.length && (
                    <p className="subtle">Nenhum projeto disponível.</p>
                  )}
                </div>
              )}
            </Fragment>
          ))}
        </nav>
        <footer>
          <p className="subtle">Uma base para crescer com clareza.</p>
          <Link
            className="row"
            href="/security"
            onClick={(e) => {
              e.preventDefault();
              navigate(() => router.push("/security"));
            }}
          >
            <ShieldCheck size={18} /> Perfil e segurança
          </Link>
        </footer>
      </aside>
      <div className="main">
        <header className="topbar">
          <label className="row">
            <span className="eyebrow">WORKSPACE</span>
            <select
              aria-label="Organização"
              value={org}
              onChange={(e) => {
                const value = e.target.value;
                navigate(() => {
                  setEditingArea(null);
                  setData(initial);
                  setBusy(true);
                  setOrg(value);
                  setCompanyFilter("");
                  setUnitFilter("");
                  setSelected(null);
                  setTab("portfolio");
                });
              }}
            >
              {orgs.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            {data.admin && (
              <button
                className="btn secondary"
                onClick={() =>
                  navigate(() => {
                    setEditingArea(null);
                    setModal("organization");
                  })
                }
              >
                Novo workspace
              </button>
            )}
            <button
              className="btn secondary"
              aria-label="Alternar tema"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              href="/security"
              onClick={(e) => {
                e.preventDefault();
                navigate(() => router.push("/security"));
              }}
            >
              {name}
            </Link>
            <button
              className="btn secondary"
              aria-label="Sair"
              onClick={() =>
                navigate(() => {
                  void authClient.signOut().then(() => {
                    router.push("/login");
                    router.refresh();
                  });
                })
              }
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main
          className={`content ${selected && ["plan", "library"].includes(tab) ? "project-page" : ""}`}
        >
          <div className="heading">
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow">
                {orgs.find((o) => o.id === org)?.name ?? "BEM-VINDO"} /{" "}
                {tab === "users" ? "ADMINISTRAÇÃO" : "ESPAÇO DE GESTÃO"}
              </div>
              <h1 tabIndex={-1}>{titles[tab]}</h1>
              {["plan", "library"].includes(tab) ? (
                selected?.description?.trim() ? (
                  <p className="muted module-text">{selected.description}</p>
                ) : null
              ) : (
                <p className="muted">
                  Estruture hoje. Acompanhe a evolução a cada etapa.
                </p>
              )}
            </div>
            {data.admin && ["portfolio", "projects"].includes(tab) && (
              <button
                className="btn"
                onClick={() => {
                  setEdit(null);
                  setModal("project");
                }}
              >
                <Plus size={17} /> Novo projeto
              </button>
            )}
            {data.admin && tab === "companies" && (
              <button
                className="btn"
                onClick={() => {
                  setCompanyEdit(null);
                  setModal("company");
                }}
              >
                <Plus size={17} /> Nova empresa
              </button>
            )}
            {data.admin && tab === "users" && (
              <button className="btn" onClick={startInvite}>
                <Plus size={17} /> Convidar pessoa
              </button>
            )}
          </div>
          {selected && ["plan", "library"].includes(tab) && (
            <nav className="row project-menu" aria-label="Menu do projeto">
              <button
                className={`btn ${tab === "plan" && !editingArea ? "" : "secondary"}`}
                aria-current={
                  tab === "plan" && !editingArea ? "page" : undefined
                }
                onClick={() =>
                  navigate(() => {
                    setEditingArea(null);
                    setTab("plan");
                  })
                }
              >
                Áreas do projeto
              </button>
              <button
                className={`btn ${tab === "library" ? "" : "secondary"}`}
                aria-current={tab === "library" ? "page" : undefined}
                onClick={() =>
                  navigate(() => {
                    setEditingArea(null);
                    setTab("library");
                  })
                }
              >
                Biblioteca
              </button>
              {modules
                .filter((m) => selected.modules.includes(m.id))
                .map((m) => (
                  <button
                    key={m.id}
                    className={`btn ${editingArea?.area === m.id ? "" : "secondary"}`}
                    aria-current={
                      editingArea?.area === m.id ? "page" : undefined
                    }
                    onClick={() => {
                      if (editingArea?.area === m.id) return;
                      navigate(() => {
                        setTab("plan");
                        setEditingArea({
                          projectId: selected.id,
                          area: m.id,
                          title: m.name,
                        });
                      });
                    }}
                  >
                    {m.name}
                  </button>
                ))}
            </nav>
          )}
          {message && (
            <div role="status" className="notice">
              {message}{" "}
            </div>
          )}
          {busy ? (
            <div className="panel empty" role="status">
              Carregando seu espaço…
            </div>
          ) : !org ? (
            <div className="panel empty">
              <h2>Seu acesso ainda não foi vinculado</h2>
              <p>
                Abra seu convite para ativar os projetos autorizados. O primeiro
                proprietário é provisionado pelo comando seguro de
                inicialização.
              </p>
            </div>
          ) : (
            <>
              {tab === "portfolio" && (
                <>
                  <div className="grid stats">
                    <div className="panel stat">
                      <span className="eyebrow">PROJETOS EM ANDAMENTO</span>
                      <strong>{active.length}</strong>
                      <span className="muted">Em atividade no seu espaço</span>
                    </div>
                    <div className="panel stat">
                      <span className="eyebrow">CATEGORIAS DO BP</span>
                      <strong>17 áreas</strong>
                      <span className="muted">Business Plan · versão 1.0</span>
                    </div>
                    <div className="panel stat">
                      <span className="eyebrow">INDICADORES DE NEGÓCIO</span>
                      <strong style={{ fontSize: 22 }}>Sem dados</strong>
                      <span className="muted">
                        Disponíveis nas próximas fases
                      </span>
                    </div>
                  </div>
                </>
              )}
              {["portfolio", "projects"].includes(tab) && (
                <>
                  <div className="statusline">
                    <h2>Seus projetos</h2>
                    <input
                      style={{ maxWidth: 240 }}
                      aria-label="Buscar projetos"
                      placeholder="Buscar projeto…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <div className="row" style={{ marginBottom: 20 }}>
                    <label>
                      Filtrar por empresa
                      <select
                        value={companyFilter}
                        onChange={(e) => {
                          setCompanyFilter(e.target.value);
                          setUnitFilter("");
                        }}
                      >
                        <option value="">Todas as empresas</option>
                        {companyOptions.map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Filtrar por unidade
                      <select
                        value={unitFilter}
                        onChange={(e) => setUnitFilter(e.target.value)}
                      >
                        <option value="">Todas as unidades</option>
                        {[
                          ...new Map(
                            unitOptions.map((p) => [
                              p.company_id!,
                              p.company_name ?? "Unidade",
                            ]),
                          ).entries(),
                        ].map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {!data.projects.length ? (
                    <section className="panel empty">
                      <FolderKanban
                        size={38}
                        style={{ margin: "0 auto 18px" }}
                      />
                      <h2>Comece com um projeto</h2>
                      <p className="muted">
                        O template mestre organiza as áreas do seu negócio,
                        <br />
                        sem preencher números ou informações fictícias.
                      </p>
                      {data.admin && (
                        <button
                          className="btn"
                          onClick={() => {
                            setEdit(null);
                            setModal("project");
                          }}
                        >
                          Criar primeiro projeto
                        </button>
                      )}
                    </section>
                  ) : (
                    <div className="grid">
                      {data.projects
                        .filter(
                          (p) =>
                            p.name
                              .toLowerCase()
                              .includes(query.toLowerCase()) &&
                            (!companyFilter ||
                              (p.parent_company_id ||
                                p.company_id ||
                                "general") === companyFilter) &&
                            (!unitFilter || p.company_id === unitFilter),
                        )
                        .map((p) => (
                          <article className="panel project" key={p.id}>
                            <div className="row">
                              <span className="tag">
                                {p.status === "active"
                                  ? "Em atividade"
                                  : "Arquivado"}
                              </span>
                            </div>
                            <div className="project-summary">
                              <h2>{p.name}</h2>
                              {p.description?.trim() && (
                                <p className="muted module-text">
                                  {p.description}
                                </p>
                              )}
                              <p className="subtle project-company">
                                {p.parent_company_name
                                  ? `${p.parent_company_name} · ${p.company_name}`
                                  : p.company_name ||
                                    (p.company_id
                                      ? "Vínculo existente"
                                      : "Projeto geral da organização")}
                                {p.company_kind === "brand" ? " (Marca)" : ""}
                              </p>
                            </div>
                            <button
                              className="btn secondary"
                              onClick={() => {
                                setSelected(p);
                                setTab("plan");
                              }}
                            >
                              Abrir Business Plan <ArrowUpRight size={16} />
                            </button>
                          </article>
                        ))}
                    </div>
                  )}
                </>
              )}
              {tab === "library" && selected && (
                <ProjectLibrary
                  key={`${org}:${selected.id}`}
                  org={org}
                  projectId={selected.id}
                />
              )}
              {tab === "plan" && selected && !editingArea && (
                <>
                  <div className="panel" style={{ marginBottom: 24 }}>
                    <div className="heading">
                      <div style={{ minWidth: 0 }}>
                        <h2>Business Plan</h2>
                        <p className="muted module-text">
                          {selected.description ||
                            "Uma estrutura viva para construir o negócio."}
                        </p>
                      </div>
                      {data.admin && (
                        <div className="row">
                          <button
                            className="btn secondary"
                            onClick={() => {
                              setEdit(selected);
                              setModal("project");
                            }}
                          >
                            Editar projeto
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid">
                    {modules
                      .filter((m) => selected.modules.includes(m.id))
                      .map((m) => (
                        <section className="panel module" key={m.id}>
                          <h3>{m.name}</h3>
                          <p className="muted subtle">{m.description}</p>
                          <span className="tag">
                            {selected.module_summaries?.find(
                              (s) => s.area === m.id,
                            )
                              ? `Informações salvas · revisão ${selected.module_summaries.find((s) => s.area === m.id)!.revision}`
                              : "Ainda não preenchido"}
                          </span>
                          <button
                            className="btn module-access"
                            aria-label={`Acessar ${m.name}`}
                            onClick={() =>
                              setEditingArea({
                                projectId: selected.id,
                                area: m.id,
                                title: m.name,
                              })
                            }
                          >
                            Acessar
                          </button>
                        </section>
                      ))}
                  </div>
                </>
              )}
              {tab === "plan" && selected && editingArea && (
                <ModuleEditor
                  ref={editorRef}
                  key={`${org}:${editingArea.projectId}:${editingArea.area}`}
                  org={org}
                  {...editingArea}
                  onClose={finishClose}
                  onCancelClose={() => {
                    pendingNavigation.current = null;
                  }}
                  onSaved={() => setRevision((v) => v + 1)}
                />
              )}
              {tab === "companies" && (
                <div className="grid">
                  {data.companies.map((c) => (
                    <section className="panel" key={c.id}>
                      <Building2 size={22} />
                      <h2 style={{ marginTop: 18 }}>{c.name}</h2>
                      <p className="muted">
                        {c.kind} · {c.status}
                      </p>
                      <div className="row">
                        <button
                          className="btn secondary"
                          onClick={() => {
                            setCompanyEdit(c);
                            setModal("company");
                          }}
                        >
                          Editar
                        </button>
                        <button
                          className="btn secondary danger"
                          onClick={() => {
                            if (
                              confirm(
                                "Arquivar empresa preservando seus projetos?",
                              )
                            )
                              void run(`companies/${c.id}`, "DELETE");
                          }}
                        >
                          Arquivar
                        </button>
                      </div>
                    </section>
                  ))}
                  {!data.companies.length && (
                    <div className="panel empty">
                      <h2>Uma estrutura flexível</h2>
                      <p>
                        Crie empresas, marcas ou unidades. Projetos também podem
                        pertencer diretamente à AYA.
                      </p>
                    </div>
                  )}
                </div>
              )}
              {tab === "users" && (
                <div className="stack">
                  <section className="panel">
                    <div className="statusline">
                      <h2>Pessoas no espaço</h2>
                      <button
                        className="btn secondary"
                        onClick={() => {
                          setTarget(
                            users.find((u) => u.role === "member")?.user_id ??
                              "",
                          );
                          setProjectId(active[0]?.id ?? "");
                          setPermissions(profile("viewer"));
                          setRole("viewer");
                          setModal("grant");
                        }}
                      >
                        Editar matriz de acessos
                      </button>
                    </div>
                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Pessoa</th>
                            <th>Papel global</th>
                            <th>Status</th>
                            <th>MFA</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.user_id}>
                              <td>
                                <strong>{u.name}</strong>
                                <div className="muted">{u.email}</div>
                                <small>
                                  {u.last_login
                                    ? new Date(u.last_login).toLocaleString(
                                        "pt-BR",
                                      )
                                    : "Sem login registrado"}
                                </small>
                              </td>
                              <td>{roleLabels[u.role] ?? "Membro"}</td>
                              <td>{u.status}</td>
                              <td>
                                {u.twoFactorEnabled
                                  ? "Ativo"
                                  : "Opcional, desativado"}
                              </td>
                              <td>
                                <button
                                  className="btn secondary"
                                  onClick={() => {
                                    setTarget(u.user_id);
                                    setModal("user");
                                  }}
                                >
                                  Detalhes
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="panel">
                    <h2>Convites</h2>
                    <p className="muted subtle">
                      A entrega usa o canal configurado para este ambiente.
                      Consulte o resultado de cada envio.
                    </p>
                    {invites.map((i) => (
                      <div
                        key={i.id}
                        className="row"
                        style={{
                          padding: 14,
                          borderBottom: "1px solid var(--line)",
                        }}
                      >
                        <strong>{i.email}</strong>
                        <span className="muted">
                          {i.status === "pending" &&
                          new Date(i.expires_at) < new Date()
                            ? "expired"
                            : i.status}{" "}
                          · {roleLabels[i.role]}
                        </span>
                        {i.status === "pending" && (
                          <>
                            <button
                              className="btn secondary"
                              onClick={() =>
                                run(`invitations/${i.id}`, "POST", {})
                              }
                            >
                              Reemitir
                            </button>
                            <button
                              className="btn secondary danger"
                              onClick={() =>
                                run(`invitations/${i.id}`, "DELETE")
                              }
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {!invites.length && (
                      <p className="muted">Nenhum convite criado.</p>
                    )}
                  </section>
                </div>
              )}
              {tab === "audit" && (
                <section className="panel tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Quando</th>
                        <th>Responsável</th>
                        <th>Evento</th>
                        <th>Referência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id}>
                          <td>
                            {new Date(l.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td>{l.actor}</td>
                          <td>{l.action}</td>
                          <td>{l.target_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!logs.length && <p>Sem eventos registrados.</p>}
                  <p className="muted subtle">
                    Últimos 100 eventos desta organização.
                  </p>
                </section>
              )}
            </>
          )}
        </main>
      </div>
      {modal && (
        <Modal onClose={() => setModal("")}>
          <section className="panel">
            <div className="heading">
              <h2>
                {modal === "project"
                  ? edit
                    ? "Editar projeto"
                    : "Novo projeto"
                  : modal === "company"
                    ? "Empresa / marca / unidade"
                    : modal === "invite"
                      ? "Convidar pessoa"
                      : modal === "user"
                        ? "Detalhes do usuário"
                        : modal === "organization"
                          ? "Novo workspace"
                          : "Matriz de permissões"}
              </h2>
              <button
                className="btn secondary"
                aria-label="Fechar"
                onClick={() => setModal("")}
              >
                ✕
              </button>
            </div>
            {message && (
              <p role="status" className="notice">
                {message}
              </p>
            )}
            {modal === "organization" && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  try {
                    const r = await api("organizations", org, "POST", {
                      name: f.get("name"),
                    });
                    const me = await api("me");
                    setOrgs(me.organizations);
                    setData(initial);
                    setOrg(r.id);
                    setCompanyFilter("");
                    setUnitFilter("");
                    setTab("portfolio");
                    setModal("");
                  } catch (err) {
                    setMessage((err as Error).message);
                  }
                }}
              >
                <label>
                  Nome do workspace / organização
                  <input name="name" required minLength={2} />
                </label>
                <p className="muted">
                  Cria uma organização independente, com você como proprietário.
                  Empresas e projetos atuais não serão transferidos.
                </p>
                <button className="btn">Criar workspace</button>
              </form>
            )}
            {modal === "project" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(
                    edit ? `projects/${edit.id}` : "projects",
                    edit ? "PATCH" : "POST",
                    {
                      name: f.get("name"),
                      description: f.get("description"),
                      company_id: f.get("company_id") || null,
                      currency: edit?.currency ?? "BRL",
                      timezone: edit?.timezone ?? "America/Fortaleza",
                      modules: f.getAll("modules"),
                    },
                  );
                }}
              >
                <label>
                  Nome do projeto
                  <input
                    name="name"
                    required
                    minLength={2}
                    defaultValue={edit?.name}
                  />
                </label>
                <label>
                  Descrição
                  <textarea
                    name="description"
                    defaultValue={edit?.description}
                  />
                </label>
                <ProjectAffiliation
                  key={edit?.id ?? "new"}
                  companies={data.companies}
                  current={edit?.company_id ?? null}
                />
                <p className="muted">
                  Selecione as áreas competentes do novo projeto:
                </p>
                <div className="checkgrid">
                  {modules.map((m) => (
                    <label key={m.id}>
                      <input
                        name="modules"
                        type="checkbox"
                        value={m.id}
                        defaultChecked={!edit || edit.modules.includes(m.id)}
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
                <button className="btn">Salvar projeto</button>
              </form>
            )}
            {modal === "company" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void run(
                    companyEdit ? `companies/${companyEdit.id}` : "companies",
                    companyEdit ? "PATCH" : "POST",
                    {
                      name: f.get("name"),
                      kind: f.get("kind"),
                      parent_id: f.get("parent_id") || null,
                    },
                  );
                }}
              >
                <label>
                  Nome
                  <input
                    name="name"
                    required
                    minLength={2}
                    defaultValue={companyEdit?.name}
                  />
                </label>
                {!companyEdit && (
                  <>
                    <label>
                      Tipo
                      <select name="kind">
                        <option value="company">Empresa</option>
                        <option value="brand">Marca</option>
                        <option value="unit">Unidade</option>
                      </select>
                    </label>
                    <label>
                      Empresa principal
                      <select name="parent_id">
                        <option value="">Diretamente à organização</option>
                        {data.companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <button className="btn">Salvar empresa</button>
              </form>
            )}
            {["invite", "grant"].includes(modal) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const allowed = Object.fromEntries(
                    Object.entries(permissions).filter(([k]) =>
                      data.projects
                        .find((p) => p.id === projectId)
                        ?.modules.includes(k),
                    ),
                  );
                  void run(
                    modal === "invite" ? "invitations" : "grants",
                    "POST",
                    {
                      project_id: projectId,
                      role,
                      permissions: allowed,
                      ...(modal === "invite"
                        ? { email: f.get("email") }
                        : { user_id: target, status: f.get("status") }),
                    },
                  );
                }}
              >
                {modal === "invite" ? (
                  <label>
                    E-mail
                    <input name="email" type="email" required />
                  </label>
                ) : (
                  <label>
                    Pessoa
                    <select
                      value={target}
                      required
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {users
                        .filter((u) => u.role === "member")
                        .map((u) => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.name} · {u.email}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <label>
                  Projeto
                  <select
                    value={projectId}
                    required
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {active.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Modelo de papel
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setPermissions(profile(e.target.value));
                    }}
                  >
                    {roles.map((r) => (
                      <option value={r} key={r}>
                        {roleLabels[r]}
                      </option>
                    ))}
                  </select>
                </label>
                {modal === "grant" && (
                  <>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => {
                        const g = grants.find(
                          (g) =>
                            g.user_id === target && g.project_id === projectId,
                        );
                        if (g) {
                          setRole(g.role);
                          setPermissions(g.permissions);
                        } else
                          setMessage(
                            "Nenhum vínculo anterior. Configure os acessos abaixo.",
                          );
                      }}
                    >
                      Carregar permissões atuais
                    </button>
                    <label>
                      Status
                      <select name="status">
                        <option value="active">Ativo</option>
                        <option value="revoked">Revogado</option>
                      </select>
                    </label>
                  </>
                )}
                <p className="muted subtle">
                  Papéis são modelos editáveis. Gestão global permanece restrita
                  aos administradores da organização.
                </p>
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Área</th>
                        {actions.map((a) => (
                          <th key={a}>{actionLabels[a]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modules
                        .filter((m) =>
                          data.projects
                            .find((p) => p.id === projectId)
                            ?.modules.includes(m.id),
                        )
                        .map((m) => (
                          <tr key={m.id}>
                            <td>{m.name}</td>
                            {actions.map((a) => (
                              <td key={a}>
                                <input
                                  aria-label={`${m.name}: ${actionLabels[a]}`}
                                  type="checkbox"
                                  checked={
                                    permissions[m.id]?.includes(a) ?? false
                                  }
                                  onChange={(e) =>
                                    setPermissions({
                                      ...permissions,
                                      [m.id]: e.target.checked
                                        ? [...(permissions[m.id] ?? []), a]
                                        : (permissions[m.id] ?? []).filter(
                                            (x) => x !== a,
                                          ),
                                    })
                                  }
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn">
                  {modal === "invite" ? "Criar convite" : "Salvar permissões"}
                </button>
              </form>
            )}
            {modal === "user" &&
              users
                .filter((u) => u.user_id === target)
                .map((u) => (
                  <form
                    key={u.user_id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void run(`users/${u.user_id}`, "PATCH", {
                        status: f.get("status"),
                        job_title: f.get("job_title"),
                      });
                    }}
                  >
                    <p>
                      <strong>{u.name}</strong>
                      <br />
                      {u.email}
                    </p>
                    <label>
                      Função
                      <input name="job_title" defaultValue={u.job_title} />
                    </label>
                    <label>
                      Status
                      <select name="status" defaultValue={u.status}>
                        <option value="active">Ativo</option>
                        <option value="suspended">Suspenso</option>
                        <option value="deactivated">Desativado</option>
                      </select>
                    </label>
                    <p className="muted">
                      Tarefas e responsabilidades operacionais ainda não existem
                      nesta fase. Suspensão revoga sessões e bloqueia consultas
                      imediatamente.
                    </p>
                    <button className="btn">Salvar usuário</button>
                  </form>
                ))}
          </section>
        </Modal>
      )}
    </div>
  );
}
