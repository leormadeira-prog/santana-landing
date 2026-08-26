#!/usr/bin/env python3
"""Valida proteções essenciais da landing page antes do merge."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "site.config.json"
CNAME_PATH = ROOT / "CNAME"
APPS_SCRIPT_PATH = ROOT / "integrations" / "google-apps-script" / "Code.gs"
MEASUREMENT_DOC_PATH = ROOT / "docs" / "growth" / "measurement.md"
MULTI_PROPERTY_DOC_PATH = ROOT / "docs" / "growth" / "multi-property.md"
CONTENTS_INDEX_PATH = ROOT / "conteudos" / "index.html"
CONTENT_ARTICLES_DIR = ROOT / "content" / "articles"
CONTENT_BUILD_SCRIPT = ROOT / "scripts" / "build_content.py"
CONTENT_SCRIPT_PATH = ROOT / "conteudos" / "article.js"
CONTENT_ENGINE_DOC_PATH = ROOT / "docs" / "growth" / "content-engine.md"
ROBOTS_PATH = ROOT / "robots.txt"
SITEMAP_PATH = ROOT / "sitemap.xml"


def annotation(level: str, message: str) -> None:
    print(f"::{level}::{message}")


def json_ld_types(page_html: str, page_label: str, errors: list[str]) -> set[str]:
    types: set[str] = set()
    blocks = re.findall(
        r'<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        page_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not blocks:
        errors.append(f"Dados estruturados JSON-LD ausentes em {page_label}.")
        return types

    for block in blocks:
        try:
            payload = json.loads(block)
        except json.JSONDecodeError as exc:
            errors.append(f"JSON-LD inválido em {page_label}: {exc}")
            continue
        nodes = payload.get("@graph", []) if isinstance(payload, dict) else []
        if isinstance(payload, dict):
            nodes = [payload, *nodes]
        for node in nodes:
            if not isinstance(node, dict):
                continue
            node_type = node.get("@type")
            if isinstance(node_type, str):
                types.add(node_type)
            elif isinstance(node_type, list):
                types.update(value for value in node_type if isinstance(value, str))
    return types


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    try:
        config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        annotation("error", f"Não foi possível ler site.config.json: {exc}")
        return 1

    domain = str(config.get("domain", "")).strip()
    whatsapp = re.sub(r"\D", "", str(config.get("whatsapp", "")))
    meta_pixel_id = str(config.get("metaPixelId", "")).strip()
    ga_measurement_id = str(config.get("gaMeasurementId", "")).strip()
    attribution_version = str(config.get("attributionVersion", "")).strip()
    properties = config.get("properties", {})
    content_articles: list[dict] = []
    content_article_pages: dict[str, Path] = {}

    if not domain:
        errors.append("O domínio está vazio em site.config.json.")
    if not re.fullmatch(r"55\d{10,11}", whatsapp):
        errors.append("O WhatsApp deve estar no formato 55 + DDD + número, somente dígitos.")
    if not re.fullmatch(r"\d{10,25}", meta_pixel_id):
        errors.append("O Meta Pixel ID está ausente ou inválido em site.config.json.")
    if not re.fullmatch(r"G-[A-Z0-9]+", ga_measurement_id):
        errors.append("O ID do GA4 está ausente ou inválido em site.config.json.")
    if attribution_version != "growth-v2":
        errors.append("A versão de atribuição deve ser 'growth-v2'.")
    if not isinstance(properties, dict) or not properties:
        errors.append("site.config.json deve declarar ao menos um empreendimento em 'properties'.")
        properties = {}

    property_pages: dict[str, Path] = {}
    for property_id, property_data in properties.items():
        if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,119}", str(property_id)):
            errors.append(f"ID de empreendimento inválido: {property_id}")
            continue
        if not isinstance(property_data, dict):
            errors.append(f"Configuração inválida para o empreendimento {property_id}.")
            continue
        property_path = str(property_data.get("path", ""))
        if not re.fullmatch(r"/[a-z0-9/_-]+/", property_path) or ".." in property_path:
            errors.append(f"Caminho inválido para o empreendimento {property_id}: {property_path}")
            continue
        if str(property_data.get("slug", "")) != property_id:
            errors.append(f"O slug do empreendimento {property_id} deve coincidir com seu ID.")
        if not str(property_data.get("name", "")).strip():
            errors.append(f"Nome ausente para o empreendimento {property_id}.")
        if not isinstance(property_data.get("priceFrom"), (int, float)):
            errors.append(f"Preço inicial inválido para o empreendimento {property_id}.")
        if not re.fullmatch(r"[A-Z]{3}", str(property_data.get("currency", ""))):
            errors.append(f"Moeda inválida para o empreendimento {property_id}.")
        if not isinstance(property_data.get("trackingCtas"), list):
            errors.append(f"CTAs de tracking ausentes para o empreendimento {property_id}.")
        property_pages[property_id] = ROOT / property_path.strip("/") / "index.html"

    for article_path in sorted(CONTENT_ARTICLES_DIR.glob("*.json")):
        try:
            article = json.loads(article_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"Conteúdo editorial inválido em {article_path.relative_to(ROOT)}: {exc}")
            continue
        slug = str(article.get("slug", ""))
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            errors.append(f"Slug editorial inválido em {article_path.relative_to(ROOT)}: {slug}")
            continue
        if slug in content_article_pages:
            errors.append(f"Slug editorial duplicado: {slug}")
            continue
        content_articles.append(article)
        content_article_pages[slug] = CONTENTS_INDEX_PATH.parent / slug / "index.html"

    pages: list[tuple[Path, str]] = []
    page_paths = [ROOT / "index.html", CONTENTS_INDEX_PATH, *content_article_pages.values()]
    for property_page in property_pages.values():
        page_paths.extend((property_page, property_page.parent / "obrigado" / "index.html"))
    for index_path in page_paths:
        try:
            pages.append((index_path, index_path.read_text(encoding="utf-8")))
        except OSError as exc:
            annotation("error", f"Não foi possível ler {index_path.relative_to(ROOT)}: {exc}")
            return 1
    html = "\n".join(content for _, content in pages)

    indexable_pages = [
        ROOT / "index.html",
        CONTENTS_INDEX_PATH,
        *content_article_pages.values(),
        *property_pages.values(),
    ]
    page_content = dict(pages)
    for index_path in indexable_pages:
        page_html = page_content.get(index_path, "")
        page_label = str(index_path.relative_to(ROOT))
        required_patterns = {
            r"<title>\s*[^<]+\s*</title>": "title",
            r'<meta\s+name=["\']description["\']\s+content=["\'][^"\']+["\']': "meta description",
            r'<link\s+rel=["\']canonical["\']\s+href=["\']https://[^"\']+["\']': "canonical",
            r'<meta\s+property=["\']og:title["\']\s+content=["\'][^"\']+["\']': "og:title",
            r'<meta\s+property=["\']og:description["\']\s+content=["\'][^"\']+["\']': "og:description",
            r'<meta\s+property=["\']og:image["\']\s+content=["\']https://[^"\']+["\']': "og:image",
        }
        for pattern, label in required_patterns.items():
            if not re.search(pattern, page_html, flags=re.IGNORECASE):
                errors.append(f"{label} ausente ou inválido em {page_label}.")
        if len(re.findall(r"<h1\b", page_html, flags=re.IGNORECASE)) != 1:
            errors.append(f"{page_label} deve conter exatamente um H1.")
        types = json_ld_types(page_html, page_label, errors)
        if index_path == ROOT / "index.html" and not {"Organization", "WebSite"}.issubset(types):
            errors.append("A página inicial deve declarar Organization e WebSite no JSON-LD.")
        if index_path != ROOT / "index.html" and "BreadcrumbList" not in types:
            errors.append(f"BreadcrumbList ausente no JSON-LD de {page_label}.")
        if index_path in content_article_pages.values() and "Article" not in types:
            errors.append(f"Article ausente no JSON-LD de {page_label}.")

    property_app_paths = tuple(page.parent / "app.js" for page in property_pages.values())
    privacy_paths = tuple(page.parent / "privacidade" / "index.html" for page in property_pages.values())
    source_paths = property_app_paths + privacy_paths + (
        APPS_SCRIPT_PATH,
        MEASUREMENT_DOC_PATH,
        MULTI_PROPERTY_DOC_PATH,
        CONTENT_SCRIPT_PATH,
        CONTENT_ENGINE_DOC_PATH,
    )
    sources: dict[Path, str] = {}
    for source_path in source_paths:
        try:
            sources[source_path] = source_path.read_text(encoding="utf-8")
        except OSError as exc:
            errors.append(f"Não foi possível ler {source_path.relative_to(ROOT)}: {exc}")

    app_js = "\n".join(sources.get(path, "") for path in property_app_paths)
    apps_script = sources.get(APPS_SCRIPT_PATH, "")
    privacy_html = "\n".join(sources.get(path, "") for path in privacy_paths)
    measurement_doc = sources.get(MEASUREMENT_DOC_PATH, "")
    multi_property_doc = sources.get(MULTI_PROPERTY_DOC_PATH, "")
    content_js = sources.get(CONTENT_SCRIPT_PATH, "")
    content_engine_doc = sources.get(CONTENT_ENGINE_DOC_PATH, "")

    if meta_pixel_id and meta_pixel_id not in app_js:
        errors.append("O Meta Pixel ID do site.config.json não coincide com os scripts das landings.")
    if ga_measurement_id and ga_measurement_id not in app_js:
        errors.append("O ID do GA4 do site.config.json não coincide com os scripts das landings.")
    if attribution_version and attribution_version not in app_js:
        errors.append("A versão de atribuição do site.config.json não coincide com os scripts das landings.")
    if attribution_version and attribution_version not in apps_script:
        errors.append("A versão de atribuição do site.config.json não coincide com o Apps Script.")

    attribution_fields = (
        "measurementConsent",
        "measurementConsentVersion",
        "measurementConsentAt",
        "attendanceConsentVersion",
        "attendanceConsentAt",
        "firstPageUrl",
        "initialReferrer",
        "contentOrigin",
        "ctaOrigin",
        "firstTouchAt",
        "lastTouchUrl",
        "attributionVersion",
    )
    for field in attribution_fields:
        if field not in app_js:
            errors.append(f"Campo de atribuição ausente nos scripts das landings: {field}")
        if field not in apps_script:
            errors.append(f"Campo de atribuição ausente no Apps Script: {field}")

    if 'lead.measurementConsent !== "accepted"' not in apps_script:
        errors.append("A CAPI precisa estar condicionada ao consentimento de medição aceito.")
    if 'measurementIdentifiers = measurement === "accepted"' not in app_js:
        errors.append("Identificadores de medição só podem ser enviados depois do aceite.")
    if "OPERATION_HEADERS" not in apps_script or "ATTRIBUTION_HEADERS" not in apps_script:
        errors.append("O Apps Script não protege as colunas operacionais e de atribuição.")
    if "independente da escolha de medição" not in privacy_html:
        errors.append("A política não diferencia consentimento de atendimento e de medição.")
    if attribution_version and attribution_version not in measurement_doc:
        errors.append("A documentação de medição não registra a versão de atribuição atual.")
    if "property_id" not in app_js or "property_id" not in apps_script or "property_id" not in measurement_doc:
        errors.append("O contrato multiempreendimento deve carregar property_id no cliente, servidor e documentação.")
    if "O Gamboas é o piloto, não a infraestrutura" not in multi_property_doc:
        errors.append("A auditoria multiempreendimento está ausente ou incompleta.")
    if 'FormStart: "form_start"' not in app_js:
        errors.append("O evento form_start com contexto do empreendimento está ausente.")
    event_markers = (
        'PageView: "page_view"',
        'Lead: "generate_lead"',
        'ClickWhatsApp: "click_whatsapp"',
        'ViewPlants: "view_plants"',
        'ClickCta: "click_cta"',
        'PageView: "PageView"',
        'Contact: "Contact"',
    )
    if any(marker not in app_js for marker in event_markers):
        errors.append("A taxonomia de eventos do funil está ausente ou incompleta.")
    if "send_page_view: false" not in app_js or 'track("PageView"' not in app_js:
        errors.append("PageView deve ser emitido explicitamente, uma única vez e após consentimento.")
    if "result.stored !== true" not in app_js or "result.id !== eventId" not in app_js:
        errors.append("A conversão do navegador só pode ocorrer após confirmar a persistência do mesmo event_id.")
    if "zn-lead-summary" in app_js:
        errors.append("Dados de lead não podem ser persistidos no armazenamento do navegador.")
    persistence_marker = "sheet.getRange(row, 1, 1, leadRow.length).setValues([leadRow]);"
    capi_marker = "var capiResults = sendCapiEvents_(lead);"
    persistence_position = apps_script.find(persistence_marker)
    capi_position = apps_script.find(capi_marker)
    if persistence_position == -1 or capi_position == -1 or persistence_position > capi_position:
        errors.append("O Apps Script deve persistir a linha completa antes de chamar a CAPI.")
    if re.search(r"\bTEST\d{3,}\b", "\n".join(sources.values())):
        errors.append("Código temporário META_TEST_EVENT_CODE encontrado no repositório.")
    content_measurement_markers = (
        'CONSENT_KEY = "zn-measurement-consent"',
        'window.gtag("event", "view_item"',
        'window.gtag("event", "select_content"',
        'window.fbq("track", "ViewContent"',
        'window.fbq("trackCustom", "ContentCTAClick"',
        'MEASUREMENT_CONSENT_VERSION = "measurement-2026-08-19"',
    )
    if any(marker not in content_js for marker in content_measurement_markers):
        errors.append("A medição consentida do Content Engine está ausente ou incompleta.")
    if "O Gamboas é o primeiro destino comercial relacionado, mas não está embutido" not in content_engine_doc:
        errors.append("A independência do Content Engine não está documentada.")

    for property_id, property_page in property_pages.items():
        property_data = properties[property_id]
        property_html = page_content.get(property_page, "")
        expected_attributes = {
            "data-property-id": property_id,
            "data-property-name": str(property_data.get("name", "")),
            "data-property-price": str(property_data.get("priceFrom", "")),
            "data-property-currency": str(property_data.get("currency", "")),
        }
        for attribute, expected_value in expected_attributes.items():
            if not re.search(rf'{attribute}=["\']{re.escape(expected_value)}["\']', property_html):
                errors.append(f"{attribute} do empreendimento {property_id} não coincide com site.config.json.")
        cta_ids = set(re.findall(r'data-attribution-cta=["\']([^"\']+)["\']', property_html))
        expected_ctas = set(property_data.get("trackingCtas", []))
        missing_ctas = expected_ctas.difference(cta_ids)
        if missing_ctas:
            errors.append(
                f"CTAs sem atribuição estável em {property_id}: " + ", ".join(sorted(missing_ctas))
            )
        server_markers = (
            f"{property_id}: {{",
            f'path: "{property_data.get("path", "")}"',
            f'name: "{property_data.get("name", "")}"',
            f'priceFrom: {property_data.get("priceFrom", "")}',
            f'currency: "{property_data.get("currency", "")}"',
        )
        if any(marker not in apps_script for marker in server_markers):
            errors.append(f"Configuração do empreendimento {property_id} diverge no Apps Script.")
        if 'name="website"' not in property_html:
            errors.append(f"Honeypot antispam ausente no formulário de {property_id}.")
        required_copy = (
            "Imagens do apartamento decorado, meramente ilustrativas. "
            "As unidades são entregues no contrapiso, sem móveis, eletrodomésticos, "
            "marcenaria e itens de decoração. Consulte as especificações e o memorial descritivo."
        )
        if required_copy not in property_html:
            errors.append(f"Disclaimer completo de imagens e contrapiso ausente em {property_id}.")
        if not re.search(r'<source\b[^>]*type=["\']image/webp["\'][^>]*srcset=', property_html):
            errors.append(f"Imagens responsivas WebP ausentes em {property_id}.")

    content_hub_html = page_content.get(CONTENTS_INDEX_PATH, "")
    expected_content_hub_values = {
        "data-ga-measurement-id": ga_measurement_id,
        "data-meta-pixel-id": meta_pixel_id,
    }
    for attribute, expected_value in expected_content_hub_values.items():
        if not re.search(rf'{attribute}=["\']{re.escape(expected_value)}["\']', content_hub_html):
            errors.append(f"{attribute} do hub de conteúdo não coincide com a configuração.")

    for article in content_articles:
        slug = str(article.get("slug", ""))
        article_page = content_article_pages.get(slug)
        article_html = page_content.get(article_page, "") if article_page else ""
        expected_article_values = {
            "data-content-id": slug,
            "data-ga-measurement-id": ga_measurement_id,
            "data-meta-pixel-id": meta_pixel_id,
        }
        for attribute, expected_value in expected_article_values.items():
            if not re.search(rf'{attribute}=["\']{re.escape(expected_value)}["\']', article_html):
                errors.append(f"{attribute} do conteúdo {slug} não coincide com a configuração.")
        related_properties = article.get("relatedProperties", [])
        if not isinstance(related_properties, list) or not related_properties:
            errors.append(f"O conteúdo {slug} deve declarar ao menos um empreendimento relacionado.")
        for property_id in related_properties if isinstance(related_properties, list) else []:
            if property_id not in properties:
                errors.append(f"Empreendimento relacionado inexistente em {slug}: {property_id}")

    try:
        cname = CNAME_PATH.read_text(encoding="utf-8").strip()
    except OSError as exc:
        errors.append(f"Não foi possível ler CNAME: {exc}")
        cname = ""

    if cname != domain:
        errors.append(f"CNAME deve conter exatamente '{domain}', mas contém '{cname}'.")

    try:
        robots = ROBOTS_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"Não foi possível ler robots.txt: {exc}")
        robots = ""
    if f"Sitemap: https://{domain}/sitemap.xml" not in robots:
        errors.append("robots.txt deve declarar a URL canônica do sitemap.")
    if "Disallow: /gamboas/obrigado/" not in robots:
        errors.append("robots.txt deve impedir o rastreamento da página de obrigado.")

    try:
        sitemap_root = ET.parse(SITEMAP_PATH).getroot()
        sitemap_urls = {
            (node.text or "").strip()
            for node in sitemap_root.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
        }
    except (OSError, ET.ParseError) as exc:
        errors.append(f"Não foi possível validar sitemap.xml: {exc}")
        sitemap_urls = set()
    expected_sitemap_urls = {
        f"https://{domain}/",
        f"https://{domain}/conteudos/",
        *(f"https://{domain}{data.get('path', '')}" for data in properties.values()),
        *(f"https://{domain}/conteudos/{slug}/" for slug in content_article_pages),
    }
    missing_sitemap_urls = expected_sitemap_urls.difference(sitemap_urls)
    if missing_sitemap_urls:
        errors.append("URLs ausentes no sitemap.xml: " + ", ".join(sorted(missing_sitemap_urls)))

    expected_url = f"https://{domain}"
    if expected_url not in html:
        errors.append(f"O domínio de produção {expected_url} não aparece no index.html.")

    wa_numbers = re.findall(r"https://wa\.me/(\d+)", html)
    if not wa_numbers:
        errors.append("Nenhum link wa.me foi encontrado no index.html.")
    elif any(number != whatsapp for number in wa_numbers):
        found = ", ".join(sorted(set(wa_numbers)))
        errors.append(
            f"Todos os links wa.me devem usar {whatsapp}. Números encontrados: {found}."
        )

    forbidden_values = (
        "5511999999999",
        "900000000",
        "999999999",
        "SEU-DOMINIO-AQUI",
    )
    for value in forbidden_values:
        if value in html:
            errors.append(f"Valor provisório encontrado no index.html: {value}")

    local_paths: set[str] = set()
    for index_path, page_html in pages:
        referenced_values: list[str] = []
        for attribute in ("src", "href"):
            referenced_values.extend(re.findall(rf'{attribute}=["\']([^"\']+)["\']', page_html))
        for srcset in re.findall(r'srcset=["\']([^"\']+)["\']', page_html):
            referenced_values.extend(
                candidate.strip().split()[0]
                for candidate in srcset.split(",")
                if candidate.strip()
            )
        for value in referenced_values:
            parsed = urlparse(value)
            if parsed.scheme or value.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            clean = parsed.path
            if not clean or clean.endswith("/"):
                continue
            target = (ROOT / clean.lstrip("/")) if clean.startswith("/") else (index_path.parent / clean)
            try:
                relative = str(target.resolve().relative_to(ROOT.resolve()))
            except ValueError:
                errors.append(f"Caminho local fora do repositório: {value}")
                continue
            local_paths.add(relative)

    ignored_suffixes = (".html",)
    for relative_path in sorted(local_paths):
        if relative_path == "" or relative_path.endswith(ignored_suffixes):
            continue
        target = ROOT / relative_path
        if not target.exists():
            errors.append(f"Arquivo local referenciado não existe: {relative_path}")

    warning_patterns = {
        "[inserir": "Há um campo comercial ainda marcado para inserção.",
        "99999-9999": "Há um telefone visual possivelmente provisório.",
        "a definir": "Há informação comercial marcada como 'a definir'.",
    }
    visible_html = re.sub(r'<input\b[^>]*\bplaceholder=["\'][^"\']*["\'][^>]*>', '', html, flags=re.IGNORECASE)
    lower_html = visible_html.lower()
    for pattern, message in warning_patterns.items():
        if pattern.lower() in lower_html:
            warnings.append(message)

    try:
        content_check = subprocess.run(
            [sys.executable, str(CONTENT_BUILD_SCRIPT), "--check"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if content_check.returncode != 0:
            details = (content_check.stdout + content_check.stderr).strip()
            errors.append("Arquivos gerados do Content Engine estão desatualizados. " + details)
    except OSError as exc:
        errors.append(f"Não foi possível executar a validação do Content Engine: {exc}")

    for message in warnings:
        annotation("warning", message)
    for message in errors:
        annotation("error", message)

    if errors:
        print(f"Validação falhou com {len(errors)} erro(s) e {len(warnings)} aviso(s).")
        return 1

    print(f"Validação concluída com sucesso. {len(warnings)} aviso(s).")
    print(f"Domínio: {domain}")
    print(f"WhatsApp validado em {len(wa_numbers)} link(s).")
    print(f"Arquivos locais verificados: {len(local_paths)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
