// Planning content only. Operational ledgers, pipelines and calculated KPIs are separate increments.
export const moduleFields: Record<
  string,
  Array<{ id: string; label: string; hint: string }>
> = Object.fromEntries(
  Object.entries({
    executive: [
      [
        "business",
        "Visão do negócio",
        "Descreva o negócio e seu estágio atual.",
      ],
      ["problem", "Problema e oportunidade", "Que necessidade será atendida?"],
      [
        "solution",
        "Solução e proposta de valor",
        "O que será entregue e quais são os diferenciais?",
      ],
      [
        "revenue",
        "Modelo de receita",
        "Como o negócio pretende gerar receita?",
      ],
      [
        "priorities",
        "Objetivos prioritários",
        "Registre prioridades e premissas.",
      ],
    ],
    dna: [
      ["purpose", "Propósito", "Por que este negócio existe?"],
      ["mission", "Missão", "O que faz, para quem e como?"],
      ["vision", "Visão", "Qual futuro deseja construir?"],
      [
        "values",
        "Valores e princípios",
        "Quais comportamentos e limites orientam decisões?",
      ],
      [
        "positioning",
        "Posicionamento e cultura",
        "Descreva personalidade, narrativa e práticas culturais.",
      ],
    ],
    strategy: [
      [
        "diagnosis",
        "Diagnóstico estratégico",
        "Registre forças, fraquezas, oportunidades e ameaças.",
      ],
      [
        "context",
        "Cenários e premissas",
        "Inclua fatores externos e hipóteses.",
      ],
      [
        "objectives",
        "Objetivos estratégicos",
        "Quais resultados precisam mudar?",
      ],
      [
        "initiatives",
        "Iniciativas e prioridades",
        "Quais ações sustentam os objetivos?",
      ],
      [
        "roadmap",
        "Roadmap e decisões",
        "Registre sequência, horizonte e decisões relevantes.",
      ],
    ],
    market: [
      [
        "segments",
        "Segmentos e público ideal",
        "Quem tem a necessidade e como é atendido hoje?",
      ],
      [
        "size",
        "Dimensão e estimativas de mercado",
        "Indique fonte, data e premissas; não trate estimativas como resultados.",
      ],
      [
        "competition",
        "Concorrentes e alternativas",
        "Registre evidências e diferenças.",
      ],
      [
        "trends",
        "Tendências e oportunidades",
        "Quais mudanças afetam o projeto?",
      ],
    ],
    products: [
      [
        "portfolio",
        "Produtos e serviços",
        "Descreva ofertas, público e proposta de valor.",
      ],
      ["differentiation", "Diferenciais", "O que torna cada oferta relevante?"],
      [
        "pricing",
        "Estratégia de preço e custos",
        "Premissas de planejamento; não são lançamentos financeiros.",
      ],
      ["roadmap", "Evolução das ofertas", "Registre melhorias e prioridades."],
    ],
    marketing: [
      [
        "positioning",
        "Marca e mensagem",
        "Qual posicionamento orienta a comunicação?",
      ],
      [
        "channels",
        "Canais e aquisição",
        "Registre canais, público e hipóteses.",
      ],
      [
        "campaigns",
        "Planejamento de campanhas",
        "Objetivos, conteúdo, período e orçamento proposto.",
      ],
      [
        "measurement",
        "Plano de mensuração",
        "Fontes e critérios de acompanhamento; não há métricas automáticas neste editor.",
      ],
    ],
    sales: [
      [
        "strategy",
        "Estratégia comercial",
        "Descreva abordagem, canais e público.",
      ],
      [
        "process",
        "Processo de vendas",
        "Defina etapas e critérios para avançar.",
      ],
      ["offers", "Propostas e negociação", "Registre diretrizes e condições."],
      [
        "goals",
        "Metas e premissas comerciais",
        "Planejamento manual; este editor não é um pipeline de oportunidades.",
      ],
    ],
    customers: [
      [
        "journey",
        "Jornada do cliente",
        "Aquisição, onboarding, uso, suporte e renovação.",
      ],
      [
        "service",
        "Atendimento e relacionamento",
        "Defina canais, compromissos e responsabilidades.",
      ],
      [
        "retention",
        "Retenção e expansão",
        "Hipóteses e ações para continuidade.",
      ],
      [
        "feedback",
        "Feedback e aprendizados",
        "Registre fontes, datas e aprendizados sem dados pessoais desnecessários.",
      ],
    ],
    operations: [
      [
        "processes",
        "Processos e entrega",
        "Descreva etapas, entradas e saídas.",
      ],
      [
        "resources",
        "Recursos e capacidade",
        "Registre equipe, fornecedores e necessidades.",
      ],
      [
        "quality",
        "Qualidade e níveis de serviço",
        "Defina critérios e compromissos.",
      ],
      [
        "improvements",
        "Gargalos e melhorias",
        "Registre problemas observados e ações propostas.",
      ],
    ],
    tasks: [
      ["scope", "Escopo e entregas", "Quais entregas compõem o projeto?"],
      [
        "milestones",
        "Marcos e prazos",
        "Registre planejamento e dependências.",
      ],
      ["responsibilities", "Responsabilidades", "Quem acompanha cada entrega?"],
      [
        "execution",
        "Plano de execução",
        "Use itens para documentar o plano; gestão operacional de tarefas virá em incremento próprio.",
      ],
    ],
    finance: [
      [
        "assumptions",
        "Premissas financeiras",
        "Registre moeda, período e hipóteses de planejamento.",
      ],
      [
        "revenue",
        "Receitas planejadas",
        "Descreva fontes e premissas; não registra receitas realizadas.",
      ],
      [
        "costs",
        "Custos e investimentos planejados",
        "Descreva compromissos e necessidades.",
      ],
      [
        "controls",
        "Controles e acompanhamento",
        "Defina responsáveis e fontes; fluxo de caixa, DRE e conciliação não são calculados neste editor.",
      ],
    ],
    people: [
      [
        "structure",
        "Estrutura e papéis",
        "Descreva equipes e responsabilidades.",
      ],
      [
        "capacity",
        "Capacidade e competências",
        "Quais capacidades existem e quais faltam?",
      ],
      [
        "development",
        "Contratação e desenvolvimento",
        "Registre planejamento e prioridades.",
      ],
      [
        "practices",
        "Práticas de gestão",
        "Onboarding, avaliação e políticas; evite dados pessoais sensíveis.",
      ],
    ],
    governance: [
      [
        "policies",
        "Governança e políticas",
        "Registre regras, alçadas e decisões.",
      ],
      ["obligations", "Obrigações e prazos", "Indique fontes e responsáveis."],
      [
        "contracts",
        "Contratos e documentos",
        "Referencie documentos e requisitos sem inserir segredos.",
      ],
      [
        "controls",
        "Controles e privacidade",
        "Descreva controles e riscos; não substitui orientação jurídica.",
      ],
    ],
    technology: [
      [
        "architecture",
        "Sistemas e arquitetura",
        "Quais ferramentas e sistemas sustentam o negócio?",
      ],
      ["data", "Dados e fontes", "Registre origem, qualidade e responsáveis."],
      [
        "integrations",
        "Integrações planejadas",
        "Descreva fluxos; nunca cole credenciais ou tokens.",
      ],
      [
        "continuity",
        "Operação e continuidade tecnológica",
        "Registre incidentes, dependências e planos.",
      ],
    ],
    risks: [
      [
        "context",
        "Contexto e riscos",
        "Quais ameaças podem comprometer os objetivos?",
      ],
      [
        "assessment",
        "Avaliação",
        "Descreva probabilidade, impacto e premissas.",
      ],
      [
        "mitigation",
        "Mitigação e contingência",
        "Defina ações, responsáveis e dependências.",
      ],
      [
        "sustainability",
        "Sustentabilidade e continuidade",
        "Registre compromissos e planos de continuidade.",
      ],
    ],
    documents: [
      [
        "structure",
        "Organização do conhecimento",
        "Defina categorias e padrões de documentação.",
      ],
      [
        "playbooks",
        "Playbooks e procedimentos",
        "Registre procedimentos e referências.",
      ],
      [
        "decisions",
        "Decisões e aprendizados",
        "Indique contexto, fonte e data.",
      ],
      [
        "maintenance",
        "Manutenção do conhecimento",
        "Defina responsáveis e periodicidade de revisão.",
      ],
    ],
    reports: [
      [
        "questions",
        "Perguntas de gestão",
        "Quais decisões os relatórios devem apoiar?",
      ],
      [
        "indicators",
        "Indicadores planejados",
        "Defina conceito, fórmula proposta, unidade e periodicidade.",
      ],
      [
        "sources",
        "Fontes e qualidade",
        "De onde virão os dados e quem os valida?",
      ],
      [
        "reporting",
        "Relatórios e acompanhamento",
        "Defina público e cadência; nenhum KPI é calculado a partir destes textos.",
      ],
    ],
  }).map(([area, fields]) => [
    area,
    fields.map(([id, label, hint]) => ({ id, label, hint })),
  ]),
);
export type ModuleItem = {
  id: string;
  title: string;
  text: string;
  source: string;
  period: string;
  responsible: string;
  archived: boolean;
};
export type ModuleDocument = {
  revision: number;
  fields: Record<string, string>;
  items: ModuleItem[];
  updated_at?: string;
  author_name?: string;
};
