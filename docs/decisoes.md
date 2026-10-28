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
- Na via da cozinha de entrega, junto do QR do motoboy, sai o endereço por extenso (rua, número, complemento, bairro e cidade, referência), mais o cliente e o telefone. A via do pedido já traz o endereço no topo, então não repete.
- `pedido_item_opcoes.ordem` guarda a ordem escolhida. Antes a comanda ordenava pelo id, que é aleatório. `dados_cupom` marca as linhas de passo (`passo`).
- O agente de impressão monta o cupom com o core, por isso sobe para a versão **1.3.0**, que se atualiza sozinha.

## D-025 Cadastro de clientes
- Os clientes são do **grupo** (lojas da mesma conta), um por telefone. Todo pedido com telefone, do balcão ou do cardápio digital, salva ou atualiza o cliente (fica o nome mais recente) e, se for entrega, o endereço. Um cliente pode ter vários endereços; o usado por último vem primeiro. Isso é feito pelo gatilho `pedidos_registra_cliente`.
- Pedido sem telefone não entra no cadastro, porque não dá para saber quem é. Os pedidos antigos com telefone entraram no cadastro na migração 0025.
- No novo pedido, ao digitar o telefone (4+ dígitos) ou o nome (2+ letras), aparecem os clientes; escolher um preenche nome, telefone e endereço e mostra histórico, outros endereços e as **observações do cliente** (editáveis ali mesmo).
- Tela **Clientes**: busca, editar nome e observações, tirar endereços antigos.
- O cardápio digital não busca dados por telefone, porque qualquer pessoa poderia ver o endereço dos outros. Lá o próprio aparelho lembra os dados do cliente.

## D-026 Rastreio dos motoboys em tempo real
- O celular só manda a posição **enquanto o motoboy tem entrega em rota**. `registrar_posicao` responde `{ativo:false}` quando não há entrega, e o app para. Quando a última entrega é concluída ou cancelada, o motoboy sai do mapa na hora (gatilho no pedido). Fora do serviço não há rastreio.
- `motoboy_local` guarda a última posição (tempo real por grupo) e `motoboy_posicoes` guarda o caminho, um ponto a cada ~8 s, por 30 dias. A leitura é só para membros das lojas do grupo.
- **App Android**: plugin `@capacitor-community/background-geolocation`. O GPS continua com a tela desligada, com o aviso fixo "Compartilhando sua rota…", e o envio é nativo (`CapacitorHttp` direto no Supabase, com o token do motoboy), porque o Android segura as requisições da WebView em segundo plano. Precisa de um APK novo; sem a chave fixa de assinatura, é preciso desinstalar o antigo antes.
- **Navegador (iPhone/Chrome)**: só envia com a tela do app aberta.
- O painel tem **Entregas → Ao vivo**: mapa (Leaflet + OpenStreetMap) com cada motoboy, o caminho desde que saiu, as entregas (#número no endereço do cliente, quando o app conseguiu localizar) e a loja; a lista mostra o sinal (cinza depois de 2 min sem posição) e a velocidade.
- Os mapas do OpenStreetMap são gratuitos e têm limite de uso; com muitas lojas, trocar por um provedor de mapas pago (só muda o endereço das imagens do mapa).

## D-027 · Rota sugerida quando o motoboy sai com várias entregas

- O motoboy lê o QR de todas as comandas. Com 2 ou mais entregas, o app mostra a **Rota sugerida**: a ordem de entrega, a hora prevista em cada cliente e quem vai chegar atrasado. Um botão abre a rota completa no Google Maps, com todas as paradas (até 10).
- **Prazo de cada pedido**: o horário agendado; senão, o horário em que o pedido foi feito + `lojas.prazo_entrega_min` (padrão 35 min).
- **Ordem**: `otimizarRota` (packages/core) testa todas as ordens até 8 entregas (acima disso, escolhe a mais próxima/urgente a cada passo) e escolhe a de menor custo: minutos rodando + 3 × minutos de atraso. Assim o pedido mais atrasado vai na frente quando isso evita atraso, sem mandar o motoboy cruzar a cidade à toa.
- **Tempos pela rua**: matriz do OSRM. Sem resposta, usa linha reta × 1,4 a 25 km/h ("estimado"). Cada endereço é procurado no mapa uma vez (Nominatim, 1 por segundo) e guardado em `pedidos.destino_lat/lng`.
- **Partida**: a posição atual do celular; senão, a loja. "Recalcular daqui" refaz a conta do ponto onde o motoboy está. Ler uma nova comanda ou entregar uma recalcula sozinho.
- A ordem fica gravada em `pedidos.rota_ordem` (só o próprio motoboy, só com entrega em rota): as comandas aparecem nessa ordem no app e no painel ao vivo.

## D-028 · Cliente acompanha a entrega, prazo por loja, alerta e lotes na expedição, tempos e atrasos

- **Prazo por loja** (Entregas → Bairros e preços → ⏱ Prazo de entrega, de 10 a 240 min; padrão 35). Vale para entrega sem horário agendado; agendado usa o horário marcado. Funções `prazoEntrega` e `situacaoPrazo` no core.
- **Alerta no quadro**: cartão de entrega mostra "Entregar até HH:MM"; laranja quando faltam 10 min ou menos, vermelho quando estoura ("Atrasado X min"). Em rota, mostra também a chegada prevista pela rota do motoboy.
- **Sugestão de saída** (acima das colunas, quando há 2+ entregas prontas na mesma loja): `agruparEntregas` começa pelo pedido mais urgente e junta os que ficam no caminho, até 3 por lote. Um pedido só entra no lote se somar no máximo 8 min à rota e não fizer ninguém atrasar mais do que já atrasaria. Sem endereço achado no mapa, junta só pelo mesmo bairro. Os endereços são procurados no mapa na hora (no máximo 6 por vez) e guardados no pedido.
- **Cliente** (página de acompanhamento do cardápio digital):
  - antes de sair, vê "Previsão de entrega: até HH:MM";
  - depois que o pedido sai, vê o nome do motoboy, "chega por volta das HH:MM" (hora gravada pela rota do motoboy, refeita a cada 4 min do ponto onde ele está) e quantas entregas ele faz antes;
  - **o mapa com o motoboy só aparece quando o pedido do cliente é a próxima parada**, com posição dos últimos 3 min, para não expor as outras entregas.
- **Tempos e atrasos** (aba nova em Entregas; hoje, ontem, 7 ou 30 dias; turnos 05:00→05:00; lojas do grupo que a pessoa gere ou tem permissão de relatórios):
  - média de cada etapa (aceitar, preparo, esperando motoboy, na rua), com a etapa mais longa destacada;
  - % no prazo e atrasos por dia, bairro, motoboy e loja.

## D-029 · Segmentos de clientes para marketing

- Cada cliente do grupo cai em um segmento por **recência** (dias desde o último pedido) e **frequência** (pedidos não cancelados nas lojas do grupo). Regra explicável para o dono, com limites fixos:

  | Último pedido | 4+ pedidos | 2–3 pedidos | 1 pedido |
  |---|---|---|---|
  | até 30 dias | 💎 Fiéis | ⭐ Em potencial | 🌱 Promissores |
  | 31–60 dias | ⚠️ Precisam de atenção | 💤 Quase dormentes | 💤 Quase dormentes |
  | 61–120 dias | 🔥 Em risco | ❄️ Hibernando | ❄️ Hibernando |
  | mais de 120 dias | 🌙 Dormindo | 🌙 Dormindo | 🌙 Dormindo |

- "Em risco" (cliente bom sumindo há 2 a 4 meses) foi incluído além dos 7 pedidos pelo dono, por ser o público mais valioso para reativar.
- A regra fica em `segmentoCliente` (core) e em `private.segmento_cliente` (banco); os testes dos dois usam os mesmos casos (`CASOS_SEGMENTO`).
- O segmento é calculado na hora (nada guardado): muda sozinho conforme os dias passam e os pedidos chegam.
- Tela **Clientes**: abas com contagem por segmento, explicação e ação sugerida; lista ordenada por quanto gastou.
- **Exportar CSV** (gestor, permissão Clientes ou Marketing) com telefone no formato +55…, que serve para SMS e para públicos personalizados do Meta Ads e do Google Ads.
- Próximos passos:
  - consentimento de marketing (LGPD) e descadastro antes de enviar SMS;
  - campanhas de SMS;
  - envio direto dos públicos ao Meta/Google por OAuth, com os tokens só no servidor.

## D-030 · Telefone sempre com o 9 do celular

- Todo telefone é gravado só com dígitos, DDD + número, sem +55 nem zeros na frente.
- Celular que vier com 8 dígitos ganha o 9: "+55 47 96731809" vira "47996731809", que é o formato que SMS e anúncios aceitam.
- Fixo (número começando com 2 a 5) fica como está e sai no CSV como "não (fixo)", porque não recebe SMS.
- A regra está em `normalizarTelefone` (core, usada no balcão e no cardápio digital) e em `private.normalizar_telefone` (banco, num gatilho em todo pedido novo). Os testes dos dois usam os mesmos casos.
- A migração 0031 corrige os telefones já gravados. Quando o mesmo cliente estava salvo duas vezes (com e sem o 9), os cadastros viram um só: pedidos, endereços e observações ficam no que já estava certo.

## D-031 · Programa de fidelidade: cashback e pontos nas lojas do grupo

O estudo da tela do BeeFood está em `estudo-beefood/fidelidade.md`, no projeto.

**Configuração**
- Uma configuração por grupo, na tela **Fidelidade → Programa**. Cashback e pontos ligam e desligam cada um por conta.
- Canais: cardápio digital, delivery lançado no balcão e balcão/retirada.
- **Cashback**:
  - % padrão, com % diferente por dia da semana quando preciso;
  - dias em que vale: nos dias desligados o cliente não ganha nem usa;
  - validade em dias sem pedir;
  - saldo mínimo para usar e teto em % do pedido;
  - a taxa de entrega não gera cashback.
- **Pontos**:
  - pontos por R$ 1 em produtos e por R$ 1 de taxa;
  - bônus no 1º pedido;
  - validade em dias sem pedir.
- **Recompensas**: N pontos dão R$ X de desconto ou um produto grátis. Para o produto grátis, o produto precisa estar no pedido; o desconto é o preço de 1 unidade e vale também para produto de mesmo nome em outra loja do grupo.

**Saldo e extrato**
- O saldo é do cliente (pelo telefone) e vale em todas as lojas do grupo.
- O extrato fica em `fidelidade_movimentos` (ganho, uso, vencido, ajuste, estorno) e o saldo é a soma.
- **Ganho na hora em que o pedido é concluído**, sem esperar processamento de madrugada como no BeeFood. Se o pedido for cancelado depois, o que foi usado volta e o que foi ganho sai.
- **Validade conta do último pedido do cliente**, para cashback e para pontos. Quem continua pedindo não perde o saldo. Ao voltar depois de vencer, o saldo antigo sai do extrato como "vencido".

**Uso no pedido**
- O uso vira desconto do pedido (`pedidos.desconto`), detalhado em `fid_cashback`, `fid_desconto` e `fid_pontos`.
- `pedidos.cupom_desconto` passa a guardar o desconto do cupom, para o painel de resultados.
- No balcão, o atendente vê o saldo do cliente escolhido e marca "usar cashback" e/ou a troca de pontos. A conta na tela é uma prévia; o banco confere tudo.
- No **cardápio digital**, o saldo só aparece e só pode ser usado no aparelho do último pedido. O código secreto daquele pedido fica guardado no aparelho e é enviado como prova. Sem essa prova, saber o telefone de alguém não basta para gastar o saldo dele; em outro aparelho, o cliente pede pela loja.
- A página do pedido mostra o que o cliente ganhou e o que usou.

**Saldos e ajuste manual** (Fidelidade → Saldos dos clientes)
- Mostra o saldo de cada cliente com a data de vencimento e o extrato.
- O ajuste manual pede motivo e nunca deixa o saldo negativo.
- Mudar o programa e ajustar saldo: gestor ou permissão Marketing.

**Resultados** (Fidelidade → Resultados, períodos de 7, 31 ou 90 dias)
- Vendas e % do faturamento com fidelidade, desconto dado e **ROI** por mecânica (cupom, cashback, recompensa).
- Faixas de ROI: 5x+, 2–5x, 1–2x, abaixo de 1x.
- Ticket médio com e sem fidelidade; cashback gerado e vencido; pontos gerados e trocados.
- **Dia da semana**: dia forte e dia fraco, com sugestão por dia (`recomendacaoDia` no core: dia fraco pede ação do dia, ROI baixo pede revisão, dia forte com pouca fidelidade pede teste).
- Novos × recorrentes calculado na hora; resultado por origem.
- As regras de ganho e uso estão no core e no banco, com os mesmos casos de teste (`CASOS_GANHO`).

## D-032 · Fidelidade separada por loja (substitui a regra de grupo da D-031)

- Pedido do dono: tudo separado por loja. Cada loja tem:
  - o próprio programa (cashback, pontos, canais);
  - as próprias recompensas (produtos daquela loja);
  - o próprio saldo de cada cliente e o próprio extrato;
  - os próprios resultados.
- O cashback ganho na LA PIZZA só vale na LA PIZZA.
- O cadastro de clientes (telefone, nome, endereços, segmentos) continua um só para o grupo.
- A validade conta do último pedido do cliente **naquela loja**. O bônus de boas-vindas é no 1º pedido naquela loja.
- A tela **Fidelidade** mostra a loja escolhida no menu. O botão "Copiar estas regras para…" leva as regras de cashback e pontos para as outras lojas; as recompensas e os saldos não são copiados.
- A migração 0033 converte o que estava por grupo: a configuração vira uma cópia por loja; a recompensa de produto fica na loja do produto e a de desconto é copiada para cada loja; no extrato, cada lançamento fica na loja do pedido.

## D-033 · Fidelidade mais simples de configurar

- O cashback liga ou desliga e vale todos os dias com um % só. A escolha de dias e o % por dia saíram da tela. O banco ainda aceita essas regras, mas ao salvar a tela grava "todos os dias" e nenhum % por dia.
- O prazo do cashback e o dos pontos têm atalhos (30, 60, 90, 180 e 365 dias, ou "Não vence"), e o dono também pode digitar qualquer número de dias. O prazo conta do último pedido do cliente na loja.
- Para mexer num dia fraco, usar cupom com dias da semana (Promoções).

## D-034 · Visual do painel

- **Paleta:** verde-manjericão (#1d6a50) para ação e item ativo, sobre fundo frio (#f3f4f1) e superfícies brancas. Tomate para urgência e atraso; mel para atenção. Modo escuro com a mesma lógica.
- **Tipografia:** uma família só, Onest (next/font, servida pelo próprio site), com números tabulares em preços, pedidos e indicadores.
- **Menu agrupado pelo que a pessoa vai fazer:** Operação (Resumo, Pedidos, Novo pedido, Caixa, Entregas), Vendas (Cardápio, Delivery, Promoções), Clientes (Clientes, Fidelidade) e Ajustes (Impressoras, Lojas e equipe). O item ativo tem fundo verde-claro e uma barra à esquerda.
- **Componentes com um padrão só:**
  - campos e botões com 2,4rem de altura;
  - raios em hierarquia: controle 10, cartão 14, folha 18;
  - foco sempre visível (anel verde);
  - abas como trilho, do tamanho do conteúdo;
  - tabelas com cabeçalho discreto;
  - cartões com borda leve.
- **Quadro de pedidos:** cada pedido tem uma faixa de cor por etapa, que fica mais grossa quando o prazo aperta, e as colunas mostram a quantidade num contador.
- Tudo está numa camada única no fim do `globals.css` ("Refino visual"), que vale sobre as regras antigas de cada tela.

## D-035 · Fotos no novo pedido e nas opções

- O **Novo pedido** (balcão) mostra a foto de cada produto na lista e no topo da montagem (pizza, combo).
- **Opções com foto** (sabores, bordas, adicionais), em `opcoes.imagem_url`:
  - o dono envia a foto em Cardápio → Grupos de opções → editar grupo, com um quadradinho ao lado de cada opção (clicar ou arrastar e soltar);
  - opção nova ganha foto depois que o grupo é salvo;
  - opção que é um produto usa a foto do produto quando não tem a própria.
- As fotos das opções aparecem no balcão, na montagem do combo e no cardápio digital do cliente.

## D-036 · Estoque: entrada por NF-e e baixa pela ficha técnica

O estudo da tela do BeeFood está em `estudo-beefood/estoque.md`, no projeto.

**Onde fica o estoque**
- O estoque é **da loja** ou **do grupo**, conforme `contas.estoque_compartilhado`.
- A escolha só aparece para quem tem o plano de várias lojas, para o dono ou gerente, e só antes de cadastrar o primeiro insumo.
- `private.estoque_da_loja(loja)` devolve o dono do estoque: a própria loja ou a conta do grupo.

**Insumos**
- Unidades: un, kg, g, l, ml.
- Cada insumo tem saldo, **custo médio ponderado** (atualizado a cada entrada com custo), mínimo para o alerta, opção de controlar ou não, e categoria.

**Entrada por NF-e (XML)**
- O navegador lê o XML com `lerNFe` (core): chave, número, emitente, destinatário e itens.
- O custo de cada item é: produtos − desconto + frete + seguro + outros + IPI + ICMS-ST.
- Na tela, cada item vai para:
  - um insumo cadastrado (a tela sugere pelo nome);
  - um insumo novo;
  - ou "não entra no estoque".
- O **fator** diz quantas unidades do insumo vêm em cada unidade da nota (ex.: caixa de 6 kg → 6). Unidades como CX, FD e PCT pedem confirmação do fator.
- **Vínculo lembrado:** fornecedor (CNPJ) + código do produto na nota → insumo + fator. A próxima nota do mesmo fornecedor já vem ligada.
- A chave da nota é única por estoque: a mesma nota não entra duas vezes.

**Ficha técnica**
- Diz quanto um produto ou uma opção gasta de cada insumo.
- **Sabor de pizza:** quantidade numa pizza inteira daquele sabor, multiplicada pela fração (no meio a meio baixa a metade).
- Adicional ou borda: quantidade × a quantidade escolhida.
- Combo: o produto escolhido em cada passo baixa pela ficha dele (achado pelo nome na loja).
- A tela mostra o custo da ficha e a % do preço.

**Baixa e ajustes**
- A baixa é **na hora** em que o pedido é concluído. Se o pedido concluído for cancelado, o estoque volta.
- O estoque pode ficar negativo; a venda nunca é bloqueada.
- Ajustes manuais: **contagem** (o saldo passa a ser o contado), **entrada** com custo e **perda** com motivo obrigatório.
- Tudo fica em `estoque_movimentos`.

**Busca automática de notas na SEFAZ:** fica para depois. Exige o certificado A1 da loja e um provedor fiscal.

## D-037 · Movimentações do estoque com filtros

- Filtros: período (atalhos hoje / 7 / 30 / 90 dias, turno de 05:00 a 05:00), tipo, fornecedor (CNPJ da nota), insumo, produto vendido (pedidos que tinham o produto) e busca (nº da nota, nº do pedido, observação). Período de até 370 dias.
- Resumo do período: entradas (R$, lançamentos e notas), custo do que saiu nas vendas, perdas e diferença das contagens (falta − / sobra +).
- "Por insumo": quanto entrou e saiu de cada um. Clicar num insumo, nota ou pedido filtra por ele.
- Lista até 500 movimentos, com valor (quantidade × custo da hora). Exporta para Excel (CSV com `;`).
- Em Insumos, "Histórico" abre as movimentações já filtradas pelo insumo.

## D-038 · Meu estoque e Contagem

**Meu estoque** (primeira aba do Estoque)
- Lista todos os produtos do cardápio com foto, preço, custo da ficha técnica e custo/preço (vermelho acima de 35%).
- Filtro com ficha / sem ficha. A ficha é montada ali mesmo; quando o pedido é concluído, a venda baixa os insumos.
- "Esta loja / Todas as lojas": aparece se a pessoa cuida do estoque de mais de uma loja do grupo. Cada loja usa os insumos do seu estoque (o mesmo, se agrupado).
- "Levar para as outras lojas": copia a ficha para o produto de mesmo nome nas outras lojas. Insumos são achados pelo nome; se faltar algum, aquela loja fica de fora e o aviso diz o que cadastrar.
- Sabores, bordas e adicionais ficam em "Sabores e adicionais" (a antiga aba Ficha técnica).

**Contagem**
- Folha com todos os itens: saldo no sistema, contado, diferença (quantidade e R$) e data da última contagem.
- Filtros: importados de NF-e / cadastrados à mão, categoria e busca. Enter pula para o próximo item.
- "+ Item à mão" cadastra um item sem NF-e, já com a quantidade e o custo.
- Salva tudo de uma vez (`salvar_contagem`), só mexe nos itens com diferença, e registra nas Movimentações.
- O que foi digitado fica guardado no navegador até salvar. A folha pode ser impressa para contar no papel.

## D-039 · Fechamento do mês e CMV

- Aba **Fechamento / CMV** do Estoque, mês a mês: o mês vai do dia 1 às 05:00 até o dia 1 seguinte às 05:00.
- **CMV real** = estoque inicial + compras − estoque final, em R$ a custo médio. Os estoques inicial e final saem do último movimento antes de cada data: cada movimento guarda o saldo e o custo médio depois dele (`custo_medio_apos`).
- **CMV pelas fichas** (teórico) = o que as vendas baixaram pela ficha técnica.
- **Diferença** = real − fichas, explicada por perdas registradas, falta ou sobra nas contagens e "outros" (mudança de custo no mês).
- **Faturamento** = pedidos concluídos no mês, sem a taxa de entrega. CMV % = CMV ÷ faturamento.
- Com estoque agrupado, o fechamento é do grupo (todas as lojas do estoque).
- Aviso quando o mês fechado não tem contagem entre o último dia e o dia 1: sem contagem, o real fica igual ao das fichas.
- A tela mostra os últimos 6 meses, a quebra por insumo (quantidade e R$), e permite imprimir e exportar para Excel.

## D-040 · Ficha técnica por sabor de pizza

- A ficha do sabor é escrita **uma vez**, para a pizza de 100% (a maior). Ex.: Calabresa → calabresa 100 g, cebola 40 g.
- Cada pizza tem um **tamanho** (`produtos.fator_sabor`), sugerido pela área do diâmetro no nome: 25 cm = 39%, 30 cm = 56%, 35 cm = 77%, 40 cm = 100%. É editável.
- **Baixa de cada sabor** = ficha do sabor × tamanho da pizza × fração (meio a meio = ½; 3 sabores = ⅓) × quantidade. No combo, vale o tamanho da pizza escolhida no passo.
- A ficha do **produto** (massa, molho, mussarela base, caixa) não usa o fator: já é daquele tamanho.
- Quando o cardápio tem um grupo de sabores por tamanho (LA PIZZA), o mesmo sabor aparece em vários grupos e a ficha é gravada em todos de uma vez.
- Na tela: quantidades em g/ml (o estoque guarda em kg/l), ingrediente novo cadastrado ali mesmo, "copiar de outro sabor" e uma prévia de quanto baixa em cada tamanho.
- Bordas e adicionais continuam com ficha própria, sem fator.
- **Atualização (28/10, pedido do dono):** o padrão passa a ser o tamanho **pela quantidade de sabores**: cada sabor tem a mesma porção. Broto (1 sabor) = 100%, Média (2) = 200%, Grande (3) = 300%, Gigante (4) = 400%, tirado do máximo de sabores do grupo de cada pizza. Ex.: Calabresa 100 g → Broto Calabresa baixa 100 g, Gigante 4× Calabresa 400 g, Gigante meio a meio 200 g. O tamanho pelo diâmetro continua como opção.

## D-041 · A tela de pizza aparece sozinha

- Não há chave para ligar a "ficha por sabor". O cardápio decide: se a loja tem um grupo de sabores de pizza ativo, aparece "Sabores, bordas e adicionais", com os tamanhos.
- Sem grupo de pizza (hamburgueria, açaí…), aparece "Adicionais e opções", só com a ficha de cada opção, sem falar em pizza.
- A baixa já era assim no banco: o fator de tamanho só vale para opções de grupos de pizza.
- Para liberar ou bloquear recursos por contrato, usa-se o plano (como o estoque agrupado). Um campo "segmento" da conta fica como ideia para modelos e exemplos, não para bloquear.

## D-042 · Aplicativos

**Tela Aplicativos** (menu Ajustes), por categoria, com filtro Ligados / Disponíveis / Em breve:
- **Incluso**: o que já é do RES (cardápio digital, segmentação, fidelidade, cupons, motoboy, impressão, estoque). O cartão abre a tela.
- **Disponível**: liga ali mesmo, por loja, com "usar também nas outras lojas do grupo".
- **Em breve**: Mercado Pago, TEF, SMS, WhatsApp, outros marketplaces, entregador sob demanda, KDS. (API, webhooks e IA entraram com a D-043.)
- **iFood**: "Mais tarde", a pedido do dono (28/10). Lembrar quando o projeto estiver avançado.

**Pix no cardápio**
- QR Code + copia e cola (BR Code estático do Banco Central, com CRC16) com o valor exato e o número do pedido. Aparece na página do pedido.
- O dinheiro vai direto para a conta da loja; a loja confirma com "Marcar como pago" e o cliente vê "Pagamento confirmado".
- Botão para testar com R$ 0,01 no próprio banco. Sem custo e sem intermediário. O Mercado Pago (confirmação automática) vem depois.

**Pixels**
- Pixel do Meta, Google Analytics 4, Google Ads (conversão com rótulo) e Google Tag Manager no cardápio digital.
- Eventos: visita, item no carrinho, início do pedido e compra com valor. A compra é contada uma vez por pedido, na página do pedido.
- Só carregam depois que o cliente aceita os cookies (LGPD). Os IDs são públicos por natureza; nada secreto é guardado.

**Avaliações no Google**: o link de avaliação aparece para o cliente depois que o pedido é concluído.

**Link único do grupo** (`/g/<link>`): todos os cardápios das lojas da conta, com aberto/fechado. Só o titular da conta escolhe o link.

## D-043 · API aberta, webhooks e conexão com IA (MCP)

**Chaves de API**
- Por loja, até 10 ativas, criadas por gestores em Aplicativos.
- **Só leitura**, por área: vendas, pedidos, cardápio, clientes (dados pessoais) e estoque.
- O segredo aparece uma vez; o banco guarda só o hash (como o token do agente, D-015). Revogar corta na hora. Guarda último uso e contagem.

**REST** (`/api/v1/…`, `Authorization: Bearer res_…`)
- Rotas: `vendas`, `pedidos`, `pedidos/{número|id}`, `cardapio`, `clientes`, `estoque`.
- A rota chama funções `api_*` com a chave pública (anon); quem confere a chave e a área é o banco (`private.loja_da_chave`).
- Período em turnos de 05:00 a 05:00, até 92 dias (padrão: 7).

**Webhooks**
- Até 5 por loja, só `https`. Eventos: `pedido.criado`, `pedido.status` e `pedido.cancelado` (mais `teste`, pelo botão Testar).
- Corpo em JSON com o pedido no mesmo formato da API. Cabeçalho `X-RES-Assinatura: sha256=<HMAC-SHA256 do corpo>`, feito no próprio Postgres (testado com o vetor do RFC 4231).
- Envio por **pg_net**, direto do gatilho. Reenvio pelo **pg_cron** (a cada minuto) em 1, 2, 4, 8 e 16 min; depois desiste. Sem pg_net, fica na fila.
- A tela mostra os 15 últimos envios de cada webhook.

**MCP** (`/api/mcp/<chave>` ou `/api/mcp` com Bearer)
- Servidor MCP em HTTP (JSON-RPC 2.0) com ferramentas só de leitura: resumo_vendas, listar_pedidos, ver_pedido, ver_cardapio, clientes, estoque.
- A IA só vê as ferramentas das áreas da chave.
- O link com a chave é o jeito que ChatGPT e Claude aceitam sem login. Tratado como segredo: aparece uma vez, é revogável e a chave padrão não inclui clientes.

## D-044 · Mercado Pago: Pix com confirmação automática

- **Conta da loja:** cada loja conecta a **própria** conta, colando o Access Token de produção em Aplicativos.
  - O servidor confere o token no Mercado Pago (`users/me`) antes de guardar.
  - O token fica em `mp_contas`, que só o service_role lê. Nunca volta para o navegador; a tela mostra só os 4 últimos caracteres.
  - O dinheiro vai direto para a loja; o RES não intermedeia nem cobra taxa.
  - Escolhemos o token colado em vez de OAuth porque não depende de uma aplicação do RES aprovada no Mercado Pago. OAuth pode vir depois sem mudar o resto.
- **Pedido no cardápio digital com Pix:** a página do pedido gera um **Pix dinâmico** (`/v1/payments`, `payment_method_id = pix`).
  - O Pix vale 30 min, tem o valor exato e leva `external_reference` = id do pedido.
  - Se o cliente abrir a página de novo, o QR ainda válido é reaproveitado.
- **Confirmação:** por aviso do Mercado Pago (`/api/mercadopago/notificacao?l=<loja>`) e por conferência a cada 5 s enquanto a página está aberta.
  - Nos dois casos o servidor **busca o pagamento na API do Mercado Pago**: o corpo do aviso não é confiável.
  - Só marca pago (`pedidos.pago_em`) se o pagamento foi criado pelo RES para aquele pedido daquela loja e o valor cobre o total.
- **O fluxo do pedido não muda:** o pedido entra no quadro como hoje (Pix) e vira "Pago" sozinho. O motoboy vê "PAGO — NÃO COBRAR".
- **Aceite ao pagar (0042, ligado por padrão):** quando o Pix é confirmado, o pedido "Novo" vai para "Em preparo" e imprime, pelos mesmos gatilhos do aceite do quadro. Pedido agendado não: entra na hora de preparar. Desliga em Aplicativos → Mercado Pago.
- Sem Mercado Pago, continua o Pix estático da D-042, confirmado à mão.
- **Cartão online:** fica para uma próxima etapa. Exige pedido que só entra no quadro depois de pago.
- **Pedido só vai para a cozinha depois de pago (0043, 28/10, depois do 1º teste no ar).** Com o aceite automático da loja ligado, o pedido com Pix era aceito e impresso antes do pagamento.
  - Agora o pedido do cardápio digital com Pix numa loja com Mercado Pago nasce com `aguarda_pagamento`: fica "Novo", não é aceito nem impresso e não bipa.
  - No quadro, fica na faixa **⏳ Aguardando Pix**.
  - Pagou (pelo Mercado Pago ou "Marcar como pago"): sai da faixa e é aceito/impresso conforme a opção da loja.
  - Sem pagamento em 40 min, o pg_cron cancela com o motivo "Pix não foi pago em 40 minutos".
- **Pedidos do painel também (0044):** o 2º teste no ar foi um pedido lançado em "+ Novo pedido" (telefone), que não tinha a regra.
  - Agora o pedido com Pix do painel também espera o pagamento.
  - No cartão do quadro: **Mostrar QR** (abre a página do pedido com o Pix), **Copiar link** e **Enviar no WhatsApp** (mensagem pronta com o link para o telefone do cliente).

## D-045 · Vitrine do cardápio digital (entrega 1 de 3 do novo cardápio)

- Feita a partir do estudo do cardápio do BeeFood da LA PIZZA, salvo em `estudo-beefood/cardapio-digital.md`. O visual usa a marca da loja, nunca a do BeeFood.
- Cada **cardápio (marca)** tem o próprio endereço `/c/<endereço>` e a própria vitrine, que se configura em Delivery. Quantos cardápios dá para criar depende do plano (`limite_cardapios`, D-017).
- **Topo:** capa, logo, nome e situação do horário, por exemplo "Aberto até 01:30" ou "Fechado · abre às 18:00", com virada da meia-noite. Também mostra a cidade, "Mais informações", os tempos de entrega e de retirada e o pedido mínimo.
- **Mais informações**, em abas:
  - Sobre: texto, WhatsApp, Instagram, endereço e tempos;
  - Horário: a semana inteira, com o dia de hoje destacado;
  - Pagamento: online (Pix) e na entrega;
  - Entrega: endereço de retirada e bairros com a taxa.
- **Navegação:** seletor de categoria e busca fixos no topo, mais os botões de categoria. Grade de 2 colunas a partir de 860 px.
- **Cartões dos produtos:** "Serve N pessoas" e selos como "❄ Bebida gelada" e "Vegetariano", vindos de `produtos.serve_pessoas` e `restricoes`.
- **Rodapé:** nome da loja, CNPJ e endereço.
- **Cor da marca:** substitui a cor principal em todo o cardápio, inclusive nos botões.
- **Link de produto:** `?produto=<id>` abre a montagem direto e a URL acompanha o produto aberto, para compartilhar.
- **Preparado para a entrega 2:** cada opção pode ter `descricao` (ingredientes) e `selo` ("recomendado" ou "novo"). O selo **"Mais pedido"** é calculado: as 3 opções mais escolhidas de cada grupo nos últimos 60 dias, com pelo menos 3 pedidos.

## D-046 · Montagem do produto no cardápio (entrega 2 de 3)

- **Janela de montagem:** no computador, foto grande à esquerda e escolhas à direita; no celular, folha que sobe de baixo.
- **Cada grupo:**
  - cabeçalho fixo com a regra ("Escolha 3 opções", "Escolha até 2"…), **contador X/Y** (verde com ✓ quando completo) e **OBRIGATÓRIO**;
  - **🔍 busca** quando tem mais de 8 opções.
- **Opções:**
  - escolha única é como um botão de rádio;
  - múltipla tem +/− (repetir sabor quando o grupo deixa). Quando o grupo enche, as demais ficam apagadas.
  - Mostram foto, **ingredientes**, selo e "+ R$" quando faz sentido. O "+ R$" é o preço na soma e a diferença para a mais barata em "maior"; na proporcional não aparece.
- **Passa sozinho:** ao completar um grupo, a janela rola para o próximo que falta.
- **Ao tentar adicionar incompleto:** rola até o grupo, pinta de vermelho e mostra "Verifique a quantidade do grupo …".
- **Rodapé:** observação (até 100 caracteres), quantidade e "Adicionar R$ X". O preço já soma o que foi escolhido enquanto monta.
- **Selos:** "🔥 Mais pedido" é automático (D-045). "⭐ Recomendado" e "✨ Novo" e os **ingredientes** se cadastram em Cardápio → grupo → "+ Detalhes" em cada opção.
- **Sacola:** foto, ✏️ **Editar** (reabre a montagem com as escolhas e salva por cima) e 🗑 no lugar do − quando a quantidade é 1.
- **LA PIZZA (0046, a pedido do dono):** cada tamanho exige **exatamente** o número de sabores dele (Broto 1, Média 2, Grande 3, Gigante 4), como no BeeFood. Para meio a meio, repete um sabor: 2× Calabresa + 1× Bacon numa Grande = ⅔ e ⅓, e o estoque e o preço seguem a fração.

## D-047 — Cardápio público: WhatsApp primeiro, "Pedidos" e "Perfil" do aparelho (28/10/2026)

- No checkout, o **WhatsApp vem antes do nome**, com o aviso "para avisarmos o andamento do seu pedido" (igual ao BeeFood).
- Barra de baixo **Cardápio · Pedidos · Perfil**. *Pedidos* lista os pedidos feitos **neste aparelho** (`localStorage res_meus_pedidos`, até 30) e busca a situação ao vivo pelo código (`acompanhar_pedido`, até 15 por vez). *Perfil* edita os dados guardados (`res_cliente`) e tem "Esquecer meus dados".
- **Por que só o aparelho, e não "digite o telefone e veja seus pedidos":** buscar por telefone numa página pública expõe nome, endereço e histórico de qualquer pessoa para quem souber o número. Login por código no WhatsApp fica para depois.

## D-048 — Taxa de entrega por raio em km (28/10/2026)

- **Bairro da lista manda**; a faixa de km vale só para endereço fora da lista (opção "Outro bairro (calcular pela distância)" no cardápio).
- Faixas por cardápio em **Entregas → Bairros e preços**: até X km, taxa e **tempo adicional**. Acima da última faixa, não entrega.
- Distância em **linha reta** da loja até o endereço (o "raio" do BeeFood). O servidor acha o endereço no mapa (Nominatim, perto da loja) e o **banco refaz a conta** com as coordenadas ao gravar o pedido; o ponto fica no pedido (`destino_lat/lng`, `distancia_reta_km`) e já serve à rota do motoboy.
- Risco aceito: quem forja coordenadas paga a faixa errada, mas o pedido mostra o endereço por extenso e a rota vai para o ponto informado. O tempo adicional aparece no checkout; somar ao prazo do quadro fica para depois.

## D-049 — Importar cardápio do BeeFood (28/10/2026)

- O cardápio é lido **só do cardápio público** do BeeFood (sem login, sem salvar nada lá) e convertido por `scripts/beefood_para_res.py`.
- `private.importar_cardapio(slug, dados)` (0048) grava numa marca: **o que existia fica pausado** (fora do cardápio, pedidos antigos intactos), o importado é lembrado em `private.importacoes` (rodar de novo atualiza sem duplicar) e **fichas técnicas** de sabores/produtos antigos com o mesmo nome são copiadas.
- Igual ao BeeFood: cada grupo do BeeFood vira um grupo no RES (mesmo nome, mínimo, máximo, obrigatório, ordem); cada escolha **soma o valor cheio** (conferido no BeeFood: Grande 35CM 78,99 + Borda 14 + Atum 6 = 98,99); sabor só repete quando o BeeFood deixa; fotos apontam para as imagens do BeeFood.
- Grupos de sabor de pizza/sobremesa ficam marcados como pizza (fração na comanda e baixa do estoque); fator da ficha por diâmetro (25=1, 30=2, 35=3, 40=4) só nos produtos com um grupo de sabor.
- LA PIZZA importada em 0049 (37 produtos, 5 categorias, 17 grupos, 584 opções); dados guardados em `private.cardapios_importados`.
- HAMBURGUERIA POMERODE importada em 0050 (34 produtos, 5 categorias, 2 grupos, 3 opções). Conferência item a item: `scripts/conferir_importacao.py`.
- PIZZARIA POMERODE importada em 0051 (38 produtos, 7 categorias, 20 grupos, 729 opções). No BeeFood ela usa os mesmos IDs de grupos/produtos da LA PIZZA com preços próprios: as chaves levam o nome da marca (`beefood:pizzaria-pomerode:`) para não tocar na LA PIZZA. Conferido também o pior caso (as três marcas na mesma loja): 0 diferenças.

## D-050 — Gestão Empresarial (28/10/2026)

- Menu **Gestão → Gestão Empresarial**, só para **dono e gerente** (RLS com `private.e_gestor`): CPF e dados dos funcionários são dados pessoais (LGPD). Eles também ficam **fora do histórico de alterações**, que pode ser aberto por quem não é gestor.
- **Custos fixos e variáveis**: planilha que já vem com 25 linhas de modelo (aluguel, energia, folha, contador… / CMV, embalagens, impostos, cartão, apps, motoboys…), valores em branco; o dono preenche, renomeia, remove e acrescenta. Variáveis em % das vendas ou R$ no mês. Resumo: fixos, variáveis, sobra/prejuízo, margem e **ponto de equilíbrio** (fixos ÷ (1 − variáveis%)), com o faturamento do mês informado ou sugerido pelos pedidos concluídos nos últimos 30 dias.
- **Funcionários** (nome, CPF validado, RG, CTPS, PIS, função, admissão, endereço) e **Dados da empresa** (razão social, CNPJ validado, endereço, responsável).
- **Faltas** e **advertências** numeradas por loja (número nunca reaproveitado) e **documento A4 em duas vias** para imprimir ou salvar em PDF e assinar: termo de ciência de falta (justificada ou não; DSR pela Lei 605/1949 art. 6º, férias pela CLT art. 130) e advertência disciplinar (reincidência → suspensão/justa causa, CLT art. 482), com assinaturas do empregado, do responsável e de duas testemunhas para o caso de recusa. Modelo de referência: a tela recomenda confirmar com contador/advogado.

## D-051 — Equipe mais clara em Lojas e equipe (28/10/2026)

- **Lojas e equipe** ganha três abas: **Lojas e cardápios** (como antes, com um resumo da equipe em cada loja), **Equipe** e **Funções e permissões**.
- **Equipe**: pessoas agrupadas por função (Dono, Gerente, Caixa / Atendente, Motoboy, Garçom), com como cada uma entra; trocar senha (com senha gerada), mudar função, tirar/devolver acesso, convites pendentes.
- **Adicionar pessoa** em passos: 1) função, em cartões com o que pode e o que não pode; 2) como entra (usuário e senha criados na hora, recomendado, ou convite por e-mail) com usuário sugerido pelo nome e senha fácil de ditar; 3) **cartão de acesso** para imprimir, copiar ou mandar no WhatsApp (endereço, QR, usuário, senha uma única vez, passo a passo; motoboy com o link do app).
- **Funções e permissões**: quadro do que cada função faz e o ajuste do que o **Caixa / Atendente** pode (pedidos, caixa, cardápio, pausar itens, clientes, estoque, impressoras, delivery, promoções, relatórios, cadastro de caixas).
- Regras no banco (0053): só dono/gerente mudam função e permissões; **só o dono** cria ou tira gerente; ninguém muda a função do dono nem a própria; o Caixa / Atendente nunca recebe equipe, plano, dados da empresa nem histórico. Garçom aparece como "em breve" (chega com Mesas e comandas).

## D-052 — Ficha do funcionário ligada ao acesso (28/10/2026)

- `funcionarios.membro_id` (0054): a ficha da Gestão Empresarial aponta para o acesso da pessoa em Lojas e equipe (um para um, mesma loja, garantido no banco).
- **Adicionar pessoa** (Equipe), com usuário e senha: passo "Ficha do funcionário" — ligar a uma ficha que já existe, **criar a ficha agora** (nome, CPF, cargo, admissão, sem digitar de novo) ou "agora não". Em cada pessoa da equipe aparece a ficha (cargo e CPF) para o dono/gerente.
- **Gestão → Funcionários**: coluna "Acesso ao RES" com o usuário, botão **+ Criar acesso** (abre o passo a passo já com a ficha escolhida) e campo para ligar a um acesso existente (ex.: quem entrou por convite). Ao marcar a pessoa como desligada, a tela oferece **tirar o acesso ao RES junto**.

## D-053 — Custos do grupo ou de cada loja (28/10/2026)

- Quem tem **mais de uma loja na conta** vê, no topo de Custos fixos e variáveis, a escolha: **cada loja separada** ou **o grupo todo junto**. Só o titular da conta muda (`gestao_conta.modo`, 0055); pode trocar quando quiser, nada é apagado.
- **Separado**: uma planilha por loja (como antes) e a aba **Soma do grupo**, com faturamento, custos, sobra, margem e ponto de equilíbrio de cada loja e do total.
- **Grupo**: uma planilha só (`custos.conta_id`), com o modelo pronto e o faturamento das lojas somado (pedidos concluídos dos últimos 30 dias de todas) ou informado.
- Funcionários, faltas, advertências e dados da empresa continuam **por loja** (cada loja pode ter CNPJ e equipe próprios).

## D-054 — Novo funcionário já cria o acesso (28/10/2026)

- Em **Gestão → Funcionários**, a ficha tem o bloco **Acesso ao RES**: **criar o acesso agora** (função no RES, usuário sugerido pelo nome e senha gerada; recomendado para quem vai usar o sistema), **já tem acesso** (ligar a um existente, ex.: convite) ou **sem acesso** (quem não usa o sistema).
- "Salvar e criar acesso" grava a ficha, cria o usuário e liga os dois; sai o mesmo **cartão de acesso** da Equipe (imprimir, WhatsApp, copiar). Se o usuário já existir, a ficha fica salva e a tela pede outro usuário.
- O botão "+ Criar acesso" da lista abre a própria ficha com esse bloco (não precisa ir para Lojas e equipe). Gerente só aparece para o dono.
