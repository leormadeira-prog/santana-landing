# Atendimento pelo WhatsApp Business sem WABA

## Escopo

Esta jornada usa o aplicativo WhatsApp Business, sem Cloud API, modelos da WABA, chatbot da Redrive ou automação do WhatsApp Web. Pixel, CAPI e GA4 continuam somente para mensuração da landing, respeitando a escolha de consentimento. Nenhum dado pessoal deve ser enviado a analytics ou incluído em parâmetros de campanha.

Jornada operacional:

1. o anúncio leva para a landing da unidade;
2. a landing grava o lead e a atribuição na planilha;
3. a confirmação oferece o WhatsApp comercial como próximo passo opcional;
4. Michelle atende pelo aplicativo com respostas rápidas;
5. cada tentativa e seu resultado ficam registrados na planilha.

O destino recomendado da campanha é `https://znempreendimentos.com.br/gamboas/unidade-39m.html`. O WhatsApp comercial usado pelos links do site é o número terminado em **1721**.

## Etiquetas ou listas

Criar no WhatsApp Business:

1. `Gamboas | Novo lead`
2. `Gamboas | Contato iniciado`
3. `Gamboas | Aguardando resposta`
4. `Gamboas | Qualificado`
5. `Gamboas | Visita solicitada`
6. `Gamboas | Visita agendada`
7. `Gamboas | Sem interesse`
8. `Gamboas | Não contatar`

Um contato que pedir interrupção deve receber imediatamente `Gamboas | Não contatar` e não pode entrar em novas tentativas ou listas.

## Respostas rápidas

As respostas abaixo devem ser salvas no aplicativo. Antes de enviar, substituir `[nome]` e conferir se a mensagem faz sentido no contexto da conversa.

### `/inicio`

> Olá, [nome]. Aqui é a Michelle, da ZN Empreendimentos. Você pediu informações sobre o Ed. Gamboas. Posso enviar as plantas e as condições disponíveis por aqui?

### `/tempo`

> Para eu orientar melhor: em quanto tempo você pretende comprar?
> 1. Imediatamente
> 2. Até 3 meses
> 3. De 3 a 6 meses
> 4. Apenas pesquisando

### `/compra`

> Como pretende comprar?
> 1. Financiamento bancário
> 2. Entrada + financiamento
> 3. Recursos próprios
> 4. Ainda preciso avaliar

### `/entrada`

> Possui valor para entrada?
> 1. Até R$ 30 mil
> 2. De R$ 30 mil a R$ 60 mil
> 3. Acima de R$ 60 mil
> 4. Ainda não possuo

### `/visita`

> Gostaria de agendar uma visita?
> 1. Sim, nesta semana
> 2. Sim, nas próximas semanas
> 3. Primeiro quero receber informações

### `/retorno`

> Olá, [nome]. Passando para confirmar se conseguiu ver as informações do Ed. Gamboas. Quer que eu esclareça alguma dúvida ou separe um horário para visita?

### `/encerrar`

> Tudo bem. Vou encerrar os contatos por aqui. Se quiser retomar no futuro, é só nos chamar neste WhatsApp.

## Cadência manual

Reduzir de oito para no máximo cinco tentativas, sempre respeitando pedido de interrupção:

| Tentativa | Momento | Ação |
| --- | --- | --- |
| T1 | até 5 minutos no horário de atendimento | WhatsApp com `/inicio` |
| T2 | depois de 3 a 4 horas | WhatsApp curto ou ligação |
| T3 | dia seguinte, em outro horário | WhatsApp com pergunta objetiva |
| T4 | 3 dias depois | ligação ou WhatsApp |
| T5 | 7 dias depois | última tentativa e encerramento respeitoso |

Não enviar as cinco mensagens em sequência automática. Cada tentativa depende do histórico do contato e da ausência de pedido de interrupção.

## Registro na planilha

Usar os campos existentes:

- `Status`: Novo, Contato iniciado, Aguardando resposta, Qualificado, Visita solicitada, Visita agendada, Sem interesse ou Não contatar;
- `Data do primeiro contato`: preencher em T1;
- `Qualificado?` e `Visita confirmada?`: atualizar quando houver resposta;
- `Observações`: registrar cada tentativa no padrão `T1 | data e hora | WhatsApp | resultado`.

O lead não deve ser copiado para sistemas paralelos sem necessidade. A planilha continua sendo a fonte operacional enquanto a integração da Redrive estiver fora da jornada.

## Remarketing

Priorizar anúncios para visitantes e pessoas que interagiram com os ativos da ZN, levando novamente à landing. Lista de transmissão do WhatsApp Business só deve ser usada com consentimento e sabendo que a entrega depende de a pessoa ter salvo o número comercial. Não usar extensões, robôs de navegador ou APIs não oficiais para disparos.

