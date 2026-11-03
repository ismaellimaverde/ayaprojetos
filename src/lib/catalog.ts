export const modules = [
  [
    "executive",
    "Resumo executivo",
    "A",
    "Síntese do negócio, da proposta de valor e dos objetivos que orientam o projeto.",
  ],
  [
    "dna",
    "DNA, identidade e cultura",
    "B",
    "Propósito, missão, visão, valores e práticas que definem a identidade e a cultura do negócio.",
  ],
  [
    "strategy",
    "Planejamento estratégico",
    "C",
    "Direção do negócio, com análise de cenário, prioridades, objetivos e iniciativas para alcançá-los.",
  ],
  [
    "market",
    "Mercado e inteligência",
    "D",
    "Conhecimento do mercado, dos públicos, dos concorrentes e das oportunidades para o negócio.",
  ],
  [
    "products",
    "Produtos e serviços",
    "E",
    "Definição das ofertas, dos benefícios para o cliente, dos diferenciais e da evolução de produtos e serviços.",
  ],
  [
    "marketing",
    "Marketing e growth",
    "F",
    "Estratégias de posicionamento, comunicação e canais para atrair públicos e desenvolver o negócio.",
  ],
  [
    "sales",
    "Comercial e vendas",
    "G",
    "Organização do processo comercial, da prospecção à negociação e ao fechamento de vendas.",
  ],
  [
    "customers",
    "Clientes e atendimento",
    "H",
    "Conhecimento dos clientes e planejamento da experiência, do atendimento e do relacionamento ao longo da jornada.",
  ],
  [
    "operations",
    "Operações e entrega",
    "I",
    "Processos, recursos e padrões de qualidade necessários para produzir e entregar o que foi prometido.",
  ],
  [
    "tasks",
    "Projetos, tarefas e execução",
    "J",
    "Organização das iniciativas em projetos, atividades, responsáveis, prazos e dependências de execução.",
  ],
  [
    "finance",
    "Financeiro e controladoria",
    "K",
    "Premissas financeiras, receitas, custos, orçamento e critérios de controle que sustentam as decisões do negócio.",
  ],
  [
    "people",
    "Pessoas e RH",
    "L",
    "Estrutura da equipe, papéis, competências e práticas de contratação, desenvolvimento e gestão de pessoas.",
  ],
  [
    "governance",
    "Governança e jurídico",
    "M",
    "Regras de decisão, responsabilidades, contratos e obrigações legais que orientam a atuação do negócio.",
  ],
  [
    "technology",
    "Tecnologia e integrações",
    "N",
    "Sistemas, infraestrutura, segurança da informação e integrações necessários ao funcionamento do negócio.",
  ],
  [
    "risks",
    "Riscos e continuidade",
    "O",
    "Identificação de ameaças, avaliação de impactos e medidas de prevenção, resposta e continuidade das atividades.",
  ],
  [
    "documents",
    "Documentação e conhecimento",
    "P",
    "Organização de documentos, referências e aprendizados para preservar e compartilhar o conhecimento da equipe.",
  ],
  [
    "reports",
    "Indicadores e relatórios",
    "Q",
    "Definição de indicadores, fontes de dados e relatórios para acompanhar resultados e apoiar decisões.",
  ],
].map(([id, name, letter, description]) => ({ id, name, letter, description }));
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
