# Roteiro — Financeiro automático: extrato, boleto e Bom dia (D-105)

## Extrato do banco
1. Como dono, **Financeiro → Extrato do banco**. Escolha a conta (ex.: "Banco") e suba um OFX exportado do banco. Aparece a prévia: período, quantos lançamentos (saídas/entradas) e o saldo. **Importar** → "N lançamentos novos".
2. Suba o mesmo arquivo de novo → "0 novos · N já estavam importados".
3. Arquivo que não é OFX (CSV, PDF) → mensagem pedindo o OFX.
4. Crie antes uma despesa com o mesmo valor de uma saída do extrato e vencimento perto da data → a linha mostra "Pagou <conta>" e o botão **✓ Confirmar as sugestões** conta 1. Confirme → a conta fica paga na data do banco (Contas a pagar mostra "Pago").
5. Numa saída sem sugestão: **Dar baixa numa conta a pagar** → escolha uma conta de valor diferente → aviso de que fica o valor do banco; confirme → a conta fica com o valor do banco e a observação "valor original R$ …".
6. **Lançar como despesa** (tarifa) com categoria → aparece paga em Contas a pagar e no DRE.
7. Numa entrada da maquininha: **É venda (já está no RES)** → vai para Conferidos como "Venda", sem lançamento.
8. Em **Conferidos**, **Desfazer** cada uma: a baixa volta a ficar em aberto; o lançamento da tarifa some; a venda volta para conferir.
9. Como funcionário (caixa), o Financeiro continua bloqueado.

## Boleto
1. **Financeiro → Contas a pagar → ▦ Boleto**. Cole uma linha digitável real (com pontos e espaços) → **Ler boleto** → aparecem banco, valor e vencimento. **Continuar** → a despesa abre preenchida (forma Boleto, linha na observação). Salve.
2. Leia o mesmo boleto de novo → aviso "já foi lançado".
3. Troque um número da linha → "não confere".
4. Conta de luz/água (48 números) → valor e "Energia ou gás"/"Água e esgoto".
5. No celular (Chrome Android), **📷 Usar a câmera** no código de barras do boleto impresso.

## Bom dia
1. **Resumo** (Hoje), como dono: cartão "☀️ Bom dia! Ontem (dia): R$ … em N pedidos", % contra a semana passada e a lista do que vence/está pendente, cada item levando à tela certa.
2. **Mandar no meu WhatsApp** abre o WhatsApp com a mensagem pronta.
3. Período "Ontem"/"7 dias" → o cartão não aparece. Como funcionário → não aparece.
