#!/usr/bin/env sh
# "Prueba de humo": se enciende la máquina y se revisa que no salga humo.
# No prueba todo (para eso están los tests), solo que lo esencial funciona
# de punta a punta contra la API YA DESPLEGADA (por ejemplo, en Docker).
#
# Uso: ./scripts/smoke-test.sh http://localhost:4000
set -eu

BASE_URL="${1:-http://localhost:4000}"
EMAIL="smoke-$(date +%s)@example.com"
JSON='Content-Type: application/json'

# Los errores van a stderr (>&2) para que no se los "trague" un pipe o un $(...).
fail() { echo "❌ $1" >&2; exit 1; }

# Hace la petición y falla si el código HTTP no es el esperado. Imprime el cuerpo.
call() {
  expected="$1"; shift
  body_file=$(mktemp)
  status=$(curl -s -o "$body_file" -w '%{http_code}' "$@")
  body=$(cat "$body_file"); rm -f "$body_file"
  [ "$status" = "$expected" ] || fail "Esperaba $expected y llegó $status en: $* → $body"
  printf '%s' "$body"
}

echo "1/5 Health"
call 200 "$BASE_URL/api/health" | grep -q '"database":"up"' || fail "La base de datos no está arriba"

echo "2/5 Registro"
token=$(call 201 -X POST "$BASE_URL/api/auth/register" -H "$JSON" \
  -d "{\"name\":\"Smoke\",\"email\":\"$EMAIL\",\"password\":\"contraseña-segura\"}" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$token" ] || fail "No llegó el token"

echo "3/5 Ruta protegida sin token → 401"
call 401 "$BASE_URL/api/tasks" > /dev/null

echo "4/5 Crear tarea con token"
call 201 -X POST "$BASE_URL/api/tasks" -H "$JSON" -H "Authorization: Bearer $token" \
  -d '{"title":"Tarea de humo","priority":"HIGH"}' > /dev/null

echo "5/5 Listar mis tareas"
call 200 "$BASE_URL/api/tasks" -H "Authorization: Bearer $token" | grep -q '"total":1' \
  || fail "La tarea creada no aparece en el listado"

echo "✅ Prueba de humo superada"
