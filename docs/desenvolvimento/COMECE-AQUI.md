# Comece aqui (primeiro dia)

## 1. Acessos (o Emmanuel libera)
| Onde | Como | Para quê |
|---|---|---|
| GitHub `ZPloxDr3am/res` | Convite (Admin) para `CriadorHugo` → aceitar no e-mail ou em github.com/ZPloxDr3am/res/invitations | Código, Issues, PRs, documentos |
| Supabase (organização REA BBEEFF) | Organization → Team → Invite | Rodar migrações do seu módulo no SQL Editor |
| Painel do RES | Lojas e equipe → novo usuário (função **Gerente**) | Testar como usuário |
| Vercel | Plano Hobby não tem equipe: você usa as **prévias** dos PRs; a publicação acontece no merge | — |

Nunca peça nem mande senha/chave por mensagem: cada um entra com a própria conta.

## 2. Instalar e rodar
```bash
git clone https://github.com/ZPloxDr3am/res.git && cd res
npm install
npm test                 # regras (core) e agente
npm run test:db          # banco (precisa do PostgreSQL 16)
cp apps/web/.env.example apps/web/.env.local   # URL e chave anon do Supabase (peça no grupo, nunca no Git)
npm run dev              # painel em http://localhost:3000
```

## 3. Abrir no Claude
1. Abra a pasta `res` no Claude Code (o seu, plano Max).
2. O `CLAUDE.md` já ensina o Claude: mapa do código (graphify), este método, onde ficam as decisões.
3. Primeira mensagem sugerida: *"Leia CLAUDE.md, docs/README.md, docs/desenvolvimento/METODO.md e MODULOS.md. Me resuma a arquitetura e os módulos que são meus."*

## 4. Ler, nesta ordem (≈ 40 min)
1. [METODO.md](METODO.md) — como trabalhamos
2. [MODULOS.md](MODULOS.md) — o que é seu
3. [`../decisoes.md`](../decisoes.md) — passe os olhos do D-001 ao último (o porquê de cada coisa)
4. [ROADMAP.md](ROADMAP.md) — o que vem
5. [Comercial → Funcionalidades](../comercial/FUNCIONALIDADES.md) — o que o sistema já faz, do ponto de vista do cliente

## 5. Primeira tarefa
Pegue uma Issue com a etiqueta `primeira-tarefa` (pequena, do seu módulo), faça o fluxo inteiro (branch → PR → revisão → merge) e confira que tudo funciona para você.
