#!/usr/bin/env bash
# Mitigação emergencial de HTTP/2 para o host do Suppley.
# Exige execução manual na Droplet; NÃO é executado pelo deploy do aplicativo.
set -Eeuo pipefail

usage() {
  echo "Uso: sudo bash $0 --check | --apply /etc/nginx/sites-available/suppley" >&2
  exit 2
}
[[ ${EUID} -eq 0 ]] || { echo "Execute com sudo (root)." >&2; exit 2; }
mode="${1:-}"
[[ "$mode" == "--check" || "$mode" == "--apply" ]] || usage
command -v nginx >/dev/null || { echo "NGINX não instalado no host." >&2; exit 2; }
nginx -v
nginx -t

# Detecta diretivas explícitas ativas nas configurações carregadas.
# Também examine manualmente o nginx -T: a detecção por linha não é um parser completo.
active_http2() {
  nginx -T 2>/dev/null |
    sed -E 's/[[:space:]]*#.*$//' |
    grep -En '^[[:space:]]*(listen[[:space:]]+[^;]*[[:space:]]http2([[:space:];]|$)|http2[[:space:]]+on[[:space:]]*;)' || true
}
echo "HTTP/2 explícito nas configurações carregadas:"
remaining="$(active_http2)"
if [[ -n "$remaining" ]]; then printf '%s\n' "$remaining"; else echo "Nenhuma diretiva explícita encontrada (verifique também includes/herança)."; fi

[[ "$mode" == "--check" ]] && exit 0
config="${2:-}"
[[ -n "$config" && -f "$config" ]] || { echo "Informe o caminho de um arquivo NGINX existente." >&2; usage; }
command -v python3 >/dev/null || { echo "Python 3 não encontrado." >&2; exit 2; }

backup="${config}.before-http2-mitigation.$(date -u +%Y%m%dT%H%M%SZ).bak"
cp -p -- "$config" "$backup"
echo "Backup preservado em $backup"
restore() { cp -p -- "$backup" "$config"; }

if ! python3 - "$config" <<'PY'
import pathlib, re, sys
path = pathlib.Path(sys.argv[1])
before = path.read_text()
out = []
for line in before.splitlines(keepends=True):
    body, sep, comment = line.partition("#")
    if re.match(r"^\s*listen\s+[^;]*;", body):
        # Remove apenas o parâmetro http2 de diretivas listen.
        body = re.sub(r"(?<!\S)http2(?=[\s;])", "", body)
        body = re.sub(r"[ \t]+;", ";", body)
        body = re.sub(r"[ \t]{2,}", " ", body)
        line = body + sep + comment
    elif re.match(r"^\s*http2\s+on\s*;", body):
        indent = re.match(r"^\s*", body).group(0)
        line = indent + "# http2 on; desativado temporariamente (CVE-2026-123007/123633)\n"
    out.append(line)
after = "".join(out)
path.write_text(after) if after != before else None
print("Diretivas ajustadas no arquivo:" if after != before else "Arquivo já sem HTTP/2 explícito:", path)
PY
then
  restore
  echo "Falha na edição; arquivo restaurado." >&2
  exit 1
fi

if ! nginx -t; then
  restore
  nginx -t || true
  echo "Configuração inválida: revertida; NGINX não recarregado." >&2
  exit 1
fi
remaining="$(active_http2)"
if [[ -n "$remaining" ]]; then
  printf 'HTTP/2 ainda ativo em outros arquivos:\n%s\n' "$remaining" >&2
  restore
  echo "Revertido por segurança. Revise TODOS os vhosts/includes antes de aplicar." >&2
  exit 3
fi
if ! systemctl reload nginx; then
  restore
  nginx -t && systemctl reload nginx || true
  echo "Falha no reload; tentativa de restaurar configuração original realizada." >&2
  exit 4
fi
echo "Reload executado. Verifique o acesso HTTPS, as APIs e os logs do Suppley."
echo "Backup para rollback: $backup"
