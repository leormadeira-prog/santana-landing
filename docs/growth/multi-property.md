# Growth Engine — auditoria multiempreendimento

O Gamboas é o piloto, não a infraestrutura. O sobrado da Vila Isolina Mazzei é o segundo caso real e confirma a arquitetura multiempreendimento sem exigir um gerador completo de páginas.

## Estado atual

1. **O que permanece específico de cada imóvel:** conteúdo comercial, SEO, imagens, localização, layout da pasta da landing e uma entrada no `PROPERTY_CONFIGS` do Apps Script.
2. **O que já é reutilizável:** consentimento de medição, eventos, UTMs, `fbclid`, atribuição, CAPI, colunas operacionais, validação do domínio e infraestrutura de deploy.
3. **O que o segundo caso revelou:** o contrato de tracking pode ser compartilhado, mas perguntas, opções, intenção de visita e conteúdo visual variam por imóvel e permanecem configurados explicitamente.
4. **O que já virou configuração:** `property_id`, slug, caminho, nome, preço inicial, moeda e identificadores dos CTAs.
5. **O que deverá virar dados:** descrição, características, galeria, plantas, coordenadas, metadata e configuração comercial de cada novo empreendimento.
6. **Como adicionar o segundo empreendimento hoje:** cadastrar a propriedade em `site.config.json` e `PROPERTY_CONFIGS`, criar sua pasta com conteúdo e imagens, declarar os atributos `data-property-*` e executar o validador.
7. **Implementação atual:** `gamboas` e `sobrado_isolina` usam o mesmo endpoint, a mesma taxonomia de eventos e o mesmo consentimento de medição; cada landing mantém HTML, CSS e conteúdo próprios.
8. **Tracking já multiempreendimento:** `view_item`, `form_start`, `contact`, `generate_lead` e `schedule_visit` carregam `property_id`; a planilha e a CAPI usam o mesmo identificador.
9. **O que ainda não é compartilhado:** HTML/CSS, página de obrigado e perguntas comerciais continuam materializados por imóvel para evitar abstrações prematuras.
10. **Menor próxima evolução:** extrair somente utilitários estáveis de formulário e atribuição depois de validar o sobrado em produção.

O Apps Script aceita temporariamente páginas antigas sem `property_id` e infere o identificador pelo caminho cadastrado. Essa compatibilidade existe apenas para permitir implantação sem interrupção; toda landing criada a partir desta fundação deve enviar o campo explicitamente.

## Regra de evolução

Não criar condicionais como `if property === "gamboas"` em código compartilhado. Informações comerciais pertencem aos dados da propriedade; regras de consentimento, mensuração, atribuição e validação pertencem à infraestrutura.

O caminho `/gamboas/` permanece canônico. A arquitetura lógica multiempreendimento não exige migração de URL.
