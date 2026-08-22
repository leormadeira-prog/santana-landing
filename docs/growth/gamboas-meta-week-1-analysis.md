# Ed. Gamboas — análise da primeira semana no Meta Ads

Período analisado: **16 a 22 de agosto de 2026**. Fonte: `Relatório-sem-título (2).csv`, exportado em 22 de agosto de 2026 às 07:35 (horário de Brasília). O arquivo possui 130 linhas no corte diário por anúncio, idade e gênero.

Esta análise não altera campanhas, orçamentos, públicos ou anúncios. Ela define as mudanças propostas e os critérios que precisam ser confirmados no Gerenciador de Anúncios antes da publicação. A inspeção somente leitura da conta foi concluída em 22 de agosto de 2026.

## Totais reconciliados

| Indicador | Resultado |
| --- | ---: |
| Investimento | R$ 139,37 |
| Leads | 23 |
| CPL | R$ 6,06 |
| Impressões | 5.330 |

Os totais de investimento, leads, CPL e impressões informados na leitura inicial conferem com o CSV.

O alcance único de sete dias **não pode ser calculado** somando a coluna `Alcance` deste arquivo: a mesma pessoa pode aparecer em dias diferentes e em ambos os anúncios. A soma das linhas é 4.043, mas representa alcance acumulado nos recortes, não pessoas únicas da campanha. Pelo mesmo motivo, o arquivo não sustenta uma frequência consolidada de sete dias nem uma conclusão definitiva sobre fadiga.

## Desempenho por anúncio

| Anúncio | Investimento | Participação do gasto | Leads | CPL | Impressões |
| --- | ---: | ---: | ---: | ---: | ---: |
| `GAMBOAS \| FACHADA \| OFERTA 295K` | R$ 127,59 | 91,5% | 22 | R$ 5,80 | 5.081 |
| `GAMBOAS \| FACHADA \| OFERTA 295K — Cópia` | R$ 11,78 | 8,5% | 1 | R$ 11,78 | 249 |

A plataforma já concentrou quase todo o gasto no original. Entretanto, a inspeção somente leitura do Gerenciador mostrou que os dois anúncios **não são idênticos**:

- o original usa imagem, CTA `Saiba mais` e `utm_content=fachada_oferta_295k`;
- a `— Cópia` usa vídeo vertical de 12 segundos, texto diferente, CTA `Ver detalhes` e `utm_content=video_decorado_12s_v1`;
- ambos estão no mesmo conjunto, mas testam mais de uma variável ao mesmo tempo.

Portanto, não se sustenta o diagnóstico de dois duplicados idênticos competindo entre si. O resultado inferior da `— Cópia` é um sinal contra a combinação atual de vídeo, texto e CTA, mas não isola qual elemento causou a diferença. Com apenas R$ 11,78 investidos, 249 impressões e 1 lead, a amostra também é pequena para um veredito definitivo.

Como cenário matemático, e não previsão, realocar os R$ 11,78 do segundo anúncio ao CPL observado do original equivaleria a aproximadamente 2 leads, contra 1 lead efetivamente gerado. Esse contrafactual não prova que a pausa criará o lead adicional.

### Decisão por anúncio

- não pausar com base na premissa de duplicidade técnica;
- se o objetivo operacional for maximizar volume imediato, pausar a `— Cópia` apenas como **decisão de desempenho**, preservando o original como controle;
- se o objetivo for aprender se o vídeo vertical funciona, criar um teste limpo com a mesma oferta, texto, CTA e destino, alterando somente a mídia;
- renomear variações futuras pelo formato e pela hipótese, em vez de `Cópia`.

## Idade e gênero

| Idade | Investimento | Leads | CPL | Leitura |
| --- | ---: | ---: | ---: | --- |
| 18–24 | R$ 9,56 | 1 | R$ 9,56 | Sinal fraco; não excluir com apenas 1 lead |
| 25–34 | R$ 40,74 | 7 | R$ 5,82 | Faixa consistente para sugestão de audiência |
| 35–44 | R$ 38,42 | 5 | R$ 7,68 | Volume útil, CPL acima da média |
| 45–54 | R$ 31,17 | 7 | R$ 4,45 | Melhor combinação de volume e eficiência |
| 55–64 | R$ 11,27 | 1 | R$ 11,27 | Sinal fraco; monitorar sem corte imediato |
| 65+ | R$ 8,20 | 2 | R$ 4,10 | Eficiente, mas com amostra muito pequena |

O destaque `mulheres 45–54` confere: 6 leads, R$ 21,28 investidos e CPL de R$ 3,55. Isso é um sinal de mensagem/audiência para novos criativos, não evidência suficiente para restringir o gênero. No total, mulheres tiveram CPL de R$ 6,18 e homens de R$ 5,75; o gênero deve continuar aberto.

### Decisão de audiência

- manter idade e gênero amplos como controles, sem criar conjuntos separados por faixa;
- não tentar aplicar corte rígido de idade ou gênero nesta campanha: o Gerenciador a classifica na categoria especial **Moradia**;
- se uma configuração elegível de Advantage+ oferecer sugestões de público, usar os sinais vencedores para mensagem e priorização, não como restrição discriminatória;
- não excluir 65+, pois o próprio CSV mostra CPL de R$ 4,10 nessa faixa;
- reavaliar idade somente depois de mais volume e, principalmente, de conectar o resultado comercial: contato válido, qualificação, visita e proposta.

A Meta informa que sugestões de audiência podem orientar a entrega sem impedir expansão e recomenda controles rígidos apenas para restrições reais do negócio: <https://www.facebook.com/business/ads/meta-advantage-plus/audience>.

## O dia 22 de agosto

O arquivo foi criado às **07:35 de 22/08**. Os R$ 1,72, 75 impressões e 0 leads desse dia representam uma manhã parcial, não evidência de queda de entrega, rejeição ou esgotamento de orçamento.

Não há ação corretiva baseada nesse recorte. A verificação de anomalia só deve ocorrer com o dia fechado e com as colunas de status, orçamento e entrega do Gerenciador.

## Plano de criativos da semana 2

Com o investimento observado, manter muitos anúncios simultâneos reduziria a leitura de cada variação. A recomendação é manter o original como controle e testar **um challenger por vez**.

| Papel | Criativo | Variável principal | Regra |
| --- | --- | --- | --- |
| Controle | `FACHADA \| OFERTA 295K \| V01` | Criativo atual | Permanecer ativo |
| Variação existente | `VÍDEO DECORADO 12S \| PRONTO PARA MORAR \| V01` | Vídeo vertical atual | Renomear a `— Cópia`; pausar ou manter conforme o objetivo do teste |
| Challenger 1 | `TOUR DECORADO \| PRONTO PARA MORAR \| V02` | Vídeo vertical com copy e CTA controlados | Publicar somente como teste limpo de uma variável |
| Challenger 2 | `PLANTAS \| CONDIÇÕES \| V01` | Interesse prático em plantas/condições | Entrar depois do primeiro ciclo, não simultaneamente |

Diretrizes:

- não usar depoimento sem um cliente real, autorização de imagem/voz e texto aprovado;
- não usar urgência, escassez ou disponibilidade limitada sem comprovação comercial atual;
- imagens internas devem informar: `Imagens do decorado. Unidades entregues no contrapiso.`;
- preço e entrada devem manter ressalvas de disponibilidade, análise de crédito e condições;
- não usar `2 dormitórios`, metragem ou vagas até confirmar documentalmente a unidade anunciada.

## Colunas obrigatórias no próximo relatório

O preset deve ser exportado nos níveis **campanha, conjunto e anúncio**, contendo pelo menos:

1. IDs e nomes de campanha, conjunto, anúncio e criativo;
2. objetivo, local de conversão, meta de desempenho e status de entrega;
3. orçamento, valor gasto, alcance, impressões, frequência e CPM;
4. cliques no link, cliques de saída, CTR do link e CPC do link;
5. visualizações da página de destino e custo por visualização;
6. abertura de formulário, conclusão, leads e CPL;
7. para vídeo: reproduções de 3 segundos, ThruPlay e percentuais de 25%, 50%, 75%, 95% e 100%;
8. posicionamento, dispositivo, idade e gênero;
9. data e configuração de atribuição.

Métricas derivadas:

- taxa de chegada à landing = visualizações da landing / cliques no link;
- conversão da landing = `generate_lead` / sessões ou visualizações da landing;
- conclusão do formulário Meta = leads / aberturas do formulário;
- custo por lead qualificado = investimento / leads qualificados na planilha;
- taxa de contato válido, visita e proposta por origem.

## Prioridade técnica: reativar a mensuração do site

No conjunto inspecionado, o local da conversão é `Formulários no site e instantâneos`, a meta de desempenho é maximizar conversões e o evento de conversão é `Lead`. O Gerenciador informa que o Pixel selecionado para o site não recebe atividade há mais de sete dias.

Isso significa que o formulário instantâneo pode continuar gerando os resultados registrados, mas o braço `SITE` não está produzindo sinal confiável de otimização e mensuração. Antes de mudar idade, gênero ou adicionar mais variações criativas:

1. publicar a landing instrumentada;
2. validar `PageView`, `ViewContent`, eventos do formulário e `Lead` no Gerenciador de Eventos da Meta;
3. confirmar deduplicação quando houver eventos de navegador e servidor;
4. executar um lead controlado e conciliá-lo com a planilha;
5. só então comparar formulário instantâneo versus site com relatórios separados.

A conta também mostra três objetos não publicados: um novo conjunto `Novo conjunto de anúncios de Reconhecimento` com erro, um novo anúncio `GAMBOAS | VÍDEO DECORADO 12S | FORM | V1` com erro e uma atualização de criativo no anúncio original. Eles precisam ser tratados separadamente antes de qualquer publicação; pausar um anúncio não pode publicar rascunhos alheios por acidente.

## Piloto separado de WhatsApp

O WhatsApp deve ser um **teste paralelo**, não uma alteração do conjunto atual. A Meta permite campanhas de Leads com destino para mensagens/WhatsApp e recomenda teste A/B contra a jornada de controle: <https://www.facebook.com/business/ads/click-to-message-ads>.

Condições para iniciar:

- capacidade de responder em até cinco minutos no horário anunciado;
- mensagem inicial e perguntas de qualificação aprovadas;
- origem marcada separadamente como `meta / paid_social / whatsapp`;
- indicador principal de qualidade definido como **conversa qualificada**, não apenas conversa iniciada;
- campanha, orçamento e nomenclatura separados do formulário instantâneo e da landing.

## Sequência proposta

1. revisar as três alterações não publicadas existentes, sem publicar ou descartá-las;
2. finalizar testes de Pixel/CAPI/GA4 e publicar a landing instrumentada;
3. decidir se a `— Cópia` será pausada por eficiência de curto prazo ou mantida como variação atual de vídeo; ela não é duplicata idêntica;
4. manter o original como controle e a audiência elegível ampla;
5. configurar o preset completo de relatório;
6. publicar somente um challenger e observar um ciclo completo;
7. substituir pelo Challenger 2 ou usar o teste A/B nativo, sem acumular variações sobrepostas;
8. avaliar o piloto de WhatsApp em campanha separada quando atendimento e rastreamento estiverem prontos;
9. decidir por qualidade comercial, não apenas CPL.

## Critérios para a próxima decisão

- pelo menos sete dias completos, sem incluir dia parcial como queda;
- volume suficiente por variação para evitar decisão baseada em 1 ou 2 leads;
- CTR, CPC, visualizações da landing e taxa de conclusão disponíveis;
- leads conciliados com a planilha por origem e ID;
- comparação de contato válido, qualificação, visita e proposta;
- nenhuma mudança simultânea de público, criativo e destino no mesmo teste.
