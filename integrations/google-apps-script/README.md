# Captura de leads dos empreendimentos

Esta integração transforma uma Planilha Google em um endpoint compartilhado para as landings estáticas publicadas no GitHub Pages. O Gamboas é o primeiro empreendimento configurado. A integração persiste a linha completa antes de chamar a Conversions API e a landing somente dispara `Lead` no navegador depois de receber a confirmação dessa persistência.

## 1. Criar a planilha

1. No Google Drive, crie uma Planilha Google chamada **Leads — Edifício Gamboas**.
2. Abra **Extensões → Apps Script**.
3. Apague o conteúdo inicial de `Code.gs` e cole todo o conteúdo deste repositório em `integrations/google-apps-script/Code.gs`.
4. Salve o projeto com o nome **Captura de leads — Gamboas**.
5. No seletor de funções, escolha `setup` e clique em **Executar**.
6. Autorize o acesso à planilha. A aba **Leads Gamboas** e os cabeçalhos serão criados automaticamente.

O `setup()` preserva as colunas operacionais **U:AB** (`Status`, primeiro contato, qualificação, visita, comparecimento, proposta, venda e observações), grava o **ID do empreendimento em AC**, mantém a atribuição em **AD:AK** e acrescenta versões/datas dos consentimentos em **AL:AO**. Execute `setup()` novamente depois de instalar esta versão para adicionar os novos cabeçalhos sem apagar os leads existentes. Se uma versão anterior ainda tiver a atribuição sem `property_id`, o próprio `setup()` desloca os oito campos antigos uma coluna para a direita antes de inserir o empreendimento.

## 2. Publicar como app da Web

1. Clique em **Implantar → Nova implantação**.
2. Em **Selecionar tipo**, escolha **App da Web**.
3. Em **Executar como**, selecione **Eu**.
4. Em **Quem pode acessar**, selecione **Qualquer pessoa**.
5. Clique em **Implantar** e copie a URL terminada em `/exec`.

A URL `/dev` é somente de teste e exige login; ela não funciona para visitantes da landing.

## 3. Conectar a landing

O endpoint do Gamboas está configurado em `LEAD_API_URL`, dentro de `gamboas/app.js`. Antes de substituir essa URL no futuro, confirme:

1. abrir a URL `/exec` diretamente e receber JSON com `"ok": true`, `"version": "growth-v2"` e `"properties": ["gamboas"]`;
2. enviar um lead controlado pela landing;
3. confirmar que a linha apareceu na aba **Leads Gamboas**.

O navegador precisa fazer uma requisição simples para evitar o preflight CORS. Por isso, ao conectar a landing, o corpo será JSON com `Content-Type: text/plain`. O sucesso só é aceito se a resposta final contiver `ok: true`, `stored: true`, `version: growth-v2` e o mesmo `event_id` enviado. Uma tentativa repetida reutiliza o ID pendente, e o servidor responde como duplicata sem criar outra linha.

### Ordem obrigatória de publicação

1. publicar primeiro esta versão do Apps Script;
2. executar `setup()` e conferir a extensão dos cabeçalhos até **AO**;
3. abrir `/exec` e confirmar `growth-v2`;
4. realizar um envio controlado e conferir a linha;
5. somente então publicar a landing `growth-v2`.

Publicar a landing antes do endpoint faria o navegador rejeitar a resposta `growth-v1`; essa trava é intencional para impedir uma conversão sem contrato confirmado.

## 4. Ativar a Conversions API

No projeto do Apps Script, abra **Configurações do projeto → Propriedades do script** e crie:

- `META_PIXEL_ID`: `28317074327887665`
- `META_ACCESS_TOKEN`: token gerado pelo Gerenciador de Eventos
- `META_TEST_EVENT_CODE`: código temporário mostrado em **Eventos de teste**; remova esta propriedade depois da validação

O servidor envia `Lead` e preserva `Schedule` para clientes antigos que ainda enviem uma opção afirmativa de visita. O formulário atual do Gamboas é curto e não solicita agendamento nesta etapa. Cada evento leva `property_id`, e a configuração `PROPERTY_CONFIGS` valida a URL, o nome, o preço e a moeda do empreendimento. Para adicionar outro imóvel, inclua uma nova entrada nessa configuração; não duplique a integração. O token fica nas propriedades privadas do Apps Script e nunca é exposto no JavaScript da landing ou no GitHub.

Durante a transição, uma landing antiga que ainda não envie `property_id` continua aceita: o servidor infere o empreendimento pelo caminho cadastrado em `PROPERTY_CONFIGS`. Isso permite publicar primeiro o Apps Script e somente depois fazer o merge da landing, sem interromper a captura. Landings novas devem sempre enviar o campo explicitamente.

A CAPI só é acionada quando a pessoa escolhe **Aceitar** no aviso de medição e sempre depois de a linha completa ter sido gravada. O consentimento para receber atendimento no formulário continua independente: um lead que recusar a medição será gravado normalmente na planilha, mas as colunas **CAPI enviada** e **Resposta CAPI** registrarão que o evento não foi enviado. Se a chamada à CAPI falhar, a linha do lead permanece salva com o diagnóstico correspondente.

## 5. Validar produção

Antes do merge ou de uma nova campanha:

1. confirme em **Propriedades do script** que `META_TEST_EVENT_CODE` não existe;
2. envie um lead controlado depois de aceitar a medição e confirme `CAPI enviada: Sim`;
3. verifique `Lead` e, se aplicável, `Schedule` como navegador e servidor no Gerenciador de Eventos;
4. envie um segundo lead controlado após recusar a medição e confirme que ele foi salvo, mas a CAPI não foi enviada;
5. confira **AC:AO**: empreendimento, escolha de medição, primeira página, referência, conteúdo, CTA, horário, última página e as versões/datas dos dois consentimentos;
6. repita um `event_id` controlado e confirme que a resposta indica duplicata sem criar uma segunda linha;
7. confirme que URLs registradas não conservam parâmetros fora da lista permitida nem consultas de referçcias externas.

O código apenas lê `META_TEST_EVENT_CODE` de forma opcional para testes controlados. Nenhum código `TEST...` deve ficar gravado no repositório ou nas propriedades da implantação de produção.

## 6. Importar leads do formulário instantâneo da Meta

Esta versão também importa os leads do formulário instantâneo para a mesma aba **Leads Gamboas**. A sincronização roda a cada cinco minutos, marca a origem como `meta / paid_social`, inicia o status operacional como `Novo` e evita duplicidade pelo ID do lead fornecido pela Meta.

Em **Configurações do projeto → Propriedades do script**, crie:

- `META_LEADS_FORM_ID`: ID numérico do formulário **GAMBOAS | HIGH INTENT | 08-2026**;
- `META_LEADS_ACCESS_TOKEN`: token com permissão `leads_retrieval` e acesso à Página que possui o formulário.

Para importar mais de um formulário, use `META_LEADS_FORM_IDS` com os IDs separados por vírgula. Não grave tokens neste repositório, em código da landing ou em capturas de tela.

Depois de salvar as propriedades:

1. execute `setup()` para preservar a planilha atual e registrar seu ID para os gatilhos;
2. execute `setupMetaLeadSync()` uma vez e aceite as permissões solicitadas;
3. execute `getMetaLeadSyncStatus()` e confirme `accessTokenConfigured: true`, o ID do formulário e `triggerCount: 1`;
4. envie um lead controlado pelo formulário da Meta;
5. aguarde até cinco minutos ou execute `syncMetaInstantFormLeads()` manualmente;
6. confirme a nova linha na aba **Leads Gamboas**, com `Status: Novo` e o ID `meta-...` na coluna **ID do evento**.

O diagnóstico nunca devolve o token. Se houver falha, `getMetaLeadSyncStatus()` mostra a data do último sucesso e a última mensagem de erro. Leads instantâneos não são reenviados pela CAPI deste script, pois a conversão já aconteceu dentro da Meta.

## Atualizações posteriores

Depois de alterar `Code.gs`, abra **Implantar → Gerenciar implantações**, edite a implantação existente, escolha **Nova versão** e implante novamente. A URL `/exec` permanece a mesma.
