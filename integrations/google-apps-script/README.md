# Captura de leads dos empreendimentos

Esta integração transforma uma Planilha Google em um endpoint compartilhado para as landings estáticas publicadas no GitHub Pages. O Gamboas é o primeiro empreendimento configurado. A integração grava o lead antes de disparar `Lead` e `Schedule` no navegador e inclui suporte à Conversions API condicionado à escolha de medição do visitante.

## 1. Criar a planilha

1. No Google Drive, crie uma Planilha Google chamada **Leads — Edifício Gamboas**.
2. Abra **Extensões → Apps Script**.
3. Apague o conteúdo inicial de `Code.gs` e cole todo o conteúdo deste repositório em `integrations/google-apps-script/Code.gs`.
4. Salve o projeto com o nome **Captura de leads — Gamboas**.
5. No seletor de funções, escolha `setup` e clique em **Executar**.
6. Autorize o acesso à planilha. A aba **Leads Gamboas** e os cabeçalhos serão criados automaticamente.

O `setup()` preserva as colunas operacionais **U:AB** (`Status`, primeiro contato, qualificação, visita, comparecimento, proposta, venda e observações), grava o **ID do empreendimento em AC**, mantém a atribuição do Growth Engine em **AD:AK** e adiciona em **AL:AN** a relação com a região, o perfil sugerido e o critério automático quando esses campos existirem. Execute `setup()` novamente depois de instalar esta versão para adicionar os novos cabeçalhos sem apagar os leads existentes. Se a versão anterior da atribuição já tiver criado AC:AJ, o próprio `setup()` desloca esses dados uma coluna para a direita antes de inserir o empreendimento.

## 2. Publicar como app da Web

1. Clique em **Implantar → Nova implantação**.
2. Em **Selecionar tipo**, escolha **App da Web**.
3. Em **Executar como**, selecione **Eu**.
4. Em **Quem pode acessar**, selecione **Qualquer pessoa**.
5. Clique em **Implantar** e copie a URL terminada em `/exec`.

A URL `/dev` é somente de teste e exige login; ela não funciona para visitantes da landing.

## 3. Conectar a landing

O endpoint do Gamboas está configurado em `LEAD_API_URL`, dentro de `gamboas/app.js`. Antes de substituir essa URL no futuro, confirme:

1. abrir a URL `/exec` diretamente e receber JSON com `"ok": true`, `"version": "growth-v1"` e as propriedades `gamboas` e `sobrado_isolina`;
2. enviar um lead controlado pela landing;
3. confirmar que a linha apareceu na aba **Leads Gamboas**.

O navegador precisa fazer uma requisição simples para evitar o preflight CORS. Por isso, ao conectar a landing, o corpo será JSON com `Content-Type: text/plain` e o sucesso só será aceito depois de ler a resposta final do Apps Script.

## 4. Ativar a Conversions API

No projeto do Apps Script, abra **Configurações do projeto → Propriedades do script** e crie:

- `META_PIXEL_ID`: `28317074327887665`
- `META_ACCESS_TOKEN`: token gerado pelo Gerenciador de Eventos
- `META_TEST_EVENT_CODE`: código temporário mostrado em **Eventos de teste**; remova esta propriedade depois da validação

O servidor envia `Lead` e, quando a pessoa escolhe uma opção afirmativa de visita, também `Schedule`. Cada evento leva `property_id`, e a configuração `PROPERTY_CONFIGS` valida a URL, o nome, o preço e a moeda do empreendimento. Para adicionar outro imóvel, inclua uma nova entrada nessa configuração; não duplique a integração. O token fica nas propriedades privadas do Apps Script e nunca é exposto no JavaScript da landing ou no GitHub.

Durante a transição, uma landing antiga que ainda não envie `property_id` continua aceita: o servidor infere o empreendimento pelo caminho cadastrado em `PROPERTY_CONFIGS`. Isso permite publicar primeiro o Apps Script e somente depois fazer o merge da landing, sem interromper a captura. Landings novas devem sempre enviar o campo explicitamente.

A CAPI só é acionada quando a pessoa escolhe **Aceitar** no aviso de medição. O consentimento para receber atendimento no formulário continua independente: um lead que recusar a medição será gravado normalmente na planilha, mas as colunas **CAPI enviada** e **Resposta CAPI** registrarão que o evento não foi enviado.

## 5. Validar produção

Antes do merge ou de uma nova campanha:

1. confirme em **Propriedades do script** que `META_TEST_EVENT_CODE` não existe;
2. envie um lead controlado depois de aceitar a medição e confirme `CAPI enviada: Sim`;
3. verifique `Lead` e, se aplicável, `Schedule` como navegador e servidor no Gerenciador de Eventos;
4. envie um segundo lead controlado após recusar a medição e confirme que ele foi salvo, mas a CAPI não foi enviada;
5. confira **AC:AN**: empreendimento, escolha de medição, primeira página, referência, conteúdo, CTA, horário, última página e qualificação, quando aplicável.

O código apenas lê `META_TEST_EVENT_CODE` de forma opcional para testes controlados. Nenhum código `TEST...` deve ficar gravado no repositório ou nas propriedades da implantação de produção.

## Atualizações posteriores

Depois de alterar `Code.gs`, abra **Implantar → Gerenciar implantações**, edite a implantação existente, escolha **Nova versão** e implante novamente. A URL `/exec` permanece a mesma.
