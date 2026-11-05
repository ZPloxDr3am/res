# Método de trabalho do RES (duas pessoas + o Claude de cada uma)

Versão 1 · 05/11/2026 · vale para tudo o que muda no repositório. Quem mudar o método, muda aqui (por PR).

## 1. Princípios

1. **Tudo passa pelo GitHub.** Ideia vira Issue, trabalho vira branch, entrega vira PR. Nada vai direto na `main`.
2. **Cada módulo tem um dono** ([MODULOS.md](MODULOS.md)). O dono decide e publica o que é da área dele; o outro revisa.
3. **Nada entra sem a revisão do outro.** Todo PR é revisado pela outra pessoa (revisão cruzada), mesmo que o Claude tenha feito.
4. **Pequeno e frequente.** Um PR = uma coisa que dá para testar. Melhor 3 PRs de 1 dia do que 1 de 1 semana.
5. **O banco é de todos.** Migração em produção é o momento mais arriscado: segue a regra da seção 6, sempre.
6. **Escreveu, documentou.** Toda mudança de comportamento ganha uma decisão em `docs/decisoes.md` e, se o cliente percebe, uma linha em `docs/comercial/NOVIDADES.md`.

## 2. A semana (ciclo de 1 semana)

| Quando | O quê | Quanto tempo |
|---|---|---|
| **Segunda, início do dia** | **Planejamento**: escolhemos no [ROADMAP](ROADMAP.md) o que entra na semana, criamos/atualizamos as Issues e colocamos no **marco da semana** (ex.: `2026-S45`). Cada Issue tem dono. | 30 min |
| **Todo dia** | **Recado do dia** (escrito, no grupo de vocês): o que fiz ontem · o que faço hoje · onde estou travado. Se for mexer em algo **compartilhado**, avisa antes. | 2 min |
| **Durante a semana** | Constrói, abre PR, revisa o PR do outro **no mesmo dia** (no máximo 24 h). | — |
| **Sexta, fim do dia** | **Revisão**: mostramos um ao outro o que foi ao ar, rodamos o roteiro de testes da semana ([Qualidade](../qualidade/README.md)), fechamos o marco e escrevemos as **Novidades** da semana. O que não terminou volta para o próximo marco. | 45 min |

## 3. Fluxo de uma tarefa

```
Ideia / pedido / bug
   │  Issue (modelo "Funcionalidade" ou "Bug") com dono, módulo e marco
   ▼
A fazer ──► Fazendo ──► Em revisão ──► Testando ──► No ar
            (branch)    (PR aberto)    (preview /   (merge + migração
                                        teste)       + publicação + teste no ar)
```

1. **Issue** — título no imperativo ("Agendar pedido por turno"), o que o usuário ganha, critérios de aceite (como saber que ficou pronto), módulo (etiqueta `mod:`), dono.
2. **Branch** — a partir da `main` atualizada: `tipo/numero-assunto`
   - tipos: `func/` (funcionalidade), `ajuste/` (melhoria pequena), `bug/`, `docs/`, `teste/`
   - exemplo: `func/112-agendamento-turno`
3. **Commits** — em português, no imperativo, curtos ("Agendamento por turno no cardápio"). O Claude inclui as linhas de autoria dele.
4. **PR** — usa o modelo (checklist). No texto: `Fecha #112`. Liga a Issue ao PR.
5. **CI verde** — os 3 testes do GitHub (Regras, Banco, App web) precisam passar. Vermelho não se revisa.
6. **Revisão** — a outra pessoa abre a prévia da Vercel, testa o critério de aceite e aprova ou pede ajuste.
7. **Migração** (se houver) — regra da seção 6.
8. **Merge** — pelo dono do módulo, **squash** (um commit por PR na `main`). A Vercel publica sozinha.
9. **Teste no ar** — quem fez o merge abre o site em produção e confere em 1 minuto. Se quebrou: reverte o PR na hora (botão "Revert" do GitHub) e investiga depois.

### Definição de pronto (vale para todo PR)

- [ ] Critério de aceite da Issue atendido
- [ ] Testes do banco para regra nova (`supabase/tests/`), quando houver SQL
- [ ] CI verde
- [ ] Funciona no **celular** (o app RES abre o site) e no computador
- [ ] Decisão em `docs/decisoes.md` (D-xxx) se mudou comportamento
- [ ] Linha em `docs/comercial/NOVIDADES.md` se o cliente percebe
- [ ] Roteiro de teste do módulo atualizado, se o fluxo mudou
- [ ] `graphify update .` rodado e `graphify-out/` no PR

## 4. Quem pode o quê

| Ação | Quem |
|---|---|
| Criar Issue, abrir PR | Qualquer um |
| Aprovar PR | **Sempre o outro** (nunca o próprio autor) |
| Fazer merge e publicar | **Dono do módulo** (ver MODULOS.md). Compartilhado: os dois aprovam, qualquer um faz o merge |
| Rodar migração em produção (SQL Editor) | Dono do módulo, avisando antes no grupo |
| Mudar plano/limite de cliente, segredos, Vercel, Supabase (configurações) | Só o titular das contas (Emmanuel) |
| Senhas e chaves | **Nunca** em Issue, PR, chat ou código. Cada um usa o próprio login |

## 5. Para os dois não se atropelarem

- **Antes de começar o dia:** `git checkout main && git pull`, depois o branch da tarefa (`git rebase main` se ele já existia).
- **Arquivos quentes** (todo mundo mexe): `apps/web/app/globals.css`, `components/nav-painel.tsx`, `components/quadro-pedidos.tsx`, `lib/loja.ts`, `packages/core/src/index.ts`, `docs/decisoes.md`. Mexa no **fim** do arquivo quando possível e faça PRs curtos; avise no recado do dia.
- **Funções SQL compartilhadas** (`criar_pedido_publico`, `mudar_status_pedido`, `aplicar_cupom`, `marca_aberta`, `pedidos` e permissões): só uma pessoa por vez. Quem for mudar, avisa e pega a vez ("estou com a criar_pedido_publico até quinta").
- **Conflito no PR:** quem abriu o PR por último resolve (rebase na `main`).
- **Decisões (D-xxx):** escreva no fim do `docs/decisoes.md` com o próximo número livre **na hora do merge**; se o outro usou o mesmo número antes, renumere no rebase.

## 6. Banco: migrações sem acidente

1. **Nome do arquivo com data e hora** de quando você criou, para nunca repetir: `supabase/migrations/AAAAMMDDHHMMSS_assunto.sql` (ex.: `20261105143000_agendamento_turno.sql`). Fica em ordem depois das antigas (`…000068`).
2. **Pode rodar de novo**: `create … if not exists`, `create or replace`, `drop … if exists` antes de recriar gatilho/política. Escreva na primeira linha: `-- … Pode rodar de novo.`
3. **Teste no banco local** (`bash scripts/test-db.sh --local`) com um teste novo em `supabase/tests/`.
4. **Função que outra migração recriou:** copie **sempre a versão mais recente** (procure o nome em `supabase/migrations`, a última vale). Nunca a de uma migração antiga.
5. **Ordem em produção:** uma migração por vez, **antes** do merge do código que depende dela:
   1. PR aprovado e CI verde;
   2. avisa no grupo "vou rodar a 2026…_assunto";
   3. cola no SQL Editor do Supabase e clica **Run** (uma vez);
   4. confere se deu "Success";
   5. faz o merge.
6. Se a migração **falhar no meio**: não rode a próxima; avise, corrija com um arquivo novo (não edite o que já rodou).
7. Registro: o PR diz "Migração: …_assunto · rodada em DD/MM por Fulano".

## 7. Publicação e versões

- `main` = **produção** (https://res-iqzs.vercel.app). Cada merge publica em ~1 minuto.
- Cada PR tem **prévia** da Vercel para revisar.
- Toda sexta, depois da revisão, criamos uma **tag** da semana (`v2026.45`) com as novidades (Releases do GitHub). É o histórico que o Comercial usa.
- Apps Android (motoboy e gestão) só são gerados de novo quando muda `apps-mobile/`. Eles abrem o site: o resto chega sozinho.

## 8. Qualidade

- Cada módulo tem um **roteiro de teste** em `docs/qualidade/roteiros/` (passo a passo, resultado esperado).
- Toda sexta roda-se o roteiro do que mudou na semana; o resultado vira um **relatório** em `docs/qualidade/relatorios/AAAA-MM-DD-modulo.md`.
- Bug encontrado vira **Issue "Bug"** (modelo pronto) com passos para repetir, print e gravidade (`grav:alta/media/baixa`). Bug de gravidade alta passa na frente de tudo.

## 9. Trabalhando com o Claude

- Cada um usa o **próprio Claude** (Claude Code) no repositório clonado. O `CLAUDE.md` faz os dois seguirem as mesmas regras (mapa do graphify, este método).
- Comece a conversa com o Claude assim: *"Leia docs/desenvolvimento/METODO.md e a Issue #112. Faça no branch func/112-…, abra o PR com o modelo e não faça merge."*
- O Claude **não** roda migração em produção, não faz merge na `main` e não mexe em segredo/configuração de conta: isso é da pessoa (seção 4).
- Revisão do PR do outro: pode pedir ao seu Claude "revise o PR #120 contra o METODO e a Issue", mas a aprovação é sua.

## 10. Etiquetas (labels) das Issues

| Grupo | Etiquetas |
|---|---|
| Tipo | `tipo:funcionalidade`, `tipo:ajuste`, `tipo:bug`, `tipo:teste`, `tipo:docs` |
| Módulo | `mod:pedidos`, `mod:delivery`, `mod:cardapio`, `mod:salao`, `mod:estoque`, `mod:financeiro`, `mod:gestao`, `mod:relatorios`, `mod:clientes`, `mod:entregas`, `mod:impressao`, `mod:apps`, `mod:integracoes`, `mod:base` |
| Gravidade (bug) | `grav:alta`, `grav:media`, `grav:baixa` |
| Situação | `precisa-migracao`, `bloqueado`, `comercial` (vira novidade/material de venda) |
