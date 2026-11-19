#!/usr/bin/env bash
# Gera scripts/conferencia/conferir-producao.sql: um SELECT só de leitura que compara o banco de produção
# com as migrações do repositório (funções, tabelas, RLS, políticas e gatilhos de public e private).
# Uso: scripts/conferencia/gerar.sh   (precisa do PostgreSQL instalado, como o test-db.sh --local)
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN="$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)"
RUNUSER=""
if [[ "$(id -u)" == "0" ]]; then id restest >/dev/null 2>&1 || useradd -m restest; RUNUSER="runuser -u restest --"; fi
DATA="$(mktemp -d)"; chmod 777 "$DATA"; PORT=54331
$RUNUSER "$PGBIN/initdb" -D "$DATA/db" -U postgres -E UTF8 --locale=C.UTF-8 >/dev/null 2>&1
$RUNUSER "$PGBIN/pg_ctl" -D "$DATA/db" -o "-p $PORT -k $DATA -c listen_addresses='' -c wal_level=logical" -l "$DATA/log" -w start >/dev/null
trap '$RUNUSER "$PGBIN/pg_ctl" -D "$DATA/db" -m fast stop >/dev/null || true; rm -rf "$DATA"' EXIT
URL="postgresql://postgres@/postgres?host=$DATA&port=$PORT"
psql "$URL" -X -q -v ON_ERROR_STOP=1 -f supabase/tests/00_stub_supabase.sql
for f in supabase/migrations/*.sql; do psql "$URL" -X -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1; done
psql "$URL" -X -t -A -F $'\t' -f scripts/conferencia/impressao-digital.sql > "$DATA/esperado.tsv"
python3 - "$DATA/esperado.tsv" <<'PY'
import sys, datetime
linhas = [l.rstrip('\n').split('\t') for l in open(sys.argv[1]) if l.strip()]
q = lambda s: "'" + s.replace("'", "''") + "'"
vals = ',\n'.join(f"({q(a)},{q(b)},{q(c)})" for a, b, c in linhas)
corpo = open('scripts/conferencia/impressao-digital.sql').read().strip().rstrip(';')
corpo = corpo.replace("\n)\nselect * from f union all", "\n), atual(tipo, objeto, h) as (select * from f union all", 1)
hoje = datetime.date.today().strftime('%d/%m/%Y')
open('scripts/conferencia/conferir-producao.sql', 'w').write(f"""-- SINO · conferência do banco de produção contra o repositório ({len(linhas)} definições das migrações, gerado em {hoje})
-- SÓ LEITURA: um único SELECT. Não cria, altera nem apaga nada.
-- Como usar: cole tudo no SQL Editor do Supabase e clique em Run.
-- Resultado vazio = produção igual ao repositório. Cada linha = um objeto que falta, sobra ou está diferente.
-- Funções de extensões ficam de fora. Para gerar de novo: scripts/conferencia/gerar.sh
{corpo}
), esperado(tipo, objeto, h) as (values
{vals}
)
select coalesce(e.tipo, a.tipo) as tipo,
       coalesce(e.objeto, a.objeto) as objeto,
       case when a.objeto is null then 'FALTA em produção (migração não rodou)'
            when e.objeto is null then 'SÓ em produção (criado à mão ou removido do repositório)'
            else 'DIFERENTE (versão antiga ou alterada à mão)' end as situacao
  from esperado e
  full join atual a on a.tipo = e.tipo and a.objeto = e.objeto
 where a.h is distinct from e.h
 order by 3, 1, 2;
""")
print(f"{len(linhas)} definições")
PY
# autoteste: no próprio banco do repositório a conferência volta vazia
n=$(psql "$URL" -X -t -A -f scripts/conferencia/conferir-producao.sql | grep -c . || true)
[[ "$n" == "0" ]] || { echo "autoteste falhou: $n diferenças no próprio banco"; exit 1; }
echo "ok: scripts/conferencia/conferir-producao.sql"
