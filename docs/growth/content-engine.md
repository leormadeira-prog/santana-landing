# Content Engine da ZN Empreendimentos

## Objetivo

O Content Engine é uma camada editorial independente das páginas de empreendimento. O Gamboas é o primeiro destino comercial relacionado, mas não está embutido na infraestrutura compartilhada.

O fluxo editorial adotado é:

1. responder à intenção de busca;
2. oferecer orientação prática e verificável;
3. contextualizar a região sem inventar dados;
4. apresentar um ou mais empreendimentos relacionados;
5. preservar a origem do conteúdo até o lead.

## Arquitetura

- `content/articles/*.json`: fonte estruturada dos artigos.
- `scripts/build_content.py`: valida os dados e gera as páginas, cards do hub e URLs editoriais do sitemap.
- `conteudos/article.css`: layout editorial compartilhado.
- `conteudos/article.js`: consentimento e medição compartilhados.
- `conteudos/<slug>/index.html`: artefato estático gerado e publicado.

Para criar um artigo, adicione um JSON seguindo o artigo piloto e execute:

```bash
python3 scripts/build_content.py
python3 scripts/build_content.py --check
python3 scripts/validate_site.py
```

Não edite manualmente o HTML de uma página gerada.

## Contrato editorial

Cada artigo declara, no mínimo:

- `slug`, `title`, `metaTitle`, `description` e `excerpt`;
- `publishedAt`, `updatedAt`, `author` e `category`;
- `primaryKeyword`, `secondaryKeywords` e `searchIntent`;
- `heroImage` e `imageAlt`;
- `sections`, `faq`, `relatedContent` e `relatedProperties`;
- `propertyCta` apontando para um ID existente em `site.config.json`.

O gerador produz metadados sociais, canonical, `Article`, `BreadcrumbList`, autoria visível, CTA e navegação estrutural. O hub e o sitemap são atualizados a partir da mesma fonte para evitar duplicação de metadados.

## Medição e atribuição

A medição só é ativada apó a escolha `accepted` na preferência compartilhada `zn-measurement-consent`.

Com consentimento, a camada editorial envia:

- GA4 `page_view` pela configuração padrão;
- GA4 `view_item` para leitura de artigo;
- GA4 `select_content` para clique em CTA;
- Meta `PageView`, `ViewContent` e `ContentCTAClick`.

Ao chegar a uma landing pelo mesmo domínio, o mecanismo `growth-v1` identifica o slug em `/conteudos/<slug>/` como `contentOrigin`. O lead conserva essa origem, o CTA utilizado e o empreendimento escolhido sem criar UTMs internas que sobrescrevam a aquisição real.

## Primeiro cluster

O primeiro cluster é intencionalmente pequeno e cresce um artigo por vez, sempre após revisão editorial, validação técnica e publicação controlada.

| Papel | Tema | Palavra principal | Estado |
| --- | --- | --- | --- |
| Piloto comercial | Apartamento novo na Vila Mazzei: o que avaliar antes de comprar | apartamento novo Vila Mazzei | Implementado |
| Apoio local | Morar no Tucuruvi: o que avaliar na rotina e na localização | morar no Tucuruvi | Implementado |
| Apoio financeiro | Como organizar entrada e financiamento de um apartamento | entrada e financiamento de apartamento | Implementado |
| Apoio de decisão | Apartamento novo ou usado: como comparar o custo total | apartamento novo ou usado | Pauta |

## Regras de qualidade

- Não publicar páginas em massa ou com conteúdo raso.
- Não inventar distâncias, disponibilidade, preços, infraestrutura local ou fatos comerciais.
- Usar dados estruturados apenas quando o conteúdo correspondente estiver visível.
- Manter cada artigo ligado ao tema e somente aos empreendimentos pertinentes.
- Validar metadados, canonical, links, imagens, schema, consentimento, mobile e desktop antes do merge.
