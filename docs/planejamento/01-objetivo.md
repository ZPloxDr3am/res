# Objetivo

## Onde queremos chegar

Um sistema que **recebe os pedidos de todos os canais de venda** (iFood, Delivery Much, Aiqfome, cardápio digital próprio, balcão/WhatsApp e, depois, salão), **centraliza tudo em um só quadro e uma só cozinha** e deixa o dono do restaurante **alterar qualquer coisa de um lugar só** — cardápio, preços, horários, pausa, promoções — refletindo em todos os canais.

Em outras palavras: o restaurante deixa de ter um tablet por aplicativo e passa a operar tudo pelo RES.

## O que já temos (resumo)

O RES já é um sistema de gestão completo para o canal próprio: cardápio digital com Pix automático (Mercado Pago), quadro de pedidos em tempo real, impressão automática (agente Windows), caixa com fechamento cego, motoboy com app, rastreio e rota, clientes, cupons, fidelidade, estoque com NF-e e CMV, financeiro com DRE, gestão empresarial, relatórios e apps Android. Está no ar em piloto (https://res-iqzs.vercel.app). Detalhe em `02-estado-atual.md`.

**O que ainda não existe é exatamente o coração do objetivo: nenhuma integração com marketplace foi feita.** A tela Aplicativos lista "outros marketplaces" como "Em breve" e o iFood foi adiado em 28/10 ("lembrar quando o projeto estiver avançado"). O projeto já está avançado o bastante — é hora de lembrar.

## Ordem sugerida das frentes

1. **Estabilizar o piloto** com restaurante real usando o canal próprio (pega os problemas de operação antes de somar canais).
2. **iFood** — maior volume, API pública e documentada, define o modelo do "pedido externo" que os outros reaproveitam.
3. **Aiqfome e Delivery Much** — reaproveitando o modelo do iFood.
4. **Sincronia do cardápio para fora** (alterar no RES e refletir nos apps) — só depois que receber pedidos estiver estável.
5. **Salão (mesas/comandas/PDV), WhatsApp oficial, fiscal (NFC-e)** — frentes já previstas no README, independentes dos marketplaces.

A ordem está em discussão aberta em `05-decisoes-abertas.md` (Q-1).
