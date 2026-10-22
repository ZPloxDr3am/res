# Decisões de arquitetura — RES

Registro curto de cada decisão, com o motivo. Referências `R-`, `B-`, `T-` apontam para o estudo do BeeFood (`re-beefood/`).

## D-001 Stack: Next.js + Supabase
- Postgres com Row Level Security para separar lojas, autenticação pronta e tempo real nativo (Realtime) para o quadro de pedidos.
- Motivo: o BeeFood atualiza o quadro por recarga a cada 90 s e um WebSocket próprio (R-018, R-019); o RES quer push em menos de 2 s (T-018) sem manter infraestrutura de WebSocket.

## D-002 Modelo multiloja: Loja → Marcas
- `lojas` é a empresa (uma cozinha, um CNPJ). `marcas` são os cardápios/marcas que vendem pela mesma cozinha (dark kitchen).
- Produtos, setores, grupos e complementos pertencem à loja; cada marca liga, desliga e precifica por canal (`produto_marcas`).
- Motivo: é como o restaurante piloto opera (3 marcas, uma cozinha).

## D-003 Regras de cadastro valem no banco e no formulário
- O banco recusa dados inválidos (check, trigger) e o formulário aplica a mesma regra antes de enviar.
- Motivo: no BeeFood o formulário aceitava valores que o servidor corrigia em silêncio (B-006, R-011).

## D-004 Auditoria calculada no servidor
- Trigger genérico grava quem, quando, tabela, linha e só as colunas que mudaram (antes/depois) em `auditoria`.
- Motivo: no BeeFood o "antes" vinha do navegador (B-001).

## D-005 Operações compostas são atômicas
- Criar produto já com as marcas, criar grupo já vinculado ao produto: uma função no banco, uma transação.
- Motivo: grupo órfão quando a segunda chamada falha (B-005, R-015).

## D-006 Gravar só em ação explícita
- Nenhuma tela grava ao abrir; telas de configuração usam versão (`atualizado_em`) para detectar edição simultânea.
- Motivo: abas do BeeFood regravam a configuração ao abrir (B-010, R-017).

## D-007 Texto em UTF-8 completo
- Postgres UTF8; teste com emoji em nomes.
- Motivo: o BeeFood troca emoji por "??" (B-002, R-006).

## D-008 Nenhum segredo de integração no navegador
- Tokens de pagamento, mapas, Meta, WhatsApp ficam em tabelas sem acesso pelo cliente e são usados só por funções do servidor.
- Motivo: B-009.

## D-009 Preço de itens com grupos (decisão provisória, Q-009)
- Formação de preço do grupo:
  - `soma`: soma de preço × quantidade das opções escolhidas.
  - `brinde`: opções sem preço.
  - `maior`: o maior preço entre as opções escolhidas (uma vez).
  - `proporcional`: cada opção vale preço × fração, fração = quantidade da opção ÷ total escolhido no grupo (pizza meio a meio de 40 e 50 = 45).
- Preço base do produto por canal: promocional (se houver) → preço do canal na marca → preço padrão do produto.
- A conferir contra o BeeFood na conta de teste (Q-009); a regra fica isolada em `packages/core/src/preco.ts`.

## D-010 Produto novo: ativo em todas as marcas e canais (paridade com R-008)
- Mantido por familiaridade do restaurante; a função de criação aceita uma lista de marcas para quem quiser restringir.

## D-011 Pedido agendado e taxa por bairro no painel
- Cada marca escolhe se aceita agendamento e com quantos dias à frente (0 a 7). O cliente escolhe um horário de 15 em 15 min, dentro do funcionamento, a partir de agora + tempo de preparo. Com a loja fechada (inclusive no "Fechar agora"), ele ainda pode agendar.
- Pedido agendado entra como "novo" e não passa pelo aceite automático: o quadro o guarda em "Agendados" e o traz para "Novo", com alerta, quando faltam tempo de preparo + 10 min. Assim a cozinha não vê como "em preparo" um pedido de amanhã.
- A equipe pode agendar pelo painel até 30 dias à frente, sem a regra de horário (ela sabe o que combinou com o cliente).
- No pedido do painel, entrega sem taxa digitada usa a taxa do bairro da marca (comparação sem maiúsculas e espaços); taxa digitada, inclusive zero, vence o cadastro.
- Regras no banco (`validar_agendamento`, `horarios_agendamento`, `taxa_bairro`) e no core (`faseAgendamento`, `taxaDoBairro`).

## D-012 Usuário de caixa: login por usuário e senha, sem e-mail
- A equipe do caixa nem sempre tem e-mail. Em *Lojas e equipe*, quem tem a permissão "equipe" cria a pessoa com **usuário + senha**; ela entra digitando só o usuário.
- No Auth do Supabase a conta usa um e-mail interno `<usuario>@equipe.res.invalid` (domínio reservado, nunca recebe e-mail), já confirmado. O login converte "usuário" nesse e-mail; quem digita um e-mail com @ entra como antes.
- Criar a conta e trocar a senha exigem a chave `service_role`, usada **só no servidor** (Server Action), depois de o banco confirmar a permissão (`posso`, `pode_gerir_usuario`). Nunca vai ao navegador nem como `NEXT_PUBLIC_*` (mantém D-008). Se o registro no banco falhar, a conta criada no Auth é apagada.
- O usuário fica em `usuarios_login` (único no sistema). Usuário de caixa não pode ser dono, e só a loja que o criou troca a senha dele.

## D-013 Caixa: sessão, venda ao concluir e fechamento cego
- Cada loja tem caixas (nasce com "Caixa 1") e define quem opera cada um; sem operadores marcados, qualquer pessoa com a permissão "caixa" opera. Dono e gerente operam todos. Um caixa só tem uma sessão aberta por vez.
- Abertura com troco contado por cédula/moeda (ou valor digitado). Sangria e suprimento só em dinheiro; sangria não passa do dinheiro esperado.
- O pedido entra no caixa quando é **concluído**: no caixa aberto que a pessoa que concluiu opera, senão no aberto mais antigo da loja. Concluído sem caixa aberto fica "fora do caixa" e pode ser trazido depois (últimas 24 h). Pago online aparece no relatório, mas fora da gaveta.
- **Fechamento cego**: quem só opera não vê vendas nem o esperado enquanto o caixa está aberto (nem lê os movimentos pela API); conta o dinheiro e informa os comprovantes, e só então vê sobra ou falta por forma. Gerente, relatórios e cadastro de caixas veem os valores o tempo todo.
- Alerta para caixa aberto há mais de 16 h (melhoria sobre o BeeFood, EV-014/EV-021).

## D-014 Impressão: fila no banco, regras como no BeeFood, navegador até o agente chegar
- Catálogo de modelos com a configuração homologada pelo Projeto ACBr (a mesma lista do BeeFood: Epson, Elgin, Bematech, Daruma, Tanca…, mais genéricas 80/58 mm). O dono escolhe o modelo e os parâmetros (comando, página de código, colunas, avanço) vêm prontos.
- Regras: por canal "ao aceitar" ou "só no botão"; destino por impressora única, por categoria ou por produto (produto vence a categoria); marketplace "tudo aqui" ou "só itens sem vínculo"; um cupom por impressora ou por categoria; via do pedido (caixa/entregador) com impressora própria e opção de imprimir ao aceitar.
- Cada cupom é uma linha em `impressoes` com o **snapshot** do pedido e do layout: mudar o cardápio depois não muda um cupom já gerado, e a 2ª via sai igual. Status pendente → impresso/erro, quem imprimiu (agente ou navegador), tentativas e histórico com reimpressão.
- Gatilho adiado para o fim da transação gera os cupons ao aceitar (o pedido é gravado antes dos itens). Gera uma vez só por pedido.
- O texto do cupom é montado no core (`montarCupom`), igual para o navegador (HTML monoespaçado no tamanho do papel) e para o agente (ESC/POS). Melhoria sobre o BeeFood: troco a levar impresso na via do pedido.
- Enquanto o agente do Windows (próxima entrega) não existe, o navegador imprime: botões 🖨 no pedido e "Imprimir aqui" para a fila. Quando uma impressora tiver agente ligado (sinal nos últimos 2 min), o navegador deixa o cupom para ele.

## D-015 Agente de impressão do Windows (RES Impressão)
- O navegador sempre mostra a janela de impressão; para imprimir sozinho é preciso um programa local. O RES Impressão é um `.exe` único (Node "single executable", gerado no GitHub Actions e publicado na release `agente-latest`), sem instalador e sem dependências.
- **Pareamento**: no painel, quem tem a permissão "impressoras" gera um código de uso único (8 caracteres, 10 minutos). O programa troca o código por um token (`/api/agente/parear`); o banco guarda só o hash. Sem login de pessoa e sem chave secreta no computador da loja: o agente usa a chave pública (anon) + o token, e todas as chamadas dele passam por funções que conferem o token.
- **Ciclo** a cada 3 s: `agente_sincronizar` (informa as impressoras do Windows e quais impressoras do RES alcança; recebe os cupons pendentes delas, já marcados "imprimindo", sem entregar o mesmo cupom a dois computadores) → imprime → `agente_resultado`. Cupom com erro volta até 3 tentativas; preso "imprimindo" por 2 min volta para a fila.
- **Impressão**: USB pelo spooler do Windows em modo RAW (bytes ESC/POS direto, sem o desenho do driver); rede por TCP 9100. Página de código 860/850/1252 convertida no agente. O cupom é o mesmo `montarCupom` do core.
- Abre junto com o Windows (chave Run do usuário, sem pedir administrador) a partir de `%LOCALAPPDATA%\RES Impressao`. Registro em `%APPDATA%\RES Impressao\agente.log`.
- O painel considera a impressora "ligada" se o agente deu sinal nela nos últimos 2 minutos; aí o navegador não imprime aquele cupom (fica para o agente).
