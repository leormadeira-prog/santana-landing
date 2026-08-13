# Captura de leads do Edifício Gamboas

Esta integração transforma uma Planilha Google em um endpoint para a landing estática publicada no GitHub Pages. Ela grava o lead antes de disparar `Lead` e `Schedule` no navegador e já inclui suporte opcional à Conversions API.

## 1. Criar a planilha

1. No Google Drive, crie uma Planilha Google chamada **Leads — Edifício Gamboas**.
2. Abra **Extensões → Apps Script**.
3. Apague o conteúdo inicial de `Code.gs` e cole todo o conteúdo deste repositório em `integrations/google-apps-script/Code.gs`.
4. Salve o projeto com o nome **Captura de leads — Gamboas**.
5. No seletor de funções, escolha `setup` e clique em **Executar**.
6. Autorize o acesso à planilha. A aba **Leads Gamboas** e os cabeçalhos serão criados automaticamente.

## 2. Publicar como app da Web

1. Clique em **Implantar → Nova implantação**.
2. Em **Selecionar tipo**, escolha **App da Web**.
3. Em **Executar como**, selecione **Eu**.
4. Em **Quem pode acessar**, selecione **Qualquer pessoa**.
5. Clique em **Implantar** e copie a URL terminada em `/exec`.

A URL `/dev` é somente de teste e exige login; ela não funciona para visitantes da landing.

## 3. Conectar a landing

O endpoint do Gamboas está configurado em `LEAD_API_URL`, dentro de `gamboas/app.js`. Antes de substituir essa URL no futuro, confirme:

1. abrir a URL `/exec` diretamente e receber JSON com `"ok": true`;
2. enviar um lead controlado pela landing;
3. confirmar que a linha apareceu na aba **Leads Gamboas**.

O navegador precisa fazer uma requisição simples para evitar o preflight CORS. Por isso, ao conectar a landing, o corpo será JSON com `Content-Type: text/plain` e o sucesso só será aceito depois de ler a resposta final do Apps Script.

## 4. Ativar a Conversions API (opcional, depois da captura)

No projeto do Apps Script, abra **Configurações do projeto → Propriedades do script** e crie:

- `META_PIXEL_ID`: `28317074327887665`
- `META_ACCESS_TOKEN`: token gerado pelo Gerenciador de Eventos
- `META_TEST_EVENT_CODE`: código temporário mostrado em **Eventos de teste**; remova esta propriedade depois da validação

O servidor envia `Lead` e, quando a pessoa escolhe uma opção afirmativa de visita, também `Schedule`. O token fica nas propriedades privadas do Apps Script e nunca é exposto no JavaScript da landing ou no GitHub.

## Atualizações posteriores

Depois de alterar `Code.gs`, abra **Implantar → Gerenciar implantações**, edite a implantação existente, escolha **Nova versão** e implante novamente. A URL `/exec` permanece a mesma.
