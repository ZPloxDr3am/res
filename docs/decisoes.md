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

## D-016 Impressora do grupo de lojas
- Lojas da mesma conta dividem a cozinha e as impressoras. A impressora cadastrada em qualquer loja vale para todas as lojas do grupo: aparece na lista de todas, pode ser usada nas regras de qualquer uma e é editada de qualquer uma (por quem tem a permissão "impressoras" em alguma loja do grupo). Nome único dentro do grupo.
- Ao cadastrar (ou reativar) uma impressora, toda loja do grupo **sem regra ou sem impressora padrão** passa a usá-la como padrão ("uma impressora só"): já sai imprimindo, sem configurar loja por loja. Loja que já tinha impressora padrão não muda.
- O computador com o RES Impressão, pareado em qualquer loja, atende os cupons de todas as lojas do grupo. Outra conta não vê nem usa.
- As regras por categoria/produto e o layout continuam de cada loja/marca (as categorias são de cada loja).

## D-017 App do motoboy com despacho pelo QR da comanda
- Ideia trazida do módulo de entregas do REA-BBEEFF (QR na comanda, despacho pelo motoboy logado), refeita sobre o banco do RES.
- Cada pedido tem um código secreto (`qr_token`). A via do pedido de **entrega** sai com um QR (nativo da impressora no agente; SVG no navegador) que aponta para `/m/d/<código>`.
- Motoboy = membro com a função "Entregador", criado com usuário e senha (como o caixa). Ao entrar, cai direto no app `/m` (celular, botões grandes, pode ser instalado na tela inicial). Atende as lojas do grupo.
- Ler o QR (câmera do celular ou o leitor do app) despacha na hora: o pedido vai para "Saiu para entrega" com o nome do motoboy, aparece no quadro em tempo real, e as etapas puladas ficam no histórico. Ler de novo não duplica; outro motoboy não pega o mesmo pedido.
- No celular: COBRAR (vermelho, valor, forma, troco a levar) ou PAGO — NÃO COBRAR (verde, só "Pago online"); endereço grande com bairro e referência; Google Maps/Waze já com a rota; ligar e WhatsApp; "Entregue" conclui o pedido (e ele entra no caixa aberto). Resumo do dia: entregas, dinheiro a prestar contas, cartão/Pix na porta, taxas.
- A cidade da loja (Lojas e equipe) completa o endereço do mapa.
- O RES Impressão passa a se atualizar sozinho (versão nova publicada no GitHub → baixa, troca e reabre).

## D-018 Comanda do motoboy completa e "já pago"
- O QR do motoboy sai também na **via da cozinha** dos pedidos de entrega (muitas lojas imprimem só ela), com o número, o bairro e, em letra grande, **COBRAR R$ X** (forma e troco a levar) ou **PAGO - NÃO COBRAR**. Dá para desligar no layout do cupom ("QR do motoboy").
- O pedido pode ser **marcado como pago** no quadro (ex.: Pix recebido antes). Aí o celular do motoboy mostra PAGO — NÃO COBRAR e o valor não entra no "a prestar contas" do dia dele. Pago online já conta como pago. Fica no histórico do pedido.
- RES Impressão 1.2.0 (a partir da 1.1.0 ele se atualiza sozinho).

## D-019 App RES Motoboy (Android) e leitor de QR em qualquer navegador
- O leitor de QR do `/m` usava só o leitor nativo do Chrome (BarcodeDetector) e falhava no iPhone, no Samsung Internet e em outros navegadores. Agora, sem leitor nativo, ele decodifica os quadros da câmera na própria página (jsQR, carregado só quando precisa).
- App Android **RES Motoboy** (`apps-mobile/motoboy`, Capacitor): abre `/m` com a câmera liberada e o login guardado; ícone próprio; Maps, ligar e WhatsApp abrem nos apps do celular. O app só carrega o site, então melhorias no RES aparecem sem novo APK.
- O APK é gerado pelo GitHub Actions (`motoboy-app.yml`) e publicado na release `motoboy-latest`; instalação fora da Play Store ("instalar apps desconhecidos"). Assinatura fixa depende dos segredos `MOTOBOY_KEYSTORE_B64`/`MOTOBOY_KEYSTORE_PASS` (o agente desta sessão não consegue cadastrá-los); sem eles, cada build usa uma chave nova.
- iPhone: sem App Store por ora (exige conta de desenvolvedor Apple); usa o site no Safari, "Adicionar à Tela de Início", com o leitor novo.

## D-020 Km da entrega, valor do motoboy por bairro e fechamento da noite
- Bairros e preços saem da tela Delivery e vão para **Entregas → Bairros e preços**, com as lojas do grupo em abas (uma tabela por cardápio, com "copiar tabela de…"). Cada bairro tem a **taxa do cliente**, o **valor do motoboy** (vazio = igual à taxa) e o **km de referência** da loja até o bairro.
- A loja tem endereço e coordenadas (achadas no mapa ou coladas do Google Maps). O km do bairro é medido pela rua (OSRM) até o centro do bairro (Nominatim/OpenStreetMap). Os dois serviços são gratuitos e têm limite de uso, então a tela mede um bairro por segundo e sempre dá para digitar o km.
- Ao ler o QR, o pedido grava o valor do motoboy (do bairro; bairro fora da tabela = taxa do pedido) e o km do bairro. O app do motoboy mede em seguida a rota até o endereço exato e troca o km (`registrar_distancia`). Km ajustado à mão não é sobrescrito.
- O turno vai das 05:00 às 05:00 (a madrugada conta na noite anterior). **Fechamento dos motoboys**: por motoboy, as entregas, os km, quanto ele recebe, o dinheiro em mãos, o cartão/Pix na porta e o **acerto** (dinheiro − valor das entregas). Quem é gestor ou tem caixa pode **ajustar** o valor ou o km de uma entrega; o ajuste fica no histórico do pedido.
- Fica para depois: taxa por faixa de km para endereço fora da lista, e uma chave paga (Google) se o OpenStreetMap não achar bem as ruas da cidade.

## D-021 Cardápio novo: cards com foto e promoção De/Por com agenda
- A tela Cardápio vira uma grade de cards com foto grande: arrastar a foto em cima do card (ou clicar) já envia. O navegador diminui a foto (até 1200 px, JPEG) antes de mandar, então foto do celular funciona. "À venda / Pausado" fica no card; canais, ordem, duplicar e excluir ficam no menu "⋯". As categorias viram botões no topo.
- A promoção De/Por usa o `preco_promocional` que já existia e ganha uma agenda: dias da semana, horário (pode passar da meia-noite; a madrugada conta no dia em que a promoção começou) e último dia. `private.promo_vigente` decide no banco (preço do item e cardápio público com o preço riscado); `promoVale` (core) faz a mesma conta na tela. Os dois usam os mesmos casos de teste.
- A promoção vale para todas as marcas (cardápios) do produto. As cópias (duplicar, importar, compartilhar catálogo) levam a agenda junto.
- Próximas fases: combos com escolhas e categoria de up-sell ("Peça também"); depois % por categoria, cupons (com contagem de clientes e usos) e desconto no balcão com limite.

## D-022 Combos com escolhas e categoria de up-sell
- O combo é um produto marcado como combo (preço, foto, categoria, promoção e cópia funcionam igual) com "passos": em cada passo o cliente escolhe um dos produtos permitidos (lista ou uma categoria inteira) e monta normalmente (sabores, borda).
- Preço = preço do combo + o que cada escolha cobra além do preço base dela (sabor mais caro, borda). `private.preco_combo` no banco e `calcularCombo` no core usam os mesmos casos de teste.
- No pedido o combo é um item só; as escolhas viram linhas de opção ("Pizza: Pizza Gigante", "Pizza Gigante · Sabores: Calabresa") e a comanda já imprime. Como a impressão por categoria usa a categoria do item, o combo sai na impressora da categoria do combo (ou na padrão).
- Combos não vêm no "Importar de outra loja", porque as escolhas apontam para produtos daquela loja. Duplicar um combo copia as escolhas.
- Categoria de up-sell (marcada na própria categoria): o cardápio digital mostra "Peça também" no carrinho, com produtos dessas categorias que ainda não estão no pedido, e o pedido do balcão mostra "Ofereça também".

## D-023 % por categoria, cupons e desconto no balcão com limite
- Tela **Promoções** com 4 abas: promoção no produto (lista; edição no Cardápio), % numa categoria, cupons e desconto no balcão.
- **% na categoria**: tem a mesma agenda da promoção do produto e vale sobre o preço normal do canal. Se o produto já tem promoção própria valendo, fica o menor preço. `private.preco_base` (banco) e `precoBase` (core) fazem a conta. Pizza com preço só nos sabores (base 0) não recebe o %.
- **Cupons** são por loja, com opção de criar o mesmo cupom nas outras lojas do grupo. Tipos: % do pedido, R$ fixo ou entrega grátis. Regras: pedido mínimo, primeira compra (pelo telefone), vezes por cliente, total de usos, dias e validade. O cardápio digital confere antes (`validar_cupom`) e o banco recalcula ao gravar (`aplicar_cupom`); no cardápio digital o troco é conferido depois do cupom. A tela conta clientes distintos (telefone), usos e desconto dado, sem os pedidos cancelados, e mostra quem usou.
- **Desconto no balcão** sempre pede motivo. Quem não é dono/gerente tem o limite da loja (`lojas.limite_desconto_pct`). Acima dele, um gerente digita usuário e senha numa sessão à parte, que não troca quem está logado, e isso gera uma autorização de uso único válida por 10 minutos. O pedido grava quem autorizou.

## D-024 Comanda do combo em blocos
- Na comanda (cozinha e via do pedido) e no quadro, o combo sai sempre no mesmo formato, um bloco por escolha:
  `> PIZZA GIGANTE 40CM` com os sabores embaixo, `> PIZZA BROTO 25CM` com o sabor, `> REFRIGERANTE 2L` com `- Kuat 2 litros`. Produto com sabores ou adicionais usa o nome do produto como título; produto simples usa o título da escolha.
- `pedido_item_opcoes.ordem` guarda a ordem escolhida. Antes a comanda ordenava pelo id, que é aleatório. `dados_cupom` marca as linhas de passo (`passo`).
- O agente de impressão monta o cupom com o core, por isso sobe para a versão **1.3.0**, que se atualiza sozinha.
