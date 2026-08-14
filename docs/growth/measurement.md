# Growth Engine — medição e atribuição

Este documento é a referência operacional da medição do Growth Engine. IDs públicos podem ser versionados; tokens e códigos temporários permanecem apenas nas propriedades privadas do Apps Script.

## Plataformas

- Meta Pixel: `28317074327887665`
- Google Analytics 4: `G-NFEM9HPFLR`
- Conversions API: Apps Script, com token em `META_ACCESS_TOKEN`
- Planilha oficial: aba `Leads Gamboas`

## Consentimentos independentes

1. **Atendimento:** o checkbox do formulário autoriza o uso dos dados para responder ao interesse. Sem ele, o lead não é enviado.
2. **Medição:** o aviso de privacidade pode registrar `accepted`, `rejected` ou `unknown`. Meta Pixel, GA4 e CAPI só são acionados em `accepted`.

Recusar a medição não impede o envio do formulário nem o registro do lead na planilha.

## Taxonomia de eventos

| Ação | Meta | GA4 | Navegador | Servidor | Identificador |
|---|---|---|---|---|---|
| Visualizar Gamboas | `ViewContent` | `view_item` | Sim | Não | — |
| Enviar formulário | `Lead` | `generate_lead` | Sim | Sim | UUID do envio |
| Pedir visita | `Schedule` | `schedule_visit` | Sim | Sim | UUID + `-schedule` |
| Abrir WhatsApp | `Contact` | `contact` | Sim | Não | — |

Eventos do navegador dependem da escolha de medição. `Lead` e `Schedule` usam o mesmo `event_id` no navegador e no servidor para deduplicação.

## Modelo de atribuição

A versão atual é `growth-v1` e usa o primeiro toque conhecido durante a sessão.

- UTMs e `fbclid`: primeiro valor não vazio da sessão;
- primeira página: referência interna anterior, quando existir, ou a própria landing;
- referência inicial: `document.referrer`, inclusive quando externa;
- conteúdo de origem: parâmetro `content_id` ou slug de `/conteudos/<slug>/` no referenciador interno;
- CTA de origem: identificador estável do botão que levou ao formulário;
- última página: URL da landing no momento da conversão.

Futuros artigos devem apontar para a landing usando o parâmetro `content_id` com o mesmo slug do conteúdo. Exemplo:

```text
https://znempreendimentos.com.br/gamboas/?content_id=apartamento-pronto-vila-mazzei
```

O Search Console fornece consultas orgânicas de forma agregada. Não se deve prometer a associação de uma palavra-chave exata a uma pessoa; a análise correta combina consulta e página no Search Console, comportamento no GA4 e conteúdo de origem registrado no lead.

## Colunas da planilha

- **A:T:** dados do lead, campanha e resposta da CAPI;
- **U:AB:** operação comercial manual;
- **AC:AJ:** consentimento de medição e atribuição `growth-v1`.

## Checklist de produção

1. `META_TEST_EVENT_CODE` ausente das propriedades do Apps Script;
2. lead com medição aceita salvo e recebido por navegador/servidor;
3. lead com medição recusada salvo sem CAPI;
4. `event_id` igual entre navegador e servidor;
5. `generate_lead` e `schedule_visit` visíveis no GA4;
6. primeira página, referência, conteúdo e CTA preenchidos conforme o percurso;
7. nenhuma credencial ou token presente no GitHub.
