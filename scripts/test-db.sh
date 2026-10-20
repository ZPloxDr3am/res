#!/usr/bin/env bash
# Aplica as migrações num Postgres limpo e roda os testes do banco.
# Uso: DATABASE_URL=postgres://... scripts/test-db.sh   (CI)
#      scripts/test-db.sh --local                        (sobe um Postgres temporário com initdb)
set -euo pipefail
cd "$(dirname "$0")/.."

cleanup() { :; }
if [[ "${1:-}" == "--local" ]]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
  RUNUSER=""
  if [[ "$(id -u)" == "0" ]]; then
    id restest >/dev/null 2>&1 || useradd -m restest
    RUNUSER="runuser -u restest --"
  fi
  DATA="$(mktemp -d)"; chmod 777 "$DATA"
  PORT=54329
  $RUNUSER "$PGBIN/initdb" -D "$DATA/db" -U postgres -E UTF8 --locale=C.UTF-8 >/dev/null 2>&1
  $RUNUSER "$PGBIN/pg_ctl" -D "$DATA/db" -o "-p $PORT -k $DATA -c listen_addresses='' -c wal_level=logical" -l "$DATA/log" -w start >/dev/null
  cleanup() { $RUNUSER "$PGBIN/pg_ctl" -D "$DATA/db" -m fast stop >/dev/null || true; rm -rf "$DATA"; }
  trap cleanup EXIT
  DATABASE_URL="postgresql://postgres@/postgres?host=$DATA&port=$PORT"
fi

: "${DATABASE_URL:?defina DATABASE_URL ou use --local}"
PSQL=(psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" -f supabase/tests/00_stub_supabase.sql
for f in supabase/migrations/*.sql; do
  echo "migração: $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f supabase/tests/10_regras.sql
