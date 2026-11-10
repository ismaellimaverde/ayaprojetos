# Arquivos gerais e lixeira — revisão local, 2026-11-09

## Pedido e estado remoto observado

Título maior com ícone, retirada de Mostrar todas as categorias/Organizar arquivo, pastas gerais do projeto (nome apenas), exclusão recuperável. Consulta somente de metadados nesta revisão: 1 pasta, 1 arquivo com upload, zero grants ativos de projeto e migrações 001–005. Não se leu conteúdo privado. Nenhum desses registros foi alterado.

## Parte implementada localmente

Título destacado com ícone de ficheiros, cards Documentos/Fotos/Vídeos mantidos. Removidos os botões Mostrar todas as categorias e Organizar arquivo. Backend PATCH de organização permanece para compatibilidade, sem ampliar acesso.

Migração candidata 006_library_trash.sql acrescenta deleted_at/deleted_by e índice, sem reescrever áreas ou apagar linhas. Excluir pede confirmação com nome/consequências; marca o registro, preserva binário/URL e exige delete na área legada. Lixeira lista apenas registros de áreas com delete autorizado; restauração exige a mesma permissão e projeto ativo. Sem download/organização enquanto removido. Repetições são idempotentes e não duplicam eventos de auditoria. Restaurar não muda pasta nem ACL. Links não são buscados/apagados em provedores externos.

Linhas na lixeira continuam contando no limite de 200 registros e seus bytes na quota compartilhada de 50 MiB, permitindo restauração sem consumir espaço adicional. Não há purga automática nem liberação fictícia de espaço. Folders não são excluídas nesta proposta. Projetos arquivados não permitem remover/restaurar.

## Decisão bloqueante: pastas gerais

`projectAccess` deriva permissões por módulo de `grants.permissions`. Os nomes de perfil como project_manager são presets, não autorização independente para arquivos gerais. Apenas owner/admin da organização têm autoridade global inequívoca. Não existe ação general_files_view/create/delete definida no modelo atual. Mesmo sem grants ativos hoje, uma regra precisa valer para novos membros e convites amanhã.

Foi solicitada decisão explícita: (A) novos arquivos gerais disponíveis somente a owner/admin inicialmente; ou (B) leitura para membros com acesso ao projeto, criação/exclusão/restauração somente owner/admin. Opções não implementadas nem consideradas aprovadas. Uma política mais granular exige definição adicional.

**Pastas gerais ainda não implementadas:** o formulário de área permanece no candidato para não ocultar uma associação funcional e nem transformar área existente em permissão implícita de projeto. Não declarar o pedido integralmente concluído.

Após a escolha, preparar escopo explícito project/area com campos/constraints adequados, sem usar um módulo fictício ou nota para codificar ACL. Novas pastas project terão cadastro apenas de nome. Os registros existentes continuam no escopo area e com acesso legado; qualquer conversão que amplie acesso precisa de decisão específica. Deve haver distinção clara na UI para o acervo legado, sem mostrar a seleção de área para novos arquivos gerais.

## Publicação e proteção

Nenhum push, deploy, migração remota, exclusão real, credencial ou alteração de configuração nesta revisão. 006 é candidata local, não aprovação automática pela autorização da migração 005. Antes da publicação: concluir ACL, testar fluxo final, explicar migração e obter autorização aplicável, verificando proteção atualizada do schema. O backup anterior não é presumido atualizado: já há arquivo real posterior ao estado vazio.

Código com referências a deleted_at não deve ser publicado antes da migração correspondente. Em rollback, manter colunas e dados, mas evitar reverter para código antigo que ignora deleted_at: ele poderia voltar a exibir arquivos removidos. Não restaurar banco nem purgar para desfazer UI.

## Evidência local

Lint, TypeScript, build e 34 testes unitários/integração aprovados. Três E2E passaram (1440/390px, cards, upload/link, exclusão/cancelamento/restauração e Biblioteca preservada). Após ajuste final para limpar a listagem enquanto alterna lixeira/ativos, lint/types/build e o E2E afetado passaram novamente. Capturas de fixtures desktop/mobile inspecionadas; não publicadas. O lint detectou inicialmente setState no corpo do effect; corrigido movendo a transição para o evento do botão. Nenhum teste foi realizado com dados reais.

Não executados: cadastro de pasta geral apenas por nome e ACL geral (aguardam escolha), migração/fluxo autenticado de produção. A versão local não deve ser anunciada como entrega integral nem publicada automaticamente.

## Atualização local — 2026-11-10

Decisão recebida: novos arquivos gerais podem ser consultados, criados, baixados, enviados à lixeira e restaurados por membros autenticados que já tenham acesso ativo ao projeto. Não equivale a todos os usuários da organização, nem acesso público. Mantém-se a checagem central de sessão/membership/grant: projeto sem acesso, organização diferente e revogação continuam negados. Owner/admin mantém a autoridade existente. Projetos arquivados são somente leitura.

Implementado localmente: novas pastas exigem apenas nome (UUID é técnico/idempotência), com scope=project e area=NULL explícitos. Não há módulo fictício nem associação escondida. Membro limitado a uma área pode operar os novos arquivos gerais. Os registros anteriores permanecem scope=area, com área, bytes, metadados e permissões originais; UI identifica “Acesso legado restrito”. Não há conversão automática do arquivo real nem movimento de legado para geral.

Migração candidata 007_library_project_scope.sql, posterior à 006: adiciona scope, permite área nula somente para escopo project e impõe FK composta para a pasta do mesmo projeto/organização/escopo. A FK original continua protegendo o vínculo de área legado. Defaults permanecem area para compatibilidade de escritas de clientes antigos; o código novo grava project explicitamente. O teste local aplica 005 a fixtures, depois 006/007, compara todos os campos/bytes anteriores e verifica rejeição de vínculo entre escopos.

A escolha de ACL não autoriza publicação nesta etapa. Houve negativa da delegação de ações remotas; nenhuma tentativa remota foi feita neste turno. 006/007 estão somente no checkout e bancos locais de teste. A aprovação da 005 não é reutilizada para executar estas migrações.

## Plano de proteção e publicação — pendente

1. Reconciliar versões, estrutura, contagens e acervo atual antes da execução; a leitura anterior de uma pasta/um upload não é garantia do estado futuro.
2. Confirmar cópia privada recente de boss_private, incluindo o upload real, e restaurá-la em instância isolada. Validar dados, bytes, metadados, RLS, ACLs e dependências sem divulgar conteúdo. O backup anterior ao upload não satisfaz essa condição. Não exportar material para Git/artefatos públicos.
3. Apresentar ao usuário os dois efeitos: lixeira recuperável com quota mantida e acesso geral de novos arquivos pelos membros existentes do projeto. Pedir autorização explícita, atual, para migrações 006/007 e publicação após proteção comprovada; avisar risco de bloqueio breve e indisponibilidade.
4. Após autorização aplicável, executar pelo runner transacional (search_path boss_private, advisory lock e histórico), validar preservação, depois publicar somente o código testado. Não mudar senhas, roles, grants de conta ou infraestrutura.
5. Em falha, reconciliar antes de repetir. Preservar colunas/dados; preferir correção de código. Não reverter para versão que ignora deleted_at ou scope: poderia revelar removidos ou perder suporte aos arquivos gerais. Não restaurar produção automaticamente, pois perderia escritas posteriores.

Confirmação proposta: “Autoriza aplicar as migrações 006 e 007 e publicar o gerenciador com arquivos gerais para membros do projeto e lixeira recuperável, após confirmar uma cópia atualizada e restaurada que inclua o arquivo recente? Os arquivos antigos manterão o acesso restrito atual e pode haver breve indisponibilidade.”

## Aprovação posterior — conversão do acervo existente

A instrução posterior do coordenador inclui nova aprovação explícita do usuário para backup atualizado, migração, acesso geral **inclusive ao arquivo existente** e publicação. Ela substitui a proposta de manter restrito o acervo atual e elimina a pendência de escolher ACL. A execução remota continua condicionada à proteção atualizada comprovada; não foi tentada neste turno.

A candidata 007 agora preserva a área antiga em `legacy_area` e converte pastas/arquivos existentes para `scope=project, area=NULL`. Nenhum byte, URL, nome, criador ou timestamp de arquivo é reescrito. A área histórica não autoriza acesso. O teste de migração compara integralmente a linha anterior com a posterior, admitindo somente os campos novos e a mudança explícita de escopo/área. Mantém-se suporte defensivo a registros area produzidos por versão antiga durante a transição, sem convertê-los silenciosamente depois.

**Gate atual, não outra solicitação de consentimento:** o coordenador precisa confirmar novo dump privado de boss_private, obtido pelo procedimento já autorizado e restaurado em instância isolada. Incluir library_folders/library_files e uploads recentes. Retornar apenas timestamp, integridade do arquivo e resultados agregados de restauração/contagens/bytes/RLS/ACL, nunca dump ou senha. O executor não possui conexão de operador para produzir essa cópia por conta própria. Nenhuma migração será executada usando o backup anterior ao upload. Se a revisão rejeitar uma futura operação, parar e relatar sem rota alternativa.

## Incremento solicitado em 10/11 — lista e miniaturas (local)

Resultados em linhas compactas, preservando os cards de categorias e seleção de pastas. Cada linha informa tipo do upload pelo MIME validado, nome, tamanho e atualização; não repete categoria nem pasta. Download é seta com nome acessível, tooltip e alvo de 44px. Excluir/restaurar continuam com confirmação, sem exclusão externa. Links mostram “Link”, mesmo que o endereço termine em .pdf: não se busca conteúdo externo para adivinhar formato. DOC/DOCX/XLS/XLSX não são novos formatos de upload; continuam disponíveis por link, sem promessa de detecção do conteúdo remoto.

Miniaturas somente de imagens raster privadas já autorizadas para download: carregamento quando visíveis, requisição autenticada sem cache, limite existente de 2 MiB, bitmap de saída 64 × 64, primeiro frame, fechamento do bitmap e cancelamento ao sair da tela/desmontar. Ao ocultar a aba, o desenho é apagado; ao voltar, uma nova requisição verifica acesso. Nenhuma object URL, iframe ou serviço terceiro é usado. Falha de acesso/decodificação mantém ícone; miniatura não substitui autorização no servidor. PDFs usam ícone PDF nesta etapa: renderizador de páginas não foi introduzido. Vídeos/links/documentos não raster usam ícones. Nada disso exige outra migração além das candidatas 006/007.

## Verificação final local deste incremento

Aprovados: lint, TypeScript, build; 37 testes unitários/integração em execução sequencial (`tsx --test --test-concurrency=1 tests/*.test.ts`); 3 E2E do gerenciador, com desktop 1440px/mobile 390px, pasta somente por nome, upload/link, formatos/tamanho inválidos, repetição/retry, persistência/download byte a byte, miniatura válida e fallback HTTP 403, teclado/tooltip, cancelar/excluir/restaurar e preservação da Biblioteca. Capturas desktop/mobile inspecionadas. Testes de serviço cobrem membro limitado por área, isolamento, revogação, arquivamento e preservação integral dos registros sintéticos nas migrações.

Tentativas anteriores: execução concorrente da suíte falhou com conexão de teste encerrada por comando administrativo; a repetição sequencial passou. O primeiro E2E de miniatura encontrou uma fixture PNG antiga não decodificável (reproduzido isoladamente no Chromium); foi substituída por raster sintético válido gerado no navegador e os três E2E passaram. Nenhum dado real usado.

Não executados: migrações remotas 006/007, push, deploy ou teste autenticado em produção. Não houve nova negativa nem operação remota de resultado incerto neste turno. A aprovação do usuário já existe; falta o coordenador confirmar backup privado atualizado com restauração validada, incluindo o upload recente, antes da execução remota.
