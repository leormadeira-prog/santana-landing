#!/usr/bin/env python3
"""Gera as páginas editoriais estáticas a partir de dados estruturados."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
ARTICLES_DIR = ROOT / "content" / "articles"
CONTENTS_DIR = ROOT / "conteudos"
HUB_PATH = CONTENTS_DIR / "index.html"
SITEMAP_PATH = ROOT / "sitemap.xml"


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def text(value: object) -> str:
    return html.escape(str(value), quote=False)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_article(article: dict, properties: dict) -> None:
    required = (
        "slug", "title", "metaTitle", "description", "excerpt", "publishedAt",
        "updatedAt", "author", "category", "primaryKeyword", "searchIntent",
        "heroImage", "imageAlt", "intro", "sections", "relatedProperties",
        "propertyCta", "faq",
    )
    missing = [key for key in required if not article.get(key)]
    if missing:
        raise ValueError("Campos obrigatórios ausentes: " + ", ".join(missing))
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", article["slug"]):
        raise ValueError(f"Slug inválido: {article['slug']}")
    for field in ("publishedAt", "updatedAt"):
        date.fromisoformat(article[field])
    if article["searchIntent"] not in {"informational", "commercial investigation", "transactional"}:
        raise ValueError(f"Intenção de busca inválida: {article['searchIntent']}")
    for property_id in article["relatedProperties"]:
        if property_id not in properties:
            raise ValueError(f"Empreendimento relacionado inexistente: {property_id}")
    cta_property = article["propertyCta"].get("propertyId")
    if cta_property not in properties:
        raise ValueError(f"Empreendimento do CTA inexistente: {cta_property}")


def render_blocks(blocks: list[dict]) -> str:
    rendered: list[str] = []
    for block in blocks:
        block_type = block.get("type")
        if block_type == "paragraph":
            rendered.append(f"<p>{text(block['text'])}</p>")
        elif block_type in {"list", "checklist"}:
            class_name = ' class="article-checklist"' if block_type == "checklist" else ""
            items = "".join(f"<li>{text(item)}</li>" for item in block.get("items", []))
            rendered.append(f"<ul{class_name}>{items}</ul>")
        elif block_type == "callout":
            rendered.append(
                '<aside class="article-callout">'
                f"<strong>{text(block['title'])}</strong><p>{text(block['text'])}</p>"
                "</aside>"
            )
        else:
            raise ValueError(f"Tipo de bloco editorial não suportado: {block_type}")
    return "\n".join(rendered)


def render_article(article: dict, config: dict) -> str:
    domain = config["domain"]
    canonical = f"https://{domain}/conteudos/{article['slug']}/"
    property_id = article["propertyCta"]["propertyId"]
    property_data = config["properties"][property_id]
    whatsapp_text = quote(
        f"Olá, li o conteúdo sobre apartamento novo na Vila Mazzei e gostaria de informações sobre {property_data['name']}.",
        safe="",
    )
    section_links = "".join(
        f'<li><a href="#{esc(section["id"])}">{text(section["title"])}</a></li>'
        for section in article["sections"]
    )
    sections = "".join(
        f'<section class="article-section" id="{esc(section["id"])}">'
        f"<h2>{text(section['title'])}</h2>{render_blocks(section['blocks'])}</section>"
        for section in article["sections"]
    )
    intro = "".join(f"<p>{text(paragraph)}</p>" for paragraph in article["intro"])
    faq = "".join(
        f'<details><summary>{text(item["question"])}</summary><p>{text(item["answer"])}</p></details>'
        for item in article["faq"]
    )
    published = date.fromisoformat(article["publishedAt"]).strftime("%d/%m/%Y")
    updated = date.fromisoformat(article["updatedAt"]).strftime("%d/%m/%Y")
    author = article["author"]
    readable_parts = [*article["intro"]]
    for section in article["sections"]:
        readable_parts.append(section["title"])
        for block in section["blocks"]:
            readable_parts.extend([block.get("title", ""), block.get("text", ""), *block.get("items", [])])
    readable_parts.extend(item["question"] + " " + item["answer"] for item in article["faq"])
    reading_minutes = max(1, round(len(" ".join(readable_parts).split()) / 200))
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": canonical + "#article",
                "headline": article["title"],
                "description": article["description"],
                "image": f"https://{domain}{article['heroImage']}",
                "datePublished": article["publishedAt"],
                "dateModified": article["updatedAt"],
                "inLanguage": "pt-BR",
                "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
                "author": {
                    "@type": "Person",
                    "name": author["name"],
                    "jobTitle": author["jobTitle"],
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "ZN Empreendimentos",
                    "url": f"https://{domain}/",
                    "logo": {"@type": "ImageObject", "url": f"https://{domain}/assets/zn-logo-horizontal-onDark.png"},
                },
                "about": article["primaryKeyword"],
                "articleSection": article["category"],
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Início", "item": f"https://{domain}/"},
                    {"@type": "ListItem", "position": 2, "name": "Conteúdos", "item": f"https://{domain}/conteudos/"},
                    {"@type": "ListItem", "position": 3, "name": article["title"], "item": canonical},
                ],
            },
        ],
    }
    schema_json = json.dumps(schema, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{text(article["metaTitle"])}</title>
  <meta name="description" content="{esc(article["description"])}">
  <link rel="canonical" href="{canonical}">
  <link rel="icon" href="../../favicon.ico" sizes="any">
  <link rel="apple-touch-icon" sizes="180x180" href="../../assets/apple-touch-icon.png">
  <meta name="theme-color" content="#1B2430">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="ZN Empreendimentos">
  <meta property="og:title" content="{esc(article["title"])}">
  <meta property="og:description" content="{esc(article["description"])}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:image" content="https://{domain}{esc(article["heroImage"])}">
  <meta property="og:image:width" content="1450">
  <meta property="og:image:height" content="1086">
  <meta property="article:published_time" content="{esc(article["publishedAt"])}">
  <meta property="article:modified_time" content="{esc(article["updatedAt"])}">
  <meta property="article:section" content="{esc(article["category"])}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(article["title"])}">
  <meta name="twitter:description" content="{esc(article["description"])}">
  <meta name="twitter:image" content="https://{domain}{esc(article["heroImage"])}">
  <script type="application/ld+json">{schema_json}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../article.css">
</head>
<body data-page-type="article" data-content-id="{esc(article["slug"])}" data-content-title="{esc(article["title"])}" data-content-category="{esc(article["category"])}" data-related-property-id="{esc(property_id)}" data-ga-measurement-id="{esc(config["gaMeasurementId"])}" data-meta-pixel-id="{esc(config["metaPixelId"])}">
  <header class="site-header">
    <div class="wrap nav">
      <a href="/" aria-label="ZN Empreendimentos — início"><img class="logo" src="../../assets/zn-logo-horizontal-onDark.png" alt="ZN Empreendimentos" width="900" height="220"></a>
      <nav class="nav-links" aria-label="Navegação principal"><a href="/conteudos/">Conteúdos</a><a class="nav-cta" href="{esc(property_data['path'])}" data-content-cta="header" data-property-id="{esc(property_id)}">Conhecer o Gamboas</a></nav>
    </div>
  </header>

  <main>
    <nav class="wrap breadcrumbs" aria-label="Navegação estrutural"><a href="/">Início</a><span aria-hidden="true">/</span><a href="/conteudos/">Conteúdos</a><span aria-hidden="true">/</span><span aria-current="page">{text(article["title"])}</span></nav>
    <article>
      <header class="article-header wrap">
        <div class="article-kicker"><span>{text(article["category"])}</span><span>Leitura de {reading_minutes} minutos</span></div>
        <h1>{text(article["title"])}</h1>
        <p class="article-deck">{text(article["excerpt"])}</p>
        <div class="article-meta"><span>Por {text(author["name"])}</span><span>Publicado em {published}</span><span>Atualizado em {updated}</span></div>
      </header>
      <figure class="article-hero wrap"><img src="../..{esc(article["heroImage"])}" alt="{esc(article["imageAlt"])}" width="1450" height="1086" fetchpriority="high"><figcaption>Imagem de referência do Edifício Gamboas, empreendimento apresentado ao final deste guia.</figcaption></figure>

      <div class="article-grid wrap">
        <aside class="article-toc" aria-label="Neste guia"><strong>Neste guia</strong><ol>{section_links}<li><a href="#perguntas-frequentes">Perguntas frequentes</a></li></ol></aside>
        <div class="article-body">
          <div class="article-intro">{intro}</div>
          {sections}

          <section class="property-cta" aria-labelledby="property-cta-title">
            <span class="eyebrow">{text(article["propertyCta"]["eyebrow"])}</span>
            <h2 id="property-cta-title">{text(article["propertyCta"]["title"])}</h2>
            <p>{text(article["propertyCta"]["text"])}</p>
            <div class="cta-actions"><a class="button" href="{esc(property_data['path'])}" data-content-cta="article" data-property-id="{esc(property_id)}">{text(article["propertyCta"]["buttonLabel"])}</a><a class="button button-secondary" href="https://wa.me/{esc(config['whatsapp'])}?text={whatsapp_text}" target="_blank" rel="noopener" data-content-cta="whatsapp" data-property-id="{esc(property_id)}">Falar pelo WhatsApp</a></div>
          </section>

          <section class="article-section faq" id="perguntas-frequentes"><h2>Perguntas frequentes</h2>{faq}</section>
          <aside class="author-box"><span class="author-initials" aria-hidden="true">LM</span><div><strong>{text(author["name"])}</strong><p>{text(author["jobTitle"])} • {text(author["credential"])}</p><p>Atendimento imobiliário da ZN Empreendimentos.</p></div></aside>
          <nav class="article-return" aria-label="Continuar navegando"><a href="/conteudos/">← Ver todos os conteúdos</a></nav>
        </div>
      </div>
    </article>
  </main>

  <footer><div class="wrap footer-row"><img src="../../assets/zn-logo-horizontal-onDark.png" alt="ZN Empreendimentos" width="900" height="220"><div class="footer-meta"><strong>Leonardo Madeira — Corretor de Imóveis • CRECI-SP 331393</strong>© 2026 ZN Empreendimentos. Todos os direitos reservados.</div></div></footer>
  <aside class="cookie-banner" id="cookie-banner" aria-label="Preferências de privacidade" hidden><p>Usamos medição opcional para entender quais conteúdos ajudam na sua busca. Você pode aceitar ou continuar sem medição. <a href="/gamboas/privacidade/">Saiba mais</a>.</p><div><button class="cookie-secondary" id="cookie-reject" type="button">Recusar</button><button class="cookie-primary" id="cookie-accept" type="button">Aceitar</button></div></aside>
  <script src="../article.js" defer></script>
</body>
</html>
'''


def render_card(article: dict) -> str:
    return (
        '<article class="article-card">'
        f'<a class="article-card-image" href="/conteudos/{esc(article["slug"])}/" tabindex="-1" aria-hidden="true">'
        f'<img src="..{esc(article["heroImage"])}" alt="" width="1450" height="1086" loading="lazy"></a>'
        '<div class="article-card-copy">'
        f'<span class="eyebrow">{text(article["category"])}</span>'
        f'<h3><a href="/conteudos/{esc(article["slug"])}/">{text(article["title"])}</a></h3>'
        f'<p>{text(article["excerpt"])}</p>'
        f'<a class="text-link" href="/conteudos/{esc(article["slug"])}/">Ler o guia →</a>'
        "</div></article>"
    )


def replace_generated_block(source: str, name: str, generated: str) -> str:
    start = f"<!-- {name}_START -->"
    end = f"<!-- {name}_END -->"
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.DOTALL)
    if not pattern.search(source):
        raise ValueError(f"Marcadores {name} ausentes")
    return pattern.sub(f"{start}\n{generated}\n{end}", source)


def write_or_check(path: Path, expected: str, check: bool, errors: list[str]) -> None:
    current = path.read_text(encoding="utf-8") if path.exists() else ""
    if check:
        if current != expected:
            errors.append(f"Arquivo editorial desatualizado: {path.relative_to(ROOT)}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(expected, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Não escreve; verifica se os arquivos gerados estão atualizados.")
    args = parser.parse_args()
    config = load_json(ROOT / "site.config.json")
    articles = [load_json(path) for path in sorted(ARTICLES_DIR.glob("*.json"))]
    errors: list[str] = []
    seen: set[str] = set()
    for article in articles:
        try:
            validate_article(article, config["properties"])
            if article["slug"] in seen:
                raise ValueError(f"Slug editorial duplicado: {article['slug']}")
            seen.add(article["slug"])
            output = CONTENTS_DIR / article["slug"] / "index.html"
            write_or_check(output, render_article(article, config), args.check, errors)
        except (KeyError, TypeError, ValueError) as exc:
            errors.append(str(exc))

    hub = HUB_PATH.read_text(encoding="utf-8")
    hub_expected = replace_generated_block(hub, "CONTENT_CARDS", "\n".join(render_card(article) for article in articles))
    write_or_check(HUB_PATH, hub_expected, args.check, errors)

    sitemap = SITEMAP_PATH.read_text(encoding="utf-8")
    urls = "\n".join(
        "  <url>\n"
        f"    <loc>https://{config['domain']}/conteudos/{esc(article['slug'])}/</loc>\n"
        f"    <lastmod>{esc(article['updatedAt'])}</lastmod>\n"
        "  </url>"
        for article in articles
    )
    sitemap_expected = replace_generated_block(sitemap, "CONTENT_URLS", urls)
    write_or_check(SITEMAP_PATH, sitemap_expected, args.check, errors)

    if errors:
        for error in errors:
            print(f"::error::{error}")
        return 1
    action = "verificados" if args.check else "gerados"
    print(f"{len(articles)} conteúdo(s) {action} com sucesso.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
