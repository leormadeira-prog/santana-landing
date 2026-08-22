# Growth Engine — medição e atribuição

Este documento é a referência operacional da medição do Growth Engine. IDs públicos podem ser versionados; tokens e códigos temporários permanecem apenas nas propriedades privadas do Apps Script.

## Plataformas

- Meta Pixel: `1580854386761765`
- Google Analytics 4: `G-NFEM9HPFLR`
- Conversions API: Apps Script, com token em `META_ACCESS_TOKEN`
- Planilha oficial: aba `Leads Gamboas`

## Multiempreendimento

O contrato obrigatório de identificação é `property_id`. O piloto usa `property_id = gamboas`. Novos empreendimentos devem receber outro identificador estável, sem criar nomes de evento diferentes.

Os dados básicos do Gamboas ficam em `site.config.json` e nos atributos `data-property-*` da landing. O Apps Script possui a configuração equivalente em `PROPERTY_CONFIGS`, que funciona como lista permitida do servidor. Essa pequena duplicação é validada automaticamente e evita introduzir uma etapa de build antes de existir um segundo empreendimento.

## Consentimentos independentes e versionados

1. **Atendimento:** o checkbox do formulário autoriza o uso dos dados para responder ao interesse. Sem ele, o lead não é enviado.
2. **Medição:** o aviso de privacidade pode registrar `accepted`, `rejected` ou `unknown`. Meta Pixel, GA4 e CAPI só são acionados em `accepted`.

Recusar a medição não impede o envio do formulário nem o registro do lead na planilha. A preferência de medição usa `measurement-2026-08-19`; o consentimento de atendimento usa `privacy-2026-08-19`. Estado, versão e data ficam registrados separadamente. O armazenamento do navegador conserva preferência e atribuição, nunca nome ou WhatsApp.

## Taxonomia de eventos

| Ação | Meta | GA4 | Navegador | Servidor | Identificador |
|---|---|---|---|---|---|
| Carregar página | `PageView` | `page_view` | Sim | Não | — |
| Visualizar empreendimento | `ViewContent` | `view_item` | Sim | Não | — |
| Iniciar formulário | `FormStart` | `form_start` | Sim | Não | — |
| Clicar em CTA | `ClickCTA` | `click_cta` | Sim | Não | — |
| Visualizar plantas | `ViewPlants` | `view_plants` | Sim | Não | — |
| Enviar formulário | `Lead` | `generate_lead` | Sim | Sim | UUID do envio |
| Abrir WhatsApp após o envio | `Contact` | `click_whatsapp` | Sim | Não | — |
| Pedir visita em cliente legado | `Schedule` | `schedule_visit` | Sim | Sim | UUID + `-schedule` |

Eventos do navegador dependem da escolha de medição. Todos carregam `property_id`; `Lead` e o `Schedule` legado usam o mesmo `event_id` no navegador e no servidor para deduplicação. `PageView` é explícito e disparado uma única vez depois do aceite. `generate_lead` e `Lead` somente ocorrem quando o endpoint confirma `ok: true`, `stored: true`, `version: growth-v2` e devolve exatamente o ID enviado.

No servidor, a linha completa é persistida antes da chamada à CAPI. Se a CAPI falhar, o lead continua registrado e o status da integração documenta a falha; a plataforma de anúncios nunca recebe o evento antes da planilha.

Para comparar empreendimentos nos relatórios do GA4, registre `property_id` como dimensão personalizada com escopo de evento. Isso é uma configuração administrativa única; não crie um evento novo para cada imóvel.

## Modelo de atribuição

A versão atual é `growth-v2` e usa o primeiro toque conhecido durante a sessão.

- UTMs e `fbclid`: primeiro valor não vazio da sessão;
- primeira página: referência interna anterior, quando existir, ou a própria landing;
- referência inicial: `document.referrer`, inclusive quando externa;
- conteúdo de origem: parâmetro `content_id` ou slug de `/conteudos/<slug>/` no referenciador interno;
- CTA de origem: identificador estável do botão que levou ao formulário;
- última página: URL da landing no momento da conversão.

URLs internas conservam somente `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid` e `content_id`. Fragmentos, credenciais e outros parâmetros são removidos no cliente e novamente no servidor. Referências externas são reduzidas à origem para evitar capturar buscas, e-mails ou outros dados pessoais presentes na URL.

Futuros artigos devem apontar para a landing usando o parâmetro `content_id` com o mesmo slug do conteúdo. Exemplo:

```text
https://znempreendimentos.com.br/gamboas/?content_id=apartamento-pronto-vila-mazzei
```

O Search Console fornece consultas orgânicas de forma agregada. Não se deve prometer a associação de uma palavra-chave exata a uma pessoa; a análise correta combina consulta e página no Search Console, comportamento no GA4 e conteúdo de origem registrado no lead.

## Colunas da planilha

- **A:V:** dados do lead, colunas manuais `Ordem`/`Contato responde`, campanha e resposta da CAPI;
- **W:AD:** operação comercial manual;
- **AE:** `property_id` do empreendimento;
- **AF:AM:** consentimento de medição e atribuição;
- **AN:AQ:** versões e datas dos consentimentos de medição e atendimento;
- **AR em diante:** bloco bruto dos formulários da Meta, preservado pela migração.

## Checklist de produção

1. `META_TEST_EVENT_CODE` ausente das propriedades do Apps Script;
2. endpoint `/exec` respondendo `growth-v2` antes da publicação da landing;
3. lead com medição aceita salvo antes da CAPI e recebido por navegador/servidor;
4. lead com medição recusada salvo sem CAPI;
5. `event_id` igual entre navegador e servidor, inclusive numa tentativa repetida após perda de resposta;
6. `page_view`, `view_item`, `form_start`, `click_cta`, `view_plants`, `generate_lead` e `click_whatsapp` visíveis no GA4;
7. primeira página, referência, conteúdo e CTA preenchidos conforme o percurso;
8. nenhuma credencial, token ou dado pessoal presente no GitHub ou no armazenamento do navegador;
9. `property_id` igual na landing, planilha, GA4 e Meta;
10. dimensão personalizada `property_id` criada no GA4 antes de comparar empreendimentos.
