# Fluxo Codex + GitHub

Este repositório usa um processo simples e seguro para alterações no site.

## Como pedir uma mudança ao Codex

1. Selecione o ambiente `santana-landing`.
2. Use a versão mais recente da branch `main`.
3. Descreva a alteração e peça explicitamente:
   - trabalhar em branch separada;
   - preservar `CNAME`, domínio e WhatsApp;
   - executar `python3 scripts/validate_site.py`;
   - mostrar resumo e diff;
   - criar pull request, sem fazer merge.
4. Abra o pull request e confira a aba **Files changed**.
5. Aguarde o check **Domínio, WhatsApp e arquivos** ficar verde.
6. Teste o preview ou revise as imagens e textos.
7. Faça o merge somente depois da aprovação.

## Prompt-base reutilizável

```text
Trabalhe no repositório leormadeira-prog/santana-landing usando a versão mais recente da main.

Faça a alteração solicitada sem inventar informações comerciais.
Preserve CNAME, domínio, número de WhatsApp, imagens e dados existentes que não façam parte do pedido.
Execute python3 scripts/validate_site.py.
Não altere diretamente a main.
Apresente resumo, arquivos alterados, testes e diff; depois crie um pull request para revisão.
```

## O que a validação automática protege

- `CNAME` e domínio de produção;
- todos os links de WhatsApp;
- valores fictícios críticos;
- imagens e arquivos locais referenciados no HTML;
- avisos para dados ainda pendentes, como CRECI, endereço e telefone visual.

## Próxima evolução recomendada

Conectar o repositório à Vercel para gerar um preview visual de cada pull request antes do merge.
