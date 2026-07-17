# Instruções para Codex e agentes de código

Estas regras valem para todo o repositório.

## Fluxo obrigatório

- Nunca alterar diretamente a branch `main`.
- Trabalhar sempre em uma branch separada e abrir pull request para revisão.
- Não fazer merge automaticamente.
- Antes de concluir, executar `python3 scripts/validate_site.py`.
- No resumo do PR, informar arquivos alterados, testes executados e qualquer suposição.

## Proteções do site

- Preservar o arquivo `CNAME` com exatamente `znempreendimentos.com.br`.
- Preservar o domínio de produção e o HTTPS.
- Todos os links `wa.me` devem usar o número definido em `site.config.json`.
- Nunca deixar números fictícios, placeholders ou textos de teste em links de contato.
- Não inventar preços, metragens, vagas, endereços, CRECI ou características do imóvel.
- Quando um dado não estiver confirmado, manter o texto existente ou sinalizar a pendência no PR.

## Imagens e layout

- Manter imagens do site dentro de `assets/`.
- Usar nomes de arquivo em minúsculas, sem espaços ou acentos.
- Atualizar todos os caminhos no HTML ao mover ou renomear imagens.
- Verificar visualização em desktop e mobile.
- Evitar deformação das imagens; usar `object-fit` e proporções adequadas.
- Não usar `og-image.png` como foto do imóvel; ela é exclusiva para compartilhamento social.

## Qualidade

- Não remover conteúdo comercial existente sem pedido explícito.
- Não modificar `CNAME`, domínio ou número de WhatsApp sem atualizar `site.config.json` e explicar no PR.
- Procurar por links quebrados, arquivos ausentes e valores provisórios antes de finalizar.
