# Biblioteca — gerenciador de arquivos (implementado localmente, não publicado)

## Diagnóstico e decisão, 2026-11-09

Antes deste incremento, `project_sources` guardava anexos como `bytea` em PostgreSQL no schema privado `boss_private`, e `source_links` guardava usos históricos. Não há bucket de objetos, integração Drive ou hospedagem de arquivos no GitHub. A rota autenticada entrega binários com `private, no-store`, `nosniff`, `Content-Disposition: attachment` e CSP sandbox. Limites anteriores: 2 MiB/anexo, 100 fontes e 50 MiB/anexos por projeto. O cadastro de fontes não cria mais vínculos automaticamente, por decisão anterior.

Incremento: gerenciador abaixo dos documentos da Biblioteca, com pastas planas por projeto, categorias Imagens/Vídeos/Documentos, filtro por pasta/categoria/nome, links HTTPS, uploads pequenos, renomeação/movimentação de arquivos dentro da mesma área. Não acrescenta exclusão, subpastas, upload em lote, versionamento de binários ou sincronização externa. A Biblioteca e os PDFs de planejamento continuam derivados somente de `module_content`; anexos privados não entram automaticamente em exportações.

Reutiliza a entrega privada e validação de bytes existentes. Novos uploads aceitam PNG/JPEG/GIF/WebP ou PDF (documentos Office e demais formatos: links). Vídeos são somente links, inclusive URLs do Drive: nunca copiados, incorporados em iframe, buscados pelo servidor ou compartilhados automaticamente. O usuário precisa ter acesso no serviço de origem. Não há pré-visualização automática nem antivírus: MIME e assinatura inicial são verificados, o que não equivale a uma análise completa de malware. Os anexos são baixados por ação explícita.

## Persistência, acesso e limites

Migração local `005_library_files.sql`, no formato do runner já usado pelo repositório (`scripts/database-setup.ts`), acrescenta `library_folders` e `library_files`. Não altera registros existentes. Este projeto usa migrações SQL próprias; não foi instalada CLI Supabase nem introduzido um segundo histórico de migrações. O runner usa transação/advisory lock, aplica RLS, revoga acesso de PUBLIC/anon/authenticated/service_role e concede acesso somente ao papel servidor existente. Testes locais validam o papel servidor e negações da Data API. Nenhuma configuração do Supabase remoto foi alterada.

Cada pasta tem uma área responsável pelo acesso, escolhida dentre as áreas autorizadas. Seu escopo é imutável. Criação exige `create`, organização exige `edit`, listagem exige `view`, download exige `export`, sempre na área correspondente. A filtragem ocorre no servidor por organização/projeto/área; FK composta impede mover entre projetos ou áreas. Movimentação entre áreas é recusada, evitando ampliação implícita de acesso. Projetos arquivados são somente leitura. A autorização de sessão e membro é reavaliada em cada chamada. Sem URLs públicas ou chaves no cliente.

Limites: 50 pastas e 200 registros no gerenciador por projeto; 2 MiB por upload; 50 MiB de binários compartilhados entre Fontes e gerenciador. A verificação compartilhada ocorre sob o lock de escrita já existente da organização, evitando corrida entre escritores. Repetição de cadastro com o mesmo UUID do usuário não duplica o registro. Requisições com upload têm limite de corpo de 3.000.000 bytes, inclusive ao ler o stream. Não há contagem de espaço de áreas ocultas na resposta de listagem.

## Custos e riscos

Nenhum serviço, plano, credencial ou despesa foi provisionado. Links guardam apenas metadados; os arquivos continuam no provedor de origem. Uploads usam espaço, backups, memória e tráfego do PostgreSQL/Netlify atuais; não são armazenamento ilimitado nem usam a franquia de Supabase Storage.

A página oficial consultada em 2026-11-09 informa no plano Free 500 MB de banco, 1 GB de Storage e 5 GB de egress (https://supabase.com/pricing). Isso é referência de produto, não medição da conta BOSS: não foi consultada a capacidade livre/consumo/plano remoto nesta tarefa. Vários projetos com 50 MiB podem atingir a franquia global. Antes de publicação, conferir capacidade e backup do banco. Para volumes maiores, avaliar bucket privado com autorização separada, mantendo Better Auth e regras de acesso do aplicativo; não criar bucket público. Referência de segurança: https://supabase.com/docs/guides/storage/security/access-control . Changelog consultado: https://supabase.com/changelog.md ; nenhuma atualização de SDK/CLI foi feita.

## Publicação pendente

Sem push, deploy ou migração remota. Para publicar, obter aprovação para aplicar a migração 005 no BOSS e enviar a versão testada. Aplicar a estrutura antes do app: o cálculo compartilhado de quota em Fontes também referencia a tabela nova. Manter os grants privados com o runner/procedimento de migração existente. Confirmar o SHA de produção e testar com acesso autorizado, sem criar dados privados de teste no repositório. Nenhum arquivo privado foi adicionado ao checkout/repositório; fixtures de teste são sintéticas.
