export const modules = [
  ["executive", "Resumo executivo", "A"],
  ["dna", "DNA, identidade e cultura", "B"],
  ["strategy", "Planejamento estratégico", "C"],
  ["market", "Mercado e inteligência", "D"],
  ["products", "Produtos e serviços", "E"],
  ["marketing", "Marketing e growth", "F"],
  ["sales", "Comercial e vendas", "G"],
  ["customers", "Clientes e atendimento", "H"],
  ["operations", "Operações e entrega", "I"],
  ["tasks", "Projetos, tarefas e execução", "J"],
  ["finance", "Financeiro e controladoria", "K"],
  ["people", "Pessoas e RH", "L"],
  ["governance", "Governança e jurídico", "M"],
  ["technology", "Tecnologia e integrações", "N"],
  ["risks", "Riscos e continuidade", "O"],
  ["documents", "Documentação e conhecimento", "P"],
  ["reports", "Indicadores e relatórios", "Q"],
].map(([id, name, letter]) => ({ id, name, letter }));
export const actions = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "export",
  "manage_users",
  "manage_permissions",
  "configure_integrations",
  "sensitive_data",
] as const;
export const actionLabels: Record<string, string> = {
  view: "Visualizar",
  create: "Criar",
  edit: "Editar",
  delete: "Arquivar",
  approve: "Aprovar",
  export: "Exportar",
  manage_users: "Usuários",
  manage_permissions: "Permissões",
  configure_integrations: "Integrações",
  sensitive_data: "Dados sensíveis",
};
export const roles = [
  "company_admin",
  "project_manager",
  "area_manager",
  "collaborator",
  "finance",
  "guest",
  "viewer",
] as const;
export const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador geral",
  company_admin: "Administrador da empresa",
  project_manager: "Gestor de projeto",
  area_manager: "Gestor de área",
  collaborator: "Colaborador",
  finance: "Financeiro",
  guest: "Convidado",
  viewer: "Visualizador",
};
export type Permissions = Record<string, string[]>;
export function profile(role: string): Permissions {
  const ids = role === "finance" ? ["finance"] : modules.map((m) => m.id);
  return Object.fromEntries(
    ids.map((id) => [
      id,
      role === "viewer" || role === "guest"
        ? ["view"]
        : role === "project_manager"
          ? ["view", "create", "edit", "approve"]
          : ["view", "create", "edit"],
    ]),
  );
}
export const masterTemplate = {
  id: "boss-master-v1",
  version: 1,
  modules: modules.map((m) => m.id),
};
