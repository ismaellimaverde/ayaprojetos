# Gerenciador: primeiro upload e categorias — 2026-11-09

## Causa reproduzida e limites da investigação

Na versão 0989ca2, um projeto sem pasta tinha o botão de adicionar desabilitado e nenhum seletor de arquivo. Teste E2E sobre uma cópia desse commit reproduziu o bloqueio; após criar pasta manualmente, o upload PNG funcionou. Consulta remota somente de metadados confirmou migração 005 e zero pastas/arquivos/uploads naquele instante. Isso identifica uma barreira real de primeiro uso, mas não prova o resultado HTTP de uma tentativa particular do usuário.

O transporte é JSON/base64 em Route Handler, não multipart nem Server Action. O limite do leitor da API é 3.000.000 bytes, comportando o arquivo de 2 MiB codificado. A documentação Netlify informa payload buffered de 6 MB (https://docs.netlify.com/build/functions/configuration/). Não há evidência de que esse limite tenha causado a reclamação. Testes locais cobrem o transporte próximo de 2 MiB; não equivalem a teste autenticado na Netlify. Acesso direto à produção neste executor tem histórico de proxy 403.

O screenshot Library libfile_e5b8a641a0908191a3adce149c90fc50 foi resolvido como Screenshot 2026-11-09 at 19.31.14.png, mas a materialização pelo helper oficial falhou com download failed. Pixels do anexo não foram inspecionados, nem adicionados ao repositório. A inspeção visual da correção usa capturas locais com fixtures sintéticas.

## Decisão e mudança

Cards clicáveis Documentos, Fotos e Vídeos substituem o seletor de categoria exibida. Pastas existentes continuam clicáveis, com ícone e área de acesso. Instruções em lista, com formatos reais. Não se reutilizam campos para mudar a semântica dos dados.

Adicionar agora fica disponível mesmo sem pasta: orienta a criação da primeira pasta, com nome sugerido da categoria e escolha explícita da área responsável; depois abre o cadastro de arquivo. A pasta é salva por ação explícita antes do arquivo. Cancelar o cadastro do arquivo não remove a pasta já criada. O nome da pasta não define sua categoria: ela pode organizar materiais de tipos diferentes, filtrados pelos cards.

Fotos e documentos abrem em Upload privado; vídeos somente Link HTTPS. Nome do arquivo preenche o nome vazio. Validação local explica arquivo vazio, tamanho e formato, sem substituir verificação de bytes/permissões no servidor. MIME ausente pode ser obtido de extensão permitida, mas o servidor continua verificando a assinatura; não é antivírus nem validação integral do conteúdo. Erros HTTP sem JSON agora resultam em mensagem útil e preservam o formulário para tentar novamente.

Sem novas extensões: PNG/JPEG/GIF/WebP e PDF, até 2 MiB por arquivo. Office e vídeos via links HTTPS; sem cópia do Drive, mudanças de compartilhamento ou ampliação de quotas. Persistência, RBAC, download privado e exclusão de anexos dos documentos exportados permanecem inalterados. Nenhuma migração, configuração ou credencial nova.

## Verificação

Testes E2E cobrem primeiro cadastro, cancelamento aceito/recusado e reabertura, navegação por cards/teclado, seleção/limpeza de arquivo, vazio, acima do limite, formato incompatível, PDF falso rejeitado pelo servidor, erro 503 não JSON com retry, repetição de submit sem duplicação, persistência e download byte a byte, vídeos somente por link, filtros, renomeação/movimentação dentro da mesma área, preservação da Biblioteca e ausência de overflow em 1440/390px. Dados sintéticos em banco local isolado; nenhum upload de teste remoto. Testes de domínio existentes cobrem acesso negado, isolamento, quotas, idempotência e download com permissão de exportação.

Validação final em cópia limpa, sem diagnósticos antigos de login: lint, TypeScript, build, 34 testes unitários/integração e 3 E2E aprovados. Uma regressão intermediária selecionava a pasta recém-criada no fluxo normal e escondia arquivos da pasta anterior; corrigida antes da suíte final. Capturas desktop/mobile de fixtures foram inspecionadas; não entram no repositório.
