"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { useEffect, useState } from "react";
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
  currency: string;
  timezone: string;
  modules: string[];
  status: string;
  template_version: number;
};
type Company = { id: string; name: string; kind: string; status: string };
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
        setOrg(me.organizations[0]?.id ?? "");
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
  const active = data.projects.filter((p) => p.status === "active");
  const titles: Record<string, string> = {
    portfolio: "Seu portfólio, em perspectiva.",
    companies: "Empresas e unidades",
    projects: "Projetos em movimento",
    users: "Usuários e acessos",
    audit: "Histórico de alterações",
    plan: selected?.name ?? "Business Plan",
  };
  return (
    <div className={`shell ${dark ? "dark" : ""}`}>
      <aside className="sidebar">
        <Link href="/" className="brand">
          BOSS<span>AYA PROJETOS</span>
        </Link>
        <small>
          BUSINESS OPERATION
          <br />
          SALES SYSTEM
        </small>
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
            <button
              key={n.id}
              className={tab === n.id ? "active" : ""}
              onClick={() => {
                setTab(n.id);
                setMessage("");
                setQuery("");
              }}
            >
              <n.icon size={18} />
              {n.name}
            </button>
          ))}
        </nav>
        <footer>
          <p className="subtle">Uma base para crescer com clareza.</p>
          <Link className="row" href="/security">
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
                setData(initial);
                setBusy(true);
                setOrg(e.target.value);
                setSelected(null);
                setTab("portfolio");
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
                onClick={() => setModal("organization")}
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
            <Link href="/security">{name}</Link>
            <button
              className="btn secondary"
              aria-label="Sair"
              onClick={async () => {
                await authClient.signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="content">
          <div className="heading">
            <div>
              <div className="eyebrow">
                {orgs.find((o) => o.id === org)?.name ?? "BEM-VINDO"} /{" "}
                {tab === "users" ? "ADMINISTRAÇÃO" : "ESPAÇO DE GESTÃO"}
              </div>
              <h1>{titles[tab]}</h1>
              <p className="muted">
                Estruture hoje. Acompanhe a evolução a cada etapa.
              </p>
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
                      <span className="eyebrow">PROJETOS AUTORIZADOS</span>
                      <strong>{active.length}</strong>
                      <span className="muted">Em atividade no seu espaço</span>
                    </div>
                    <div className="panel stat">
                      <span className="eyebrow">TEMPLATE MESTRE</span>
                      <strong>17 áreas</strong>
                      <span className="muted">Business Plan · versão 1</span>
                    </div>
                    <div className="panel stat">
                      <span className="eyebrow">INDICADORES DE NEGÓCIO</span>
                      <strong style={{ fontSize: 22 }}>Sem dados</strong>
                      <span className="muted">
                        Disponíveis nas próximas fases
                      </span>
                    </div>
                  </div>
                  <div className="notice">
                    <strong>Fundação do seu Business OS.</strong> Organize
                    empresas, crie projetos e convide sua equipe. Módulos
                    operacionais e indicadores serão entregues nas fases
                    seguintes, com dados reais.
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
                        .filter((p) =>
                          p.name.toLowerCase().includes(query.toLowerCase()),
                        )
                        .map((p) => (
                          <article className="panel project" key={p.id}>
                            <div className="row">
                              <span className="tag">
                                {p.status === "active"
                                  ? "Em atividade"
                                  : "Arquivado"}
                              </span>
                              <span className="muted subtle">{p.currency}</span>
                            </div>
                            <h2>{p.name}</h2>
                            <p className="muted">
                              {p.description ||
                                "Seu Business Plan está pronto para ganhar forma."}
                            </p>
                            <span className="subtle muted">
                              {p.modules.length} áreas autorizadas · Template v
                              {p.template_version}
                            </span>
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
              {tab === "plan" && selected && (
                <>
                  <div className="panel" style={{ marginBottom: 24 }}>
                    <div className="heading">
                      <div>
                        <h2>Business Plan</h2>
                        <p className="muted">
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
                          <button
                            className="btn secondary danger"
                            onClick={async () => {
                              if (
                                confirm(
                                  "Arquivar este projeto? Os dados serão preservados.",
                                )
                              )
                                if (
                                  await run(`projects/${selected.id}`, "DELETE")
                                )
                                  setTab("projects");
                            }}
                          >
                            Arquivar
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="tag">
                      Template v{selected.template_version}
                    </span>{" "}
                    <span className="muted">
                      {selected.timezone} · {selected.currency}
                    </span>
                  </div>
                  <div className="grid">
                    {modules
                      .filter((m) => selected.modules.includes(m.id))
                      .map((m) => (
                        <section className="panel module" key={m.id}>
                          <b>ÁREA {m.letter}</b>
                          <h3>{m.name}</h3>
                          <p className="muted subtle">
                            Estrutura disponível. Operações e indicadores desta
                            área serão implementados na fase correspondente.
                          </p>
                          <span className="tag">Sem dados operacionais</span>
                        </section>
                      ))}
                  </div>
                </>
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
                      currency: f.get("currency"),
                      timezone: f.get("timezone"),
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
                <label>
                  Vincular à empresa
                  <select
                    name="company_id"
                    defaultValue={edit?.company_id ?? ""}
                  >
                    <option value="">Diretamente à AYA / organização</option>
                    {data.companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid two">
                  <label>
                    Moeda
                    <input
                      name="currency"
                      defaultValue={edit?.currency ?? "BRL"}
                      pattern="[A-Z]{3}"
                      required
                    />
                  </label>
                  <label>
                    Timezone
                    <input
                      name="timezone"
                      defaultValue={edit?.timezone ?? "America/Fortaleza"}
                      required
                    />
                  </label>
                </div>
                <p className="muted">
                  Selecione as áreas do template mestre v1. Nenhum dado
                  existente será sobrescrito por atualizações futuras.
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
                      {m.letter}. {m.name}
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
