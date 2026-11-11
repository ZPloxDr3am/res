## O que muda
<!-- Uma ou duas frases, do ponto de vista de quem usa. -->

Fecha #

## Como testar (critério de aceite)
1.

## Checklist (docs/desenvolvimento/METODO.md §3)
- [ ] CI verde (Regras, Banco, App web)
- [ ] Testado no celular e no computador (prévia da Vercel)
- [ ] Teste do banco para regra nova (se tem SQL)
- [ ] Decisão em `docs/decisoes.md` (D-xxx), se mudou comportamento
- [ ] Linha em `docs/comercial/NOVIDADES.md`, se o cliente percebe
- [ ] Roteiro de teste atualizado, se o fluxo mudou
- [ ] `graphify update .` e `graphify-out/` no PR

## Migração
- [ ] Não tem
- [ ] Tem: `supabase/migrations/…` · pode rodar de novo · **rodada em __/__ por ____** (antes do merge)

## Módulo e revisão
Módulo: `mod:` · Quem está com a frente faz o merge · Revisor: o outro
