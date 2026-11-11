#!/usr/bin/env bash
# Cria/atualiza as etiquetas (labels) do método (docs/desenvolvimento/METODO.md §10) e o marco da semana.
# Uso: bash scripts/github-etiquetas.sh   (precisa do gh logado com acesso ao repositório)
set -euo pipefail
R=${REPO:-ZPloxDr3am/res}
et() { gh label create "$1" --repo "$R" --color "$2" --description "$3" --force >/dev/null && echo "ok $1"; }
et tipo:funcionalidade 1d76db "Algo novo ou melhoria"
et tipo:ajuste c5def5 "Melhoria pequena"
et tipo:bug d73a4a "Não funciona como deveria"
et tipo:teste 0e8a16 "Rodada de testes"
et tipo:docs 0075ca "Documentação"
for m in pedidos delivery cardapio salao estoque financeiro gestao relatorios clientes entregas impressao apps integracoes base; do et "mod:$m" ededed "Módulo $m"; done
et grav:alta b60205 "Impede vender ou perde dinheiro/dados"
et grav:media fbca04 "Atrapalha, tem contorno"
et grav:baixa fef2c0 "Visual ou texto"
et precisa-migracao 5319e7 "Tem migração para rodar antes do merge"
et bloqueado 000000 "Esperando algo"
et comercial f9d0c4 "Vira novidade/material de venda"
et primeira-tarefa 7057ff "Boa para quem está chegando"
# marco da semana (segunda a sexta)
S=$(date +%G-S%V); FIM=$(date -d "friday" +%Y-%m-%dT23:59:59Z)
gh api "repos/$R/milestones" -f title="$S" -f due_on="$FIM" -f description="Semana $S (planejamento na segunda, revisão na sexta)" >/dev/null 2>&1 && echo "ok marco $S" || echo "marco $S já existe"
