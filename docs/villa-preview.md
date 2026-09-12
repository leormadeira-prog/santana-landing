# Institucional ZN e VILLA — prévia para revisão

## Resultado

A página inicial existente destaca Gamboas e VILLA, mantém Residencial Inglesa e Sobrado Isolina, e acrescenta uma seção de atendimento. A rota /villa/ usa o HTML fornecido como base visual, fotos reais otimizadas e a planta tipo Studio R (página 6 do book fornecido). Gamboas já tem navegação para a institucional e foi preservado.

## Contato e mensuração

O formulário do HTML original simulava sucesso sem transmissão. Nesta versão o visitante preenche nome e interesse e clica em Continuar no WhatsApp para revisar e enviar uma mensagem ao número oficial do site.config.json. Nenhum cadastro é salvo por esse formulário e nenhum evento Lead é disparado. A mensagem identifica o empreendimento villa. Sem JavaScript há um link direto de contato.

A rota VILLA ainda não está registrada em properties do site.config.json porque essa configuração é usada pelo contrato de captura e exige preço e integração. O endpoint atual não foi alterado, nem implantado. Integração com planilha, UTMs persistentes, Meta/GA4 e conversão confirmada para o VILLA são pendências separadas: precisam de implementação e teste de gravação antes de substituir o contato pelo WhatsApp. Não se declara uma abertura do WhatsApp como lead recebido.

## Fontes e pendências comerciais

- Nome, área de 28,52 m² e 16º andar: informações fornecidas pelo usuário.
- Varanda, contrapiso e ar-condicionado: fotografias fornecidas.
- Versace Home e localização na esquina da Ibirapuera com Ministro Gabriel de Rezende Passos e Agami: book do usuário.
- Planta: página 6 (Studio R); corresponde à tipologia, mas a correspondência exata com a unidade deve ser confirmada. O book contém o aviso Material interno de uso exclusivo, mantido na reprodução. Confirmar liberação para uso público antes de publicação.
- Removidas as afirmações de decoração assinada dentro de cada unidade, acabamento completo, pronto para morar/alugar e funcionamento das áreas comuns a qualquer hora.
- Preço de venda não fornecido. Condomínio/IPTU omitidos até confirmar valores e periodicidade; fechadura eletrônica não confirmada pelas fotos.
- Contatos e CRECI reutilizados do site existente. Domínio, CNAME e WhatsApp preservados.

## Validação

Executados o validador obrigatório do repositório, conferência adicional das referências e âncoras das novas páginas e validação sintática/funcional local do formulário. Prévia HTTP local disponível. Layout responsivo definido para desktop e celular; revisão visual no navegador não executada nesta etapa.

## Publicação

Somente prévia local e branch para revisão. Sem publicação, merge ou alterações em serviços externos. O trabalho não inclui a alteração não commitada no Apps Script do checkout original.
