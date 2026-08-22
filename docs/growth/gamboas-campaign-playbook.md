# Ed. Gamboas — playbook de campanha, funil e indicadores

Este documento prepara a operação de `GAMBOAS | LEADS | FORM + SITE | 08-2026`. Ele não autoriza nem executa mudanças no Meta Ads, GA4, GTM, públicos, orçamentos ou dashboards externos.

A leitura reconciliada da primeira semana e o plano corrigido para a semana 2 estão em [`gamboas-meta-week-1-analysis.md`](gamboas-meta-week-1-analysis.md). As decisões principais são: tratar 22/08 como dia parcial, manter a audiência elegível ampla, não aplicar corte rígido de idade ou gênero, tratar o segundo anúncio como uma variação real de vídeo (não como duplicata idêntica), reativar a mensuração do site e testar apenas um challenger por vez.

## Contrato de eventos da landing

Todos os eventos abaixo dependem de consentimento de medição. Nenhum evento recebe nome, WhatsApp ou outra informação pessoal.

| Evento | Momento exato | Destino e parâmetros | Componente | Teste e controle de duplicidade |
| --- | --- | --- | --- | --- |
| `page_view` | Uma vez, quando a medição é ativada depois do aceite | GA4; Meta `PageView`. `property_id`, nome do conteúdo, URL limpa e título | `gamboas/app.js` | GA4 DebugView e Meta Test Events. O `send_page_view` automático está desativado e existe uma trava em memória |
| `view_item` | Logo após o `page_view`, na visualização do empreendimento | GA4; Meta `ViewContent`. `property_id`, `content_ids`, nome, tipo, valor inicial e moeda | `gamboas/app.js` | Uma ativação por carregamento; comparar a contagem com `page_view` |
| `form_start` | Primeira entrada real de foco no formulário | GA4; Meta custom `FormStart`. `property_id` e método | `gamboas/app.js` | Uma trava por carregamento evita novo disparo ao trocar de campo |
| `click_cta` | Clique em CTA com identificador de atribuição | GA4; Meta custom `ClickCTA`. `property_id`, `cta_id` e URL sem parâmetros não permitidos | `gamboas/app.js` | Conferir cada `cta_id`; cliques repetidos são interações distintas, não conversões |
| `view_plants` | Primeira vez em que 45% da seção de plantas entra na tela | GA4; Meta custom `ViewPlants`. `property_id` e método | `gamboas/app.js` | `IntersectionObserver` desconecta depois do primeiro disparo |
| `generate_lead` | Somente após o endpoint responder `ok`, `stored`, `growth-v2` e devolver o mesmo ID | GA4; Meta `Lead` no Pixel; Meta `Lead` na CAPI. `property_id`, valor, moeda e `event_id` | `gamboas/app.js` + `Code.gs` | Teste controlado na planilha, GA4 e Meta. Pixel e CAPI compartilham o UUID; uma tentativa repetida reutiliza esse UUID e o servidor não duplica a linha |
| `click_whatsapp` | Clique no WhatsApp da página de confirmação | GA4; Meta `Contact`. `property_id`, conteúdo e método | `gamboas/obrigado/index.html` | Conferir depois de um lead controlado. Cada clique é uma nova interação, sem CAPI |

O servidor grava a linha completa antes de chamar a CAPI. O navegador não recebe uma confirmação de conversão baseada apenas no clique ou na tentativa de envio.

## Decisão de qualificação do formulário

Nome e WhatsApp são os únicos campos obrigatórios. Prazo de compra e valor para entrada aparecem na segunda etapa como opcionais. Faixa de renda, forma de compra e agendamento foram retirados da captura inicial porque aumentavam o esforço antes de existir evidência de que o ganho de qualificação compensava a perda de conversão. Essas informações podem ser obtidas no atendimento e só devem voltar ao formulário depois de comparar taxa de conclusão e qualidade comercial.

## Teste justo: formulário Meta versus landing

### Jornada A — formulário instantâneo

- campanha: `GAMBOAS | LEADS | META_FORM | 08-2026`;
- objetivo Leads e formulário de maior intenção;
- rastreamento interno marcado como `meta / paid_social` e ID `meta-...`;
- perguntas de qualificação curtas, revisadas antes de publicar;
- tela final com próximo passo para WhatsApp ou landing.

### Jornada B — conversão no site

- campanha: `GAMBOAS | LEADS | SITE | 08-2026`;
- destino canônico `/gamboas/`;
- otimização para `generate_lead` somente depois de o evento estar validado;
- UTMs obrigatórias e diferentes por criativo;
- não incluir formulário instantâneo no mesmo conjunto.

Para comparar, mantenha simultaneamente o mesmo público elegível, período, posicionamentos, criativo, gancho e distribuição de verba. Altere apenas o destino. Avalie não só CPL, mas contato válido, qualificação, tempo de resposta, visita e proposta. Não declare vencedor com poucos eventos; aguarde volume suficiente para que diferenças de qualidade comercial não sejam explicadas por casos isolados.

## Nomenclatura e UTMs

- campanha: `GAMBOAS | LEADS | [META_FORM|SITE] | 08-2026`;
- conjunto: `GAMBOAS | [PUBLICO] | [REGIAO] | [IDADE]`;
- anúncio: `GAMBOAS | [LINHA] | [GANCHO] | [V01]`;
- criativo: `gamboas_[linha]_[formato]_[duracao-ou-variacao]_v01`;
- `utm_source=meta`;
- `utm_medium=paid_social`;
- `utm_campaign=gamboas_leads_08_2026`;
- `utm_content=[identificador_do_criativo]`;
- `utm_term=[identificador_do_publico]`.

Exemplos de `utm_content`: `fachada_oferta_295k_v1`, `video_decorado_12s_v1`, `carrossel_plantas_v1` e `localizacao_v1`. Nunca usar nome, telefone, e-mail, renda ou outro dado pessoal em nomes ou UTMs.

## Linhas criativas

| Linha | Material e mensagem | Hipótese principal |
| --- | --- | --- |
| Fachada e oferta | Fachada, pronto para morar, preço inicial e condição de entrada com ressalva de crédito | Oferta objetiva amplia a intenção de clique |
| Tour do decorado | Vídeo 9:16, 1080 × 1920, 12 s, trilha discreta e CTA para plantas/condições | Visualização interna aumenta consideração |
| Plantas e condições | Planta e CTA direto para receber materiais | Intenção prática gera lead mais qualificado |
| Localização | Zona Norte, Vila Mazzei e acesso à estrutura da região, sem inventar distâncias | Relevância geográfica melhora a qualidade |

Todo material interno deve exibir: `Imagens do decorado. Unidades entregues no contrapiso.` A landing mantém o aviso completo e juridicamente mais informativo.

Ganchos para testes de uma variável por vez:

1. `Apartamento pronto na Zona Norte a partir de R$ 295 mil.`
2. `Seu apartamento próprio pode começar com entrada a partir de R$ 60 mil.`
3. `Conheça por dentro o Ed. Gamboas.`
4. `Imóvel novo e pronto para morar na Zona Norte.`

Mantenha imagem, público, destino, CTA e verba constantes ao testar apenas o gancho. Preço e entrada devem continuar acompanhados das condições aplicáveis e da análise de crédito.

## Remarketing preparado, não criado

| Público | Sinal disponível | Regra recomendada |
| --- | --- | --- |
| Visitantes da landing | `PageView`/`ViewContent` consentidos | Incluir visitantes e excluir `Lead` |
| Iniciou e não concluiu | `FormStart` sem `Lead` | Janela curta, frequência controlada e mensagem de retomada |
| Assistiu a 50% ou mais | Engajamento nativo de vídeo no Meta | Separar por linha criativa para preservar a leitura do interesse |
| Engajou com Instagram | Engajamento da conta no Meta | Excluir convertidos quando o volume e a correspondência permitirem |
| Abriu e não enviou o formulário Meta | Engajamento do formulário instantâneo | Usar apenas se a opção estiver disponível na conta |

Os públicos do site dependem do consentimento e somente podem ser criados depois de validar os eventos em produção. Nenhum público foi criado por esta implementação.

## Funil comercial na estrutura existente

A aba existente já recebe data, nome, WhatsApp, origem, campanha, conjunto/anúncio via UTMs e Meta, qualificação, visita, comparecimento, proposta, venda e observações. Até aprovar uma mudança estrutural, o motivo de perda deve ser registrado em `Observações` com o prefixo `Motivo de perda:` e um vocabulário controlado. Uma coluna dedicada pode ser adicionada em evolução posterior sem substituir o CRM ou a planilha atuais.

Cadência recomendada:

1. primeira tentativa em até 5 minutos;
2. segunda tentativa no mesmo dia;
3. pelo menos cinco tentativas em dias e horários diferentes;
4. alternar WhatsApp e ligação conforme a preferência da pessoa;
5. registrar cada contato e seu resultado.

Mensagem inicial sugerida:

> Olá, [nome]. Você pediu informações sobre o Ed. Gamboas, empreendimento pronto para morar na Zona Norte. Posso enviar as plantas e as condições disponíveis por aqui?

O uso do nome acontece apenas no atendimento individual; ele não entra em analytics, eventos ou URLs.

## Dashboard proposto

| Camada | Indicadores | Fonte primária |
| --- | --- | --- |
| Mídia | investimento, alcance, impressões, frequência, CPM, CTR de link, CPC, leads Meta, leads site e CPL | Meta Ads, separado por jornada |
| Landing | sessões, sessões engajadas, tempo de engajamento, `form_start`, `generate_lead`, taxa de conversão, `click_whatsapp`, origem e campanha | GA4 + registro de leads |
| Comercial | leads válidos, qualificados, tempo de resposta, visitas, comparecimentos, propostas, vendas e custos por etapa | Planilha operacional |

Definições mínimas:

- conversão da landing = `generate_lead / sessões da landing`;
- conclusão do formulário = `generate_lead / form_start`;
- CPL por jornada = investimento da jornada / leads confirmados daquela jornada;
- custo por lead qualificado = investimento / leads marcados como qualificados;
- tempo de resposta = primeiro contato menos data do lead;
- taxas comerciais usam o ID do evento como chave de deduplicação.

Referências iniciais, não garantias: CTR de link acima de 2%, CPC próximo ou inferior a R$ 1,50, conversão da landing a partir de 5%, primeiro atendimento em até 5 minutos e contatos válidos acima de 80%. Recalibrar depois de acumular volume comparável por jornada.

## Verificações externas pendentes de autorização

1. publicar primeiro o Apps Script `growth-v2`, executar `setup()` e testar a resposta `/exec`;
2. enviar leads controlados com medição aceita e recusada;
3. conferir navegador/servidor e deduplicação no Meta Test Events;
4. conferir `page_view`, `form_start`, `generate_lead` e `click_whatsapp` no GA4 DebugView;
5. criar a dimensão personalizada `property_id` e marcar `generate_lead` como evento principal, se ainda não estiverem configurados;
6. somente depois publicar a landing, criar públicos e iniciar o teste A/B operacional.
