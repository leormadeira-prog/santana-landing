# Growth Engine — auditoria multiempreendimento

O Gamboas é o piloto, não a infraestrutura. Esta auditoria registra a menor arquitetura necessária para aceitar um segundo empreendimento sem antecipar um gerador completo de páginas.

## Estado atual

1. **O que permanece específico do Gamboas:** conteúdo comercial, SEO, imagens, mapa, layout da pasta `gamboas/`, nome da aba piloto e uma entrada no `PROPERTY_CONFIGS` do Apps Script.
2. **O que já é reutilizável:** consentimento de medição, eventos, UTMs, `fbclid`, atribuição, CAPI, colunas operacionais, validação do domínio e infraestrutura de deploy.
3. **O que deverá virar componente:** hero, galeria, características, plantas, localização, formulário, CTA mobile e página de obrigado, quando o segundo caso real revelar as variações necessárias.
4. **O que já virou configuração:** `property_id`, slug, caminho, nome, preço inicial, moeda e identificadores dos CTAs.
5. **O que deverá virar dados:** descrição, características, galeria, plantas, coordenadas, metadata e configuração comercial de cada novo empreendimento.
6. **Como adicionar o segundo empreendimento hoje:** cadastrar a propriedade em `site.config.json` e `PROPERTY_CONFIGS`, criar sua pasta com conteúdo e imagens, declarar os atributos `data-property-*` e executar o validador.
7. **Arquivos estimados:** antes desta fundação seriam aproximadamente 8–12 alterações com lógica duplicada; o próximo piloto ainda exigirá arquivos de página e conteúdo, mas não um novo contrato de tracking ou uma segunda integração CAPI.
8. **Tracking já multiempreendimento:** `page_view`, `view_item`, `form_start`, `click_cta`, `view_plants`, `click_whatsapp`, `generate_lead` e o `schedule_visit` legado carregam `property_id`; a planilha e a CAPI usam o mesmo identificador.
9. **O que ainda não é multiempreendimento:** o HTML/CSS da landing, a página de obrigado e parte do conteúdo da integração continuam materializados para o piloto.
10. **Menor próxima evolução:** usar o segundo empreendimento para extrair um template compartilhado somente depois de comparar suas diferenças reais com o Gamboas.

O Apps Script aceita temporariamente páginas antigas sem `property_id` e infere o identificador pelo caminho cadastrado. Essa compatibilidade existe apenas para permitir implantação sem interrupção; toda landing criada a partir desta fundação deve enviar o campo explicitamente.

## Regra de evolução

Não criar condicionais como `if property === "gamboas"` em código compartilhado. Informações comerciais pertencem aos dados da propriedade; regras de consentimento, mensuração, atribuição e validação pertencem à infraestrutura.

O caminho `/gamboas/` permanece canônico. A arquitetura lógica multiempreendimento não exige migração de URL.
