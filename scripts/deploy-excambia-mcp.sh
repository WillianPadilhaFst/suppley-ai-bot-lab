#!/usr/bin/env bash
set -euo pipefail
umask 077
export COMPOSE_REMOVE_ORPHANS=false

app=suppley-ai-bot
db=suppley-mysql
old_image=suppley-ai-bot:landing-c3e0dc5
new_image=suppley-ai-bot:mcp-9ac164b
origin=https://calculasuppley.com.br
settings=/root/suppley-excambia-mcp
mode=${1:---check}

die() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$mode" == --check || "$mode" == --apply ]] || die "Use --check ou --apply."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 não está disponível."
for utility in python3 curl flock; do
  command -v "$utility" >/dev/null || die "Comando indisponível: $utility."
done

inspect() { docker inspect --format "$1" "$app"; }
label() { inspect "{{index .Config.Labels \"$1\"}}"; }

[[ "$(inspect '{{.Config.Image}}')" == "$old_image" ]] ||
  die "A imagem em execução mudou. Confira docker ps antes de continuar."
[[ "$(inspect '{{.State.Health.Status}}')" == healthy ]] || die "O app atual não está saudável."
docker image inspect "$new_image" >/dev/null
db_id=$(docker inspect --format '{{.Id}}' "$db")
table=$(docker exec "$db" sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -N -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE \"excambia_oauth_records\""')
[[ "$table" == excambia_oauth_records ]] || die "A tabela do OAuth está ausente."

project=$(label com.docker.compose.project)
service=$(label com.docker.compose.service)
directory=$(label com.docker.compose.project.working_dir)
files=$(label com.docker.compose.project.config_files)
[[ -n "$project" && -n "$service" && -d "$directory" && -n "$files" ]] ||
  die "Não foi possível identificar a configuração Compose ativa."
IFS=, read -r -a compose_files <<< "$files"
base=(docker compose --project-directory "$directory" --project-name "$project")
for file in "${compose_files[@]}"; do
  [[ -f "$file" ]] || die "Arquivo Compose ausente: $file"
  base+=(-f "$file")
done
cd "$directory"

scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
docker inspect "$app" > "$scratch/container.json"
docker image inspect "$old_image" > "$scratch/image.json"
cat > "$scratch/check.py" <<'PY'
import json
import sys

workspace, service, expected_image = sys.argv[1:4]
def read(name):
    with open(f"{workspace}/{name}.json") as fp:
        return json.load(fp)
compose = read("compose")["services"][service]
if compose.get("image") != expected_image:
    raise SystemExit("O Compose atual não resolve para a imagem esperada.")
if compose.get("container_name") != "suppley-ai-bot":
    raise SystemExit("O Compose atual não identifica o container esperado.")
def env(items):
    return dict(item.split("=", 1) for item in items)
image = read("image")[0]
container = read("container")[0]
if container["Image"] != image["Id"]:
    raise SystemExit("A tag anterior aponta para outra imagem. O retorno não está garantido.")
actual = env(container["Config"]["Env"])
resolved = env(image["Config"]["Env"])
for name, value in compose.get("environment", {}).items():
    if value is None:
        resolved.pop(name, None)
    else:
        resolved[name] = str(value)
different = sorted(key for key in actual.keys() | resolved.keys() if actual.get(key) != resolved.get(key))
if different:
    raise SystemExit("Variáveis do Compose diferentes das variáveis em execução: " + ", ".join(different))
PY

if "${base[@]}" config --format json > "$scratch/compose.json" 2>"$scratch/compose.log" &&
   python3 "$scratch/check.py" "$scratch" "$service" "$old_image"; then
  :
elif [[ -f "$directory/.env.production" ]] &&
     "${base[@]}" --env-file "$directory/.env.production" config --format json        > "$scratch/compose.json" 2>"$scratch/compose.log" &&
     python3 "$scratch/check.py" "$scratch" "$service" "$old_image"; then
  base+=(--env-file "$directory/.env.production")
else
  die "A configuração atual não foi reproduzida. O container não foi trocado."
fi

if [[ "$mode" == --check ]]; then
  printf 'Pré-checagem OK. Projeto %s, serviço %s, imagem atual %s.\n' "$project" "$service" "$old_image"
  exit 0
fi

install -d -m 700 "$settings"
exec 9>"$settings/deploy.lock"
flock -n 9 || die "Já existe outro deploy em andamento."

override="$settings/mcp-9ac164b.json"
if [[ ! -s "$override" ]]; then
  docker run --rm --network none --entrypoint node "$new_image" -e '
    const { generateKeyPairSync, randomUUID } = require("node:crypto");
    const [service, image, origin] = process.argv.slice(1);
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const jwks = { keys: [{ ...privateKey.export({ format: "jwk" }), kid: randomUUID() }] };
    const environment = {
      APP_URL: origin,
      MCP_RESOURCE_URL: origin + "/mcp",
      INTEGRATION_API_RESOURCE_URL: origin + "/api/v1",
      EXCAMBIA_OAUTH_ENABLED: "true",
      EXCAMBIA_OAUTH_CHATGPT: "true",
      EXCAMBIA_OAUTH_JWKS: JSON.stringify(jwks),
      MCP_ENABLED: "true",
      MCP_AUTHORIZATION_REVIEWED: "true",
      INTEGRATION_API_ENABLED: "true"
    };
    console.log(JSON.stringify({ services: { [service]: { image, environment } } }));
  ' "$service" "$new_image" "$origin" > "$override.partial"
  mv "$override.partial" "$override"
fi

target=("${base[@]}" -f "$override")
"${target[@]}" config --quiet 2>"$scratch/target.log" ||
  die "O Compose recusou a configuração nova. O container não foi trocado."
[[ "$(inspect '{{.Config.Image}}')" == "$old_image" ]] ||
  die "A imagem atual mudou durante a pré-checagem."

rollback() {
  printf 'A verificação falhou. Restaurando a imagem anterior.\n' >&2
  "${base[@]}" up -d --no-deps --no-build --pull never "$service" ||
    die "O retorno automático falhou. Confira docker ps."
  printf 'Imagem após retorno: %s\n' "$(inspect '{{.Config.Image}}')" >&2
  exit 1
}

"${target[@]}" up -d --no-deps --no-build --pull never "$service" || rollback

for attempt in {1..36}; do
  if [[ "$(inspect '{{.State.Health.Status}}' 2>/dev/null || true)" == healthy ]]; then
    break
  fi
  sleep 2
done

[[ "$(inspect '{{.Config.Image}}')" == "$new_image" &&
   "$(inspect '{{.State.Health.Status}}')" == healthy &&
   "$(docker inspect --format '{{.Id}}' "$db")" == "$db_id" ]] || rollback
curl -fsS --max-time 12 "$origin/health" > "$scratch/health.json" || rollback
curl -fsSL --max-time 12 "$origin/.well-known/oauth-authorization-server/oauth"   > "$scratch/oauth.json" || rollback
curl -fsS --max-time 12 "$origin/.well-known/oauth-protected-resource/mcp"   > "$scratch/mcp.json" || rollback
python3 - "$scratch" "$origin" <<'PY' || rollback
import json, sys
folder, origin = sys.argv[1:]
def read(name):
    with open(f"{folder}/{name}.json") as fp:
        return json.load(fp)
assert read("health")["status"] == "ok"
oauth = read("oauth")
assert oauth["issuer"] == origin + "/oauth"
assert "S256" in oauth["code_challenge_methods_supported"]
assert read("mcp")["resource"] == origin + "/mcp"
PY
printf 'App saudável. OAuth publicado em %s/oauth e MCP em %s/mcp.\n' "$origin" "$origin"
