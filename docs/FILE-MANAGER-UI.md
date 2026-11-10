# Ajustes do gerenciador — 10/11/2026

## Estado

Incremento local posterior ao commit 6325862. Não requer migração nem mudança de dados/ACL. A publicação anterior enviou 6325862 após aplicar 006/007 e validar preservação do acervo; produção não foi confirmada por este executor. O usuário posteriormente à condição inicial determinou publicar primeiro e atualizar backup depois: backup atualizado continua pendente, não presumido existente.

## Implementação

- Aviso da lixeira mantém somente a orientação de restauração; título é Lixeira com ícone decorativo. Não altera quota, soft delete, arquivos externos nem permissões.
- Tamanhos em MB decimal, pt-BR, formatação centralizada. Limites preservados: 2.097.152 bytes/upload (aprox. 2,10 MB) e 52.428.800 bytes/projeto (aprox. 52,43 MB). Valores aproximados são identificados e ajuda/erros de limite incluem bytes exatos. Gerenciador, Fontes, listagem e erros HTTP usam o mesmo utilitário. Sem MiB restante na UI.
- Busca local instantânea por substring do nome, ignorando caixa/acentos. Categoria, pasta e estado ativo/lixeira continuam sendo interseções; dados já chegam autorizados pelo servidor. Limpar busca não expande acesso. Estado sem resultados específico. Campo com 50% no desktop e 100% até 650px.
- Removido somente o breadcrumb do índice da Biblioteca, com redução da margem acima do título; navegação/documentos não mudam.
- Botão Visualizar arquivo com ampulheta solicitada, tooltip/nome acessível e alvo de 44px, junto de download. Dialog nativo mantém foco, Esc e retorno ao acionador. Fetch autenticado/no-store pelo mesmo endpoint privado; limite existente de upload; cancelamento e timeout de 15s, limpeza do bitmap/worker. Imagens PNG/JPEG/GIF/WebP (primeiro frame, até 16 milhões de pixels) e primeira página de PDF em canvas limitado a 1200px. PDF.js 6.5.438 fixado; worker local, sem serviço terceiro, URLs públicas, iframe, camadas de links/anotações, formulários XFA ou ações de documento. Documentos protegidos/complexos podem falhar na prévia e continuam disponíveis pelo download autorizado. Links, Word/Excel e vídeos não ganham preview nem novos formatos de upload.

## Pendências de identificação visual

Os dois prints posteriores sobre botão de voltar e palavra Documentos não puderam ser materializados neste executor: helper Library retornou `library file transfer failed: download failed`. Nenhum pixel foi inspecionado. Aguarda descrição verificada do coordenador para alterar somente os controles corretos; sem adivinhação nem publicação parcial do pacote.

## Verificação local

Conjunto final: lint, TypeScript, 40 testes unitários/integração sequenciais, build e 4 E2E do gerenciador aprovados. Inclui fronteira exata de upload (2.097.152 aceita, +1 rejeita), quota mantida, títulos/ícone/aviso, ausência do breadcrumb, busca sem Enter com acentos/limpeza/lixeira, largura 50%/100%, imagem/PDF válido, PDF primeira página sem links, falha HTTP 403, fechamento durante carregamento, Esc/foco/reabertura, download byte a byte e restauração. Desktop 1440px e mobile 390px. Testes usam exclusivamente bancos/fixtures locais. Captura mobile da lixeira inspecionada. Não executados: os dois ajustes visuais ainda não identificados, nova publicação, teste autenticado em produção. Nenhuma migração nova necessária ou executada.
