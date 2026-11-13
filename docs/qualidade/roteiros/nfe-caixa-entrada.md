# Roteiro — Caixa de entrada de NF-e pela SEFAZ (D-102)

Pré: loja com CNPJ e UF cadastrados, o **certificado A1 (e-CNPJ) da empresa** (.pfx) e a senha, e pelo menos uma nota de compra emitida para esse CNPJ nos últimos dias.

1. **Estoque → Entrada por NF-e**: aparece o quadro "📥 Receber as notas de compra automaticamente". Usuário funcionário vê "Peça ao dono ou ao gerente".
2. Como dono, escolha o .pfx e digite a senha **errada** → "Senha do certificado incorreta". Um e-CPF → "não é de empresa (e-CNPJ)". Certificado de outro CNPJ → "não é o desta loja".
3. Com o certificado certo → "Certificado de … salvo (válido até …). Primeira busca: N nota(s) nova(s) · ciência enviada em N…". A senha some do campo.
4. A lista mostra as notas com fornecedor, emissão e valor. As novas ficam "Pedimos o XML à SEFAZ: chega em até 1 hora".
5. **Buscar agora** logo em seguida → avisa o horário a partir do qual a SEFAZ permite nova busca (regra de 1 hora), sem erro.
6. Depois de ~1 hora (ou na próxima busca automática), as notas ficam "Pronta para dar entrada". **Dar entrada** abre a mesma conferência do arquivo XML (itens, vínculos, fator). Confirme → a nota sai da lista e aparece em "Notas importadas".
7. Importe pelo arquivo uma nota que também está na lista → ela sai da lista de pendentes (vira "Já deu entrada").
8. **Ignorar** uma nota → some da lista; "Ver também as … já lançadas ou ignoradas" → **Voltar** a traz de novo.
9. **Trocar certificado** e **Desconectar** (dono/gerente). Depois de desconectar, o quadro de conectar volta e a busca automática para.
10. Certificado a menos de 30 dias de vencer → aviso amarelo; vencido → aviso vermelho e a busca para.

## Um certificado para tudo (D-106)
1. Com duas lojas do mesmo CNPJ raiz (matriz e filial, CNPJ cadastrado em Dados da empresa), conecte o certificado numa delas.
2. Nela aparece "🔑 Este certificado também serve para <filial>" → **Usar lá também** → mensagem "Certificado ligado em 1 loja".
3. Troque para a filial → Entrada por NF-e já mostra o certificado ("usado também em 1 loja") e começa a buscar as notas do CNPJ dela.
4. Numa filial ainda sem certificado, o botão é "Usar o certificado da <matriz>".
5. Renove (Trocar certificado) na matriz → a validade nova aparece também na filial.
6. Desconecte a matriz → a filial continua buscando. Loja de outro CNPJ não aparece na lista.
