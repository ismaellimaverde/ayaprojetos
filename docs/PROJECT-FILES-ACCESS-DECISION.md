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
