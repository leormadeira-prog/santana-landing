# GA4: cobertura institucional e Villa

Home, `/regioes/` e `/villa/` usam `assets/js/site-measurement.js` e o fluxo existente `G-NFEM9HPFLR` (15433874918). Não carregar junto dos scripts de medição antigos na mesma página.

- `page_view`: uma vez por carregamento, após consentimento.
- `select_content`: navegação interna, destino e seção; sem query string.
- `click_whatsapp`: clique em link ou intenção após validação do formulário Villa. Não significa mensagem enviada, lead persistido, qualificação ou visita agendada.
- Consentimento compatível com `zn-measurement-consent`, inclusive preferência legada. Recusa não bloqueia atendimento. Rodapé permite revisar a preferência; revogação desativa o GA4 na página.
- Nome, mensagem, URL de WhatsApp e query arbitrária não entram nos eventos. UTMs simples são passadas como atribuição; URL e referrer são enviados sem query/hash.
- A nova medição não carrega fora de `znempreendimentos.com.br`, nem com `utm_source=qa_codex` ou `utm_medium=synthetic_test`. Marcador de teste persiste na sessão. Essa proteção cobre as três páginas novas; scripts antigos de outros imóveis continuam com seu comportamento existente.

## Validação

`node --test tests/site-measurement.test.cjs` testa consentimento desconhecido/recusado/aceito/revogado, armazenamento indisponível, ausência de dados pessoais nos parâmetros, unicidade de page_view e bloqueio de QA/preview. O teste usa uma fila simulada e não envia eventos à Google.

`python3 scripts/validate_site.py` verifica integridade do site. Revisão local de desktop/celular valida banner e navegação sem gerar tráfego de produção.

Após merge, verificar cobertura e recebimento com visita consentida controlada, identificando-a como teste; não enviar formulários reais ou classificar cliques como leads. Dados históricos não são recuperados pela instalação da tag.

## Operação em 14/09/2026

Vínculo Search Console `https://znempreendimentos.com.br/` -> fluxo 15433874918 criado e confirmado na interface. Histórico de conversões preservado. Não foram ativados filtros destrutivos nem removidos eventos antigos.

Próximas etapas independentes: separar QA também nas integrações antigas, reconciliar generate_lead com registros persistidos e CRM, inspecionar indexação atual das páginas comerciais e medir performance. O relatório de indexação consultado na auditoria estava atualizado até 03/09/2026, portanto não serve como prova da situação das páginas novas.
