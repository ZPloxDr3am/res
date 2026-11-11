# Qualidade / testes

## Três níveis
| Nível | Quem/quando | Onde |
|---|---|---|
| **Automático** | O GitHub roda a cada PR: regras (core), banco (migrações + testes) e build do app | `packages/*/test`, `supabase/tests/` |
| **Revisão do PR** | A outra pessoa testa o critério de aceite na prévia da Vercel | No PR |
| **Roteiro manual** | Toda sexta, os roteiros dos módulos que mudaram; antes de cliente novo, todos | `roteiros/` → resultado em `relatorios/` |

## Como registrar uma rodada de testes
1. Copie o roteiro do módulo (`roteiros/<modulo>.md`) para `relatorios/AAAA-MM-DD-<modulo>.md`.
2. Marque cada passo: ✅ passou · ❌ falhou (abra Issue "Bug" e cole o número) · ⏭️ não testado.
3. No topo: quem testou, aparelho (celular/computador), loja usada.
4. Abra um PR só com o relatório (`teste/…`) ou suba direto pelo GitHub.

## Bug
Issue com o modelo **Bug**: passos para repetir, o que aconteceu, o que deveria acontecer, print, gravidade.
- `grav:alta` — impede vender ou perde dinheiro/dados → corrigir no mesmo dia
- `grav:media` — atrapalha, tem contorno → nesta semana
- `grav:baixa` — visual/texto → quando der

## Roteiros
- [Modelo](roteiros/MODELO.md)
- [Estoque e CMV](roteiros/estoque-cmv.md)
