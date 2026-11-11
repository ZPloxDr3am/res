## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

### RES: como usamos o graphify (pedido do dono, 28/10/2026)

- O dono pediu que **todo pedido neste projeto parta do mapa**: antes de ler código, consulte `graphify query` / `path` / `explain`; depois de mudar código, rode `graphify update .` e faça commit do `graphify-out/` junto com a mudança.
- **Sessão nova sem graphify instalado** (o ambiente na nuvem é temporário):
  ```bash
  NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 uv tool install "graphifyy[sql]"   # [sql] é obrigatório: as migrações são o coração do sistema
  export PATH="$HOME/.local/bin:$PATH"
  graphify hook install   # reconstrói o mapa a cada commit (só o código, sem custo)
  ```
  O `NO_PROXY` faz o uv passar pelo proxy da sessão (o acesso ao PyPI foi liberado nas Capacidades da conta).
- **Ponto cego conhecido:** o mapa não liga `supabase.rpc('nome_da_funcao')` do TypeScript à função SQL de mesmo nome, nem o agente de impressão ao banco. Para esses caminhos, procure o nome da função em `supabase/migrations` (vale a versão mais recente: cada migração que recria a função vira um nó separado).
- Documentos (`README.md`, `docs/decisoes.md`) entram no mapa por leitura com IA. Quando mudarem bastante, rode `/graphify . --update` (gasta tokens); o hook de commit só atualiza o código.
- O `graph.html` (mapa interativo) não vai para o repositório: gere com `graphify export html` quando precisar ver.
