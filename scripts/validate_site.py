#!/usr/bin/env python3
"""Valida proteções essenciais da landing page antes do merge."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "site.config.json"
INDEX_PATHS = (ROOT / "index.html", ROOT / "gamboas" / "index.html")
CNAME_PATH = ROOT / "CNAME"
APP_JS_PATH = ROOT / "gamboas" / "app.js"
APPS_SCRIPT_PATH = ROOT / "integrations" / "google-apps-script" / "Code.gs"
PRIVACY_PATH = ROOT / "gamboas" / "privacidade" / "index.html"
MEASUREMENT_DOC_PATH = ROOT / "docs" / "growth" / "measurement.md"


def annotation(level: str, message: str) -> None:
    print(f"::{level}::{message}")


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

    if not domain:
        errors.append("O domínio está vazio em site.config.json.")
    if not re.fullmatch(r"55\d{10,11}", whatsapp):
        errors.append("O WhatsApp deve estar no formato 55 + DDD + número, somente dígitos.")
    if not re.fullmatch(r"\d{10,25}", meta_pixel_id):
        errors.append("O Meta Pixel ID está ausente ou inválido em site.config.json.")
    if not re.fullmatch(r"G-[A-Z0-9]+", ga_measurement_id):
        errors.append("O ID do GA4 está ausente ou inválido em site.config.json.")
    if attribution_version != "growth-v1":
        errors.append("A versão de atribuição deve ser 'growth-v1'.")

    pages: list[tuple[Path, str]] = []
    for index_path in INDEX_PATHS:
        try:
            pages.append((index_path, index_path.read_text(encoding="utf-8")))
        except OSError as exc:
            annotation("error", f"Não foi possível ler {index_path.relative_to(ROOT)}: {exc}")
            return 1
    html = "\n".join(content for _, content in pages)

    source_paths = (APP_JS_PATH, APPS_SCRIPT_PATH, PRIVACY_PATH, MEASUREMENT_DOC_PATH)
    sources: dict[Path, str] = {}
    for source_path in source_paths:
        try:
            sources[source_path] = source_path.read_text(encoding="utf-8")
        except OSError as exc:
            errors.append(f"Não foi possível ler {source_path.relative_to(ROOT)}: {exc}")

    app_js = sources.get(APP_JS_PATH, "")
    apps_script = sources.get(APPS_SCRIPT_PATH, "")
    privacy_html = sources.get(PRIVACY_PATH, "")
    measurement_doc = sources.get(MEASUREMENT_DOC_PATH, "")

    if meta_pixel_id and meta_pixel_id not in app_js:
        errors.append("O Meta Pixel ID do site.config.json não coincide com gamboas/app.js.")
    if ga_measurement_id and ga_measurement_id not in app_js:
        errors.append("O ID do GA4 do site.config.json não coincide com gamboas/app.js.")
    if attribution_version and attribution_version not in app_js:
        errors.append("A versão de atribuição do site.config.json não coincide com gamboas/app.js.")
    if attribution_version and attribution_version not in apps_script:
        errors.append("A versão de atribuição do site.config.json não coincide com o Apps Script.")

    attribution_fields = (
        "measurementConsent",
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
            errors.append(f"Campo de atribuição ausente em gamboas/app.js: {field}")
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
    if re.search(r"\bTEST\d{3,}\b", "\n".join(sources.values())):
        errors.append("Código temporário META_TEST_EVENT_CODE encontrado no repositório.")

    gamboas_html = next((content for path, content in pages if path == ROOT / "gamboas" / "index.html"), "")
    cta_ids = re.findall(r'data-attribution-cta=["\']([^"\']+)["\']', gamboas_html)
    expected_ctas = {"cabecalho", "planta", "cta-final", "cta-fixo-mobile"}
    missing_ctas = expected_ctas.difference(cta_ids)
    if missing_ctas:
        errors.append("CTAs sem atribuição estável: " + ", ".join(sorted(missing_ctas)))

    try:
        cname = CNAME_PATH.read_text(encoding="utf-8").strip()
    except OSError as exc:
        errors.append(f"Não foi possível ler CNAME: {exc}")
        cname = ""

    if cname != domain:
        errors.append(f"CNAME deve conter exatamente '{domain}', mas contém '{cname}'.")

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
        for attribute in ("src", "href"):
            for value in re.findall(rf'{attribute}=["\']([^"\']+)["\']', page_html):
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
