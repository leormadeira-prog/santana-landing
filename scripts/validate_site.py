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
INDEX_PATH = ROOT / "index.html"
CNAME_PATH = ROOT / "CNAME"


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

    if not domain:
        errors.append("O domínio está vazio em site.config.json.")
    if not re.fullmatch(r"55\d{10,11}", whatsapp):
        errors.append("O WhatsApp deve estar no formato 55 + DDD + número, somente dígitos.")

    try:
        html = INDEX_PATH.read_text(encoding="utf-8")
    except OSError as exc:
        annotation("error", f"Não foi possível ler index.html: {exc}")
        return 1

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

    local_paths = set()
    for attribute in ("src", "href"):
        for value in re.findall(rf'{attribute}=["\']([^"\']+)["\']', html):
            parsed = urlparse(value)
            if parsed.scheme or value.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue
            clean = parsed.path.lstrip("/")
            if clean and not clean.endswith("/"):
                local_paths.add(clean)

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
    lower_html = html.lower()
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
