# Plano: front-end do mapa (Fase 4)

Etapas para entregar o que pede `Docs/especificacao_mapa.md`. Aprovado em 03/11/2026.
As respostas da entrevista estão na especificação, seção 5. As decisões estão no README, seção 5 (22 a 41).

> Regras de cada etapa: branch própria, commits por unidade lógica e PR aberta pelo autor (`CLAUDE.md`, Git). `pytest` e `ruff` rodam antes de cada commit, então o item 9 da verificação vale para todas as etapas e não é repetido. Cada etapa termina com evidência (screenshot, saída de comando), não com "pronto".

---

## 1. Visão geral

| Etapa | Entrega | Branch | Depende de | Situação |
|---|---|---|---|---|
| 0 | Teste do protótipo de baixa fidelidade (autor) | — | — | Pendente |
| 1 | Centro padrão e dados de desenvolvimento no back | `feat/centro-padrao-e-dados-dev` | — | Concluída (PR #20) |
| 2 | Página com o mapa | `feat/pagina-mapa` | 1 | Concluída (PR #21) |
| 3 | Locais no mapa e na lista | `feat/locais-mapa-lista` | 2 | Concluída (PR #22) |
| 4 | Layout responsivo | `feat/layout-responsivo` | 3 (a 0 virou validação depois; decisão 39) | Concluída (PR #25) |
| 5 | Filtros e "Buscar nesta área" | `feat/filtros-busca-area` | 3 (a 4 reposiciona a interface) | Concluída (PR #24) |
| 6 | Busca por endereço | `feat/busca-endereco` | 5 | Concluída (PR #26) |
| 7 | Geolocalização | `feat/geolocalizacao` | 6 | Concluída (PR #27) |
| 8 | Painel de detalhes. **Marco:** fecha a entrega só de leitura | `feat/painel-detalhes` | 7 | Concluída (PR #29) |
| 9 | Sessão no painel | `feat/sessao-front` | 8 | Concluída (PR #30) |
| 10 | Configurações no back | `feat/api-conta` | — | Concluída (PR #23) |
| 11 | Configurações no front | `feat/configuracoes-front` | 9 e 10 | Concluída (PR #31) |
| 12 | Adicionar local: escolha do ponto | `feat/cadastro-local-ponto` | 9 | Pendente |
| 13 | Adicionar local: formulário em etapas | `feat/cadastro-local-formulario` | 12 | Pendente |

As etapas 1 a 3 não dependem do layout e andam em paralelo com a etapa 0. A etapa 10 é só back-end e pode ser adiantada, por exemplo enquanto a etapa 0 não termina.

---

## 2. Arquivos ao fim do plano

```
paginas/
├── apps.py, urls.py, views.py
├── templates/paginas/
│   ├── base.html
│   └── mapa.html
├── static/paginas/
│   ├── css/principal.css
│   ├── js/
│   │   ├── principal.js       Ponto de entrada: abertura da página (Docs/API.md, 6.1)
│   │   ├── api.js             $.ajax com CSRF só para /api/ e barra final conferida
│   │   ├── anuncio.js         Região aria-live
│   │   ├── formatacao.js      Funções puras: distância, data, rótulos
│   │   ├── mapa.js            Leaflet: marcadores, seleção, movimento reduzido
│   │   ├── lista.js           Lista textual (RN-10)
│   │   ├── layout.js          Menu, alternância Mapa/Lista, inert
│   │   ├── busca.js           Filtros e "Buscar nesta área"
│   │   ├── endereco.js        Nominatim
│   │   ├── localizacao.js     Geolocalização
│   │   ├── detalhes.js        Painel de detalhes
│   │   ├── navegacao.js       ?local=id e o Voltar do navegador
│   │   ├── sessao.js          Entrar, cadastro de conta, sair
│   │   ├── conta.js           Configurações
│   │   └── cadastro_local.js  Adicionar local
│   ├── testes/                Página do QUnit e arquivos *.test.js
│   └── vendor/                jquery/, leaflet/, qunit/, com as licenças
└── tests/test_views.py
```

---

## 3. Etapas

### Etapa 0: teste do protótipo (autor)

- **Entrega:** teste com 2 ou 3 pessoas, incluindo o perfil de E04, e as conclusões em `Docs/teste_prototipo.md`.
- **Quem faz:** o autor. Claude pode revisar o roteiro, mas não gera resultados (`CLAUDE.md`, Limite ético).
- **Bloqueava** a etapa 4. Mudou em 04/11/2026 (decisão 39): o layout veio antes, a partir de uma entrevista com o autor, e o teste passa a usar o próprio HTML da etapa 4 como protótipo. As conclusões continuam indo para `Docs/teste_prototipo.md` e podem mudar o layout.

### Etapa 1: centro padrão e dados de desenvolvimento no back

- **Entrega:**
  - Constante `CENTRO_PADRAO` (latitude, longitude e zoom), comentada, em `locais/servicos.py`, ao lado de `RAIO_MAXIMO_M`. As coordenadas vêm do nó de Araraquara no OSM, conferidas na implementação.
  - `/api/opcoes/` passa a devolver `busca.centro_padrao` (decisão 25).
  - Comando `manage.py carregar_locais_araraquara`, que pode rodar várias vezes: cadastra os 5 locais reais e seus equipamentos pela regra de duplicata da API e pula os que já existem (decisão 37, que substituiu a fixture da 36).
  - `COORDENADAS` e `EQUIPAMENTOS` saem do `conftest.py` para `locais/dados_araraquara.py`, fonte única dos testes e do comando.
  - Dois commits: um para o centro padrão, outro para o comando.
- **Arquivos:** `locais/servicos.py`, `config/views.py`, `tests/test_opcoes.py`, `locais/dados_araraquara.py`, `conftest.py`, `locais/management/commands/carregar_locais_araraquara.py`, `locais/tests/test_comandos.py`, `Docs/API.md` (Opcoes), `Docs/testes_das_rotas.md`, `Docs/modelo_dados.md` (constante) e `Docs/comandos_de_teste.md` (dados de desenvolvimento).
- **Conceitos novos:** comando de gerenciamento (`BaseCommand`), parecido com um `CommandLineRunner` do Spring Boot, mas executado sob demanda; `call_command` para chamá-lo no teste; `transaction.atomic`, equivalente ao `@Transactional`.
- **Verificação:** a saída do comando no banco local, e os testes do comando com controle positivo (banco vazio, segunda execução e local já existente com outro nome).

### Etapa 2: página com o mapa

- **Entrega:**
  - O app `paginas` (decisão 26) serve `/`, com o mapa em tela cheia no centro padrão. Tiles do OSM, atribuição visível e zoom com títulos em português.
  - Na abertura, a página chama `/api/auth/sessao/` e `/api/opcoes/`.
  - `api.js` lê o cookie `csrftoken` a cada requisição. O `X-CSRFToken` só vai para URLs que começam com `/api/`, e não para a URL assinada (`Docs/API.md`, 6.3). O mesmo arquivo recusa URL sem barra final (bug 1 do HANDOFF).
  - Região `aria-live` na página.
  - jQuery 3.7.1, Leaflet 1.9.4 e QUnit 3.0.0 copiados em `vendor/`, com as licenças (decisão 27), do registro do npm e conferidos pelo sha512.
  - Página do QUnit em `/static/paginas/testes/index.html`, com o teste da leitura do cookie.
  - Adiantado da etapa 3: `js/mapa.js` cria o mapa, e com `prefers-reduced-motion` (`matchMedia`) as animações já nascem desligadas.
- **Arquivos:** `paginas/` com `apps.py`, `urls.py` e `views.py`; `templates/paginas/base.html` e `mapa.html`; `css/principal.css`; `js/principal.js`, `js/api.js`, `js/anuncio.js` e `js/mapa.js`; `vendor/`; `testes/`; `paginas/tests/test_views.py`; `config/settings.py` (`INSTALLED_APPS`) e `config/urls.py`.
- **Conceitos novos:**

  | Django ou JavaScript | Equivalente em Java/Spring |
  |---|---|
  | App Django | Módulo |
  | `TemplateView` | `@Controller` que devolve o nome da view |
  | Templates do Django; `{% static %}` | Thymeleaf; `@{/...}` |
  | App `staticfiles` | `classpath:/static` do Spring Boot |
  | Módulos ES (`import`/`export`, decisão 34) | `import` de pacotes |
  | jqXHR, o retorno do `$.ajax` | `CompletableFuture` |
  | QUnit (decisão 35) | JUnit |
  | `assertTemplateUsed` | `view().name()` do MockMvc |

- **Verificação:** item 1 da seção 6, e o QUnit verde, com screenshot.

### Etapa 3: locais no mapa e na lista

- **Entrega:**
  - Layout provisório: a lista fica ao lado do mapa. O layout definitivo vem na etapa 4.
  - Uma chamada só, `GET /api/locais/?latitude=&longitude=&raio=`, a partir do centro padrão (decisão 31).
  - Os marcadores são adicionados em ordem de distância, então o Tab segue a lista (decisão 30). Usam `keyboard: true` e `alt` com o nome do local, e Enter seleciona.
  - A lista `<ol>` mostra nome, distância com a origem ("1,2 km do centro do mapa"), tipos de equipamento (rótulos de `/api/opcoes/`) e comodidades.
  - Lista e mapa andam juntos. O item escolhido recebe `aria-current`, e o marcador escolhido muda de forma e de tamanho, não só de cor.
  - Link "Pular para a lista" antes do mapa.
  - O resultado é anunciado ("2 locais a até 2 km do centro do mapa", com os dados da etapa 1). Sem resultados, a mensagem diz o que fazer e oferece "Buscar até 10 km" (o raio máximo de `/api/opcoes/`). A segunda ação, "Cadastrar um local", entra na etapa 13.
  - Com `prefers-reduced-motion`, `setView` sem animação.
  - Descoberto na implementação, no Leaflet 1.9.4: o marcador ganha `role="button"`, mas Enter e Espaço não o ativam, e o tooltip leria o nome duas vezes (`aria-describedby`). Por isso as duas teclas são tratadas no `keydown` do marcador, o nome visível é um rótulo em CSS, que o Esc esconde (WCAG 1.4.13), e o destaque troca uma classe no mesmo elemento, porque `setIcon` recriaria o marcador e tiraria o foco.
  - Sem resultados no raio máximo, a mensagem não pede para aumentar o raio: diz que esse é o maior raio e que ainda não há locais na região.
  - Os rótulos das comodidades (Bebedouro, Sanitário, Bancos) ficam em `formatacao.js`: são campos fixos do contrato, e não uma lista de escolhas de `/api/opcoes/`.
- **Arquivos:** `js/mapa.js`, `js/lista.js`, `js/formatacao.js`, `js/principal.js`, `testes/formatacao.test.js`, o template e o CSS.
- **Conceitos novos:**
  - Camadas do Leaflet (`L.map`, `L.tileLayer`, `L.marker`, `L.layerGroup`).
  - Delegação de eventos no jQuery: um único listener para a lista toda.
  - `Intl.NumberFormat`, equivalente ao `NumberFormat` com o Locale pt-BR.
  - `matchMedia` já entrou na etapa 2; aqui ele passa a valer também para o `setView`.
- **Verificação:** itens 3 (sem filtros ainda), 4 (marcadores e lista), 5 e 7.

### Etapa 4: layout responsivo

Feita antes das conclusões da etapa 0 (decisão 39), com o layout definido pelo autor em entrevista (decisão 40; especificação, seção 5).

- **Como ficou:**
  - Barra superior com "☰ Menu" (ícone com texto visível) e o título "Mapa de Calistenia"; faixa de anúncios logo abaixo, visível e lida em qualquer visão.
  - Painel à esquerda, sempre visível em tela larga, com uma visão por vez: Lista (com a linha dos filtros ativos e "Alterar filtros") e Buscar (os filtros da etapa 5, mais "Voltar à lista"). Aplicar filtros volta para a lista, com o foco no título; Esc na visão Buscar volta para a lista.
  - Menu como gaveta de navegação, igual em toda largura, fechada no início. Ao abrir, o resto da página recebe `inert`, menos a faixa de anúncios. Itens: Buscar e Lista de locais; "Entrar" fica para a etapa 9, quando funcionar.
  - Abaixo de 48em, barra inferior Mapa/Lista com `aria-current`, o Mapa na frente. Escolher um local na lista leva ao Mapa, centraliza sem animação e põe o foco no marcador. O `moveend` do `invalidateSize()` não oferece "Buscar nesta área".
  - Dois links de pular: "Pular para a lista" e "Pular para o mapa". Com o painel à esquerda, a lista vem antes do mapa no Tab; o segundo link evita atravessá-la.
  - A página é uma grade da altura da tela, sem `position: fixed` sobre o conteúdo, e o painel rola por dentro: as barras não encobrem o foco (WCAG 2.4.11).
  - Achados na verificação e na revisão:
    - Os cliques da lista estavam ligados a um id que deixou de existir. Um teste novo confere que todo id usado como seletor nos módulos existe na página.
    - O Esc só sai da visão Buscar com o foco dentro dela; com o foco num marcador, só esconde o nome sobre o local.
    - "Buscar nesta área" foi para o canto superior esquerdo do mapa, com largura limitada: centralizado, cobria os rótulos do zoom em 320 px.
    - O mapa é medido de novo por `ajustarTamanho()` no resize da janela (`trackResize` desligado), e só quando está visível: girar o celular ou cruzar 48em não oferece "Buscar nesta área". Desde a etapa 7, o aviso vem do resize do próprio contêiner (ver o achado da verificação lá).
    - O `runserver` não manda cabeçalho de cache, e o navegador pode manter módulos antigos: a dica de recarregar ignorando o cache está em `Docs/comandos_de_teste.md`.
- **Entrega prevista no plano original:**
  - Menu lateral recolhível. O botão tem `aria-expanded` e `aria-controls`, e Esc fecha o menu e devolve o foco ao botão. Itens: Buscar, Lista de locais e Entrar; os outros entram nas etapas que os implementam.
  - Painel de resultados.
  - Abaixo de 48em, um botão alterna entre Mapa e Lista (decisão 29). O limite é em `em` para valer também com zoom de 400%.
  - Com a gaveta aberta, o resto da tela recebe `inert`.
  - Alvos de toque com pelo menos 24 × 24 px. O foco fica sempre visível e nunca encoberto.
  - Rótulo visível nos botões de zoom ("+ Aproximar", "− Afastar"). Na etapa 2 eles já têm nome acessível em português; o texto visível muda o visual dos controles e por isso espera o layout.
  - Mover o formulário de filtros da etapa 5, hoje na seção "Buscar" acima da lista, para o item Buscar do menu, e rever a posição do botão "Buscar nesta área".
- **Arquivos:** o template, o CSS e `js/layout.js`.
- **Conceitos novos:** media query em `em`, o atributo `inert` e o padrão disclosure do WAI-ARIA.
- **Verificação:** itens 4 (menu e Esc), 6 e 8 (axe e Lighthouse na tela base).

### Etapa 5: filtros e "Buscar nesta área"

- **Entrega:**
  - Filtros de tipo, altura máxima e raio no item Buscar, com os limites de `opcoes.busca`. Uma chamada continua alimentando mapa e lista.
  - Depois de mover o mapa (`moveend`), aparece o botão "Buscar nesta área". O raio vai do centro ao canto da área visível, limitado ao máximo da API, e o anúncio avisa quando o limite cortou a área.
  - Sem resultados no raio máximo, a mensagem da etapa 3 ("Esse é o maior raio da busca") passa a sugerir mover o mapa e buscar nesta área.
  - Feita antes da etapa 4, por decisão do autor em 04/11/2026, com interface provisória: os filtros ficam numa seção "Buscar" acima da lista. A lógica e os testes são definitivos; a etapa 4 só reposiciona a interface.
  - Na implementação:
    - O estado da busca (ponto, origem, raio e filtros) é um objeto só. Aplicar filtros mantém o ponto; "Buscar nesta área" troca o ponto pelo centro do mapa. Escolher um local na lista move o mapa, mas não muda o ponto.
    - O seletor de raio tem os degraus de 500 m a 10 km (constante comentada em `busca.js`) e ganha a opção "Área visível do mapa (3,4 km)" depois de "Buscar nesta área".
    - O botão só aparece depois de movimento feito pela pessoa: o `mapa.js` ignora o `moveend` do próprio código. Ele fica antes do mapa no HTML (com o mapa em foco, Shift+Tab chega nele), é anunciado na primeira vez que aparece, e depois da busca o foco vai para o título da lista.
    - O anúncio cita os filtros ("1 local com equipamento do tipo Espaldar a até 10 km do centro do mapa."). Sem resultados com filtros, sugere mudá-los.
    - A altura é um campo de texto com teclado numérico, validado no front com mensagem que diz como corrigir: um campo `number` esconderia o texto inválido como valor vazio.
    - Achados na revisão: sem resultados com a área cortada, o anúncio sugere aproximar o mapa; o estado da busca, o seletor de raio e o botão só mudam quando a busca dá certo, então numa falha o foco fica no botão para tentar de novo; a longitude do centro passa por `wrap()` (o mapa pode ser arrastado além do meridiano 180); e os movimentos do código são contados, e não marcados, porque duas escolhas rápidas na lista geram dois `moveend`.
- **Arquivos:** `js/busca.js`, `testes/busca.test.js` e o template.
- **Conceitos novos:**
  - `fieldset` com `legend`.
  - `$.param`, equivalente ao `UriComponentsBuilder`.
  - Eventos do Leaflet.
- **Verificação:** itens 3 e 5.

### Etapa 6: busca por endereço

- **Entrega:**
  - Busca direto no Nominatim (decisão 28), só no Enter ou no botão, com trava de 1 s. Parâmetros: `countrycodes=br`, `accept-language=pt-BR` e o `viewbox` do centro padrão, nunca o da posição.
  - Quando o endereço é ambíguo, até 5 resultados aparecem como botões.
  - Depois da escolha, o mapa recentraliza, a busca roda e a distância passa a ser "do endereço buscado".
  - O erro diz como corrigir. Exemplo: "Nenhum endereço encontrado para 'X'. Inclua o bairro e a cidade."
  - Na implementação:
    - A seção "Endereço ou lugar" fica na visão Buscar, acima dos filtros. O campo é `type="text"`: num `type="search"`, o Esc do Chrome apagaria o texto e fecharia a visão ao mesmo tempo. A ajuda avisa que o texto vai para o Nominatim.
    - O `viewbox` tem ±0,2° em volta do centro padrão, com `bounded=0`: dá preferência à região sem impedir outra cidade.
    - Dentro de 1 s, o pedido espera o que falta em vez de ser recusado; um pedido em curso ignora novos envios; a mesma busca usa o cache em memória, como pede a política do Nominatim.
    - Os rótulos tiram "Região …" e "Brasil" e mantêm o CEP, que distingue os trechos de uma mesma rua.
    - O ponto escolhido vira o ponto da busca, com origem "endereço"; raio e filtros continuam, menos o raio da área visível, que volta ao padrão. O painel volta para a lista, e o anúncio e a linha dos filtros citam o endereço.
    - Marcador "Endereço buscado" (decisão do autor): losango com rótulo sempre visível, sem foco nem clique e atrás dos locais. "Buscar nesta área" o remove. A etapa 7 reaproveita a mesma camada para "Você está aqui".
- **Arquivos:** `js/endereco.js`, `testes/endereco.test.js` (montagem dos parâmetros e trava) e o template.
- **Conceitos novos:** requisição para outra origem (CORS), sem CSRF, e limite de requisições no cliente.
- **Verificação:** item 5, e a metade "negada" do item 2, completada na etapa 7.

### Etapa 7: geolocalização

- **Entrega:**
  - A Permissions API decide o caminho:
    - `granted`: centraliza na pessoa e busca sem perguntar.
    - `prompt`: mostra o convite "Usar minha localização" no mapa e no painel.
    - Negada, indisponível ou acima de 10 s: mantém o centro, explica o que aconteceu e como mudar, e leva à busca por endereço.
  - O navegador só pede a permissão no clique. A página usa `getCurrentPosition`, não `watchPosition`.
  - Botão "Minha localização" com texto, e marcador "Você está aqui" distinto dos locais.
  - Se a pessoa moveu o mapa ou buscou um endereço antes da resposta, a vista dela não é tirada do lugar; só o marcador "Você está aqui" aparece.
  - Na implementação:
    - A permissão só é consultada depois da primeira busca, a do centro: as duas buscas juntas poderiam terminar fora de ordem, e a do centro apagaria a de "você". Se a primeira busca falhar, a localização não é tentada.
    - Navegador sem Permissions API conta como `prompt`. Bloqueada na abertura, a explicação fica no painel, sem anúncio, para não apagar o anúncio dos resultados.
    - O convite fica no topo da visão Lista, escondido até a página saber o estado da permissão. Ele some quando a posição chega, e o foco que estava nele vai para o título da lista. Numa falha, mostra a mensagem, "Usar minha localização" (menos sem suporte) e "Buscar por endereço", que abre a visão Buscar com o foco no campo.
    - Uma mensagem por motivo: bloqueada (na abertura), negada, indisponível, tempo e sem suporte (sem geolocalização ou fora de contexto seguro). Todas dizem o que fazer e terminam na busca por endereço.
    - `getCurrentPosition` com limite de 10 s, posição de até 1 minuto e sem alta precisão (constantes comentadas em `localizacao.js`). Um pedido de cada vez; o pedido vira uma Promise.
    - A posição vira o ponto da busca, com origem "você", pelo mesmo caminho do endereço da etapa 6 (`buscarAPartirDe` em `principal.js`); o marcador do endereço sai.
    - Um contador (`geracaoDaVista`) sobe quando a pessoa move o mapa, escolhe um endereço ou um local da lista. A resposta que encontra o contador mudado só marca a posição, e o anúncio explica por que o mapa ficou onde estava.
    - "Você está aqui" é um alvo, com o rótulo sempre visível acima. Tem camada própria, e não a do endereço, como previa a etapa 6: com a resposta atrasada, os dois aparecem juntos. Continua no mapa depois de "Buscar nesta área", porque marca onde a pessoa está.
    - "◎ Minha localização" fica abaixo do zoom. No Tab, vem depois dos marcadores, como o zoom (o Leaflet põe os controles depois das camadas); o convite do painel vem antes deles, e as instruções do mapa dizem a ordem.
    - Achados na revisão: na abertura, o contador vale desde antes da primeira busca, e não desde o pedido da posição, porque a pessoa pode mexer no mapa enquanto a busca ou a consulta da permissão não terminam; se ela move o mapa durante a busca "de você" (ou a do endereço), a lista muda, mas o mapa fica onde ela deixou, com "Buscar nesta área"; e o botão "Minha localização" só aparece depois de a primeira busca dar certo, porque sem ela o clique deixava a faixa parada em "Buscando sua localização…".
    - Achado na verificação: a faixa de anúncios muda a altura do mapa (some quando vazia e, em 320 px, vai de uma a quatro linhas conforme o texto), e o Leaflet guardava o tamanho da criação, feita com a faixa vazia. Em tela larga, depois de centralizar no endereço ou em "Você está aqui", o ponto ficava 18 px abaixo do centro visível, e "Buscar nesta área" media a área com 36 px a mais. Um `ResizeObserver` no contêiner do mapa substitui o resize da janela e chama `ajustarTamanho()` com a mesma espera, maior que a pausa do `anuncio.js`: o esvaziar e preencher de cada anúncio se anula e não move o mapa. Com o mapa em movimento, a medida fica para o `moveend`, porque a animação do Leaflet desfaria a correção. Fixar a altura da faixa foi descartado: cortaria o texto (WCAG 1.4.10) ou reservaria quatro linhas acima do mapa no celular. Continua o salto visual de 100 ms a cada anúncio, quando a faixa vazia some e o mapa sobe 36 px.
- **Arquivos:** `js/localizacao.js`, `js/mapa.js` e o teste das mensagens por código de erro.
- **Conceitos novos:**
  - Geolocation API com callbacks, e Permissions API com Promise.
  - `L.Control.extend`, equivalente a herdar de uma classe.
- **Verificação:** itens 2, 7 e 8 (sem aviso de geolocalização pedida no carregamento).

### Etapa 8: painel de detalhes

- **Entrega:**
  - `GET /api/locais/{id}/` com todos os campos da especificação, seção 2.4.
  - Condição com data ("Bom, registrado em 12/10/2026") ou "Sem registro de condição".
  - Comodidades como "Sim", "Não" e "Não informado".
  - Segurança por faixa de horário em tabela de texto.
  - Autoria com `criado_por` nulo (conta excluída ou dado de exemplo da etapa 1): "Cadastrado em {data}", sem nome.
  - Esc ou "Voltar à lista" devolvem o foco ao item ou ao marcador de origem.
  - `?local=id` com `pushState` (decisão 33). O Voltar do navegador fecha o painel, e o link direto abre o local.
  - Um id inválido mostra mensagem própria em português, e não o 404 em inglês da API (bug 2 do HANDOFF).
  - Na implementação:
    - A visão Detalhes é a terceira do painel. Ela abre na hora do clique, com o nome que a lista já tem e "Carregando os detalhes…", e o foco vai para o nome; o mapa centraliza e destaca o marcador na mesma hora. O conteúdo entra quando a API responde, e o anúncio diz "Detalhes de {nome}.". Achado na verificação: no Docker com Colima, a resposta às vezes levava 750 ms, e o clique parecia não fazer nada.
    - Pela lista, o mapa vai até o local; pelo marcador, fica onde está. Em qualquer largura, escolher na lista abre os detalhes, e "Mostrar no mapa" leva o foco ao marcador e, em tela estreita, traz o Mapa para a frente (decisão 41, que revê a parte da 40 sobre a lista em tela estreita). Em tela estreita, os detalhes abertos pelo marcador voltam ao Mapa, no marcador.
    - A distância é o texto da lista, porque a rota de detalhe não a traz. Fora do resultado da busca, a linha e "Mostrar no mapa" somem; depois de uma busca nova com o painel aberto, distância e destaque acompanham o resultado. "Buscar nesta área" volta para a lista, onde está o resultado.
    - Segurança numa tabela de três colunas (Faixa, Movimento e Iluminação), com as avaliações na célula da faixa: com quatro colunas, em 320 px, as palavras se partiam no meio. Comodidades numa lista de definição. Datas no fuso de São Paulo, o da API (`formatarData`).
    - Histórico: abrir e fechar criam entradas (`pushState`), também quando o menu ou "Buscar nesta área" tiram os detalhes da tela. O Voltar fecha o painel e devolve o foco à origem; o Avançar o reabre. `registrarLocal` só cria entrada quando a URL ainda não diz o que a tela mostra, então o que o `popstate` abre ou fecha não entra de novo.
    - Link direto: a página busca o detalhe antes de criar o mapa, que abre no local, e a busca parte dali (decisão 31); a distância vira "No centro do mapa". Com a permissão de localização já dada, a abertura pelo link conta como escolha da vista, e só aparece "Você está aqui"; o anúncio dessa situação, da etapa 7, ficou neutro.
    - Um id que não é número (`abc`, `0`, `07`) não vai à API. Ele e o 404 mostram "Local não encontrado", com o que fazer.
    - Uma resposta atrasada não cobre o local escolhido depois (`pedidoDeDetalhes`), e fechar o painel antes da resposta a descarta.
    - Os botões de contribuição (especificação, 2.4) ficam para a etapa 9, como previsto.
    - Achados na revisão: um erro que chega depois do clique só preenche o painel e é anunciado, sem trazer o painel para a frente nem mover o foco, porque a pessoa pode ter ido para o Mapa; a entrada do histórico guarda quem abriu os detalhes, e o Voltar e o Avançar reabrem como da primeira vez (pelo marcador, o mapa fica onde está e o Esc volta ao marcador); e abrir um local fora do resultado tira o destaque do anterior.
- **Arquivos:** `js/detalhes.js`, `js/navegacao.js`, `testes/detalhes.test.js`, `testes/navegacao.test.js` e o template.
- **Conceitos novos:** `pushState` e `popstate`, `URLSearchParams` e gerenciamento de foco.
- **Verificação:** itens 4 e 5.
- **Marco:** aqui a entrega só de leitura do HANDOFF (seção 5) fica completa. Os 9 itens da seção 6 rodam inteiros.

### Etapa 9: sessão no painel

- **Entrega:**
  - Entrar e Sair no menu; com sessão aberta, o menu mostra o nome do usuário.
  - Login e cadastro de conta no painel lateral (decisão 32).
  - Os erros 400 aparecem junto do campo, com `aria-describedby`, e `non_field_errors` no topo do formulário.
  - Depois do login, a pessoa volta ao local e à ação pendente. O logout a mantém no mapa como visitante (decisão 22).
  - Os botões de contribuição (avaliar, registrar condição, denunciar) aparecem no painel de detalhes. Sem login, levam ao login e voltam ao local. Com login, anunciam que a função chega numa etapa seguinte, até ser implementada.
  - Na implementação:
    - `sessao.js` lê o `GET /api/auth/sessao/` da abertura, que também grava o cookie `csrftoken`. Visitante vê "Entrar" no menu; com sessão, "Conectado como {nome}" e "Sair".
    - Entrar e Criar conta são duas visões do painel, com um botão para trocar de uma para a outra. O "Voltar…" do topo diz para onde volta ("Voltar a Parque Infantil" ou "Voltar à lista"), e o Esc faz o mesmo. Os campos têm `autocomplete` `username`, `current-password` e `new-password` (WCAG 1.3.5), e o gerenciador de senhas preenche (WCAG 3.3.8).
    - Erros: campo vazio é conferido antes de ir à API, com mensagem nossa ("Informe o nome de usuário."), porque o "Este campo é obrigatório." da API não diz qual. O 400 de um campo fica junto dele, com `aria-invalid` e `aria-describedby`, e a ajuda continua na descrição; o `non_field_errors` fica no topo, com o foco nele. O 403 de CSRF e a falha de rede têm mensagem própria, sem o texto em inglês. Todo erro também é anunciado.
    - Achado na verificação: com nome em uso e senha fraca, a API só devolve o erro do nome, porque o `validate()` do DRF não roda com um campo inválido; o da senha aparece no envio seguinte.
    - A ação pendente guarda local, nome, ação e origem. Depois do login ou do cadastro, os detalhes reabrem, o foco vai para o botão da ação (só se a pessoa continua nos detalhes) e o anúncio diz "Você entrou como {nome}." e que a ação chega numa próxima versão. Sem ação pendente, a pessoa volta à lista. Cancelar reabre o local, no botão que pediu o login, e a origem dos detalhes continua: o Esc depois volta ao marcador ou ao item.
    - Ir para Entrar fecha os detalhes na URL, como o menu; o Voltar do navegador na tela de login reabre o local.
    - Sair leva o foco ao botão Menu e mantém a pessoa no mapa (decisão 22). Um 403 no logout (sessão que já tinha caído) confere a sessão de novo e diz isso.
    - Depois do login, os campos são esvaziados. O logout seguinte, já com o token CSRF trocado pelo login, confirmou que o `api.js` lê o cookie a cada requisição.
    - A seção Contribuir fica no fim dos detalhes e só aparece com o local carregado. O visitante lê "Para contribuir, entre na sua conta. Depois, você volta para este local."
    - Achados na revisão: se a pessoa sai de Entrar (Esc, menu ou Voltar do navegador) antes da resposta do login, a resposta só atualiza o menu e anuncia "Você entrou como…", sem mudar a tela nem o foco; se o local pendente não abre depois do login, o anúncio do erro começa por "Você entrou como…"; e as falhas do logout dizem o que fazer conforme a causa (sem conexão, ou "recarregue a página"), também quando a conferência da sessão falha.
- **Arquivos:** `js/sessao.js`, `js/detalhes.js`, `testes/sessao.test.js` e o template.
- **Conceitos novos:**
  - A ação pendente equivale ao `SavedRequest` do Spring Security.
  - O token CSRF muda no login, por isso `api.js` lê o cookie a cada requisição.
- **Verificação:** itens 4 e 5, e o fluxo do login de volta ao local.

### Etapa 10: Configurações no back

- **Entrega:** duas rotas novas, que exigem login e CSRF (decisão 23):

  | Método | Rota | Entrada | Resposta |
  |---|---|---|---|
  | PUT | `/api/auth/conta/` | `username*`, `senha_atual*` | 200 Usuario |
  | POST | `/api/auth/conta/senha/` | `senha_atual*`, `nova_senha*` | 204 |

  - PUT, e não PATCH como estava previsto: os dois campos são obrigatórios, e o drf-spectacular marcaria como opcionais os campos de um PATCH (decisão 38).
  - Senha atual errada ou ausente responde 400 em `senha_atual`, com orientação.
  - A nova senha passa pelos `AUTH_PASSWORD_VALIDATORS` e precisa ser diferente da atual.
  - Nome em uso responde "Este nome de usuário já está em uso. Escolha outro.", também no cadastro.
  - Achado na revisão: o nome passa a ser normalizado (Unicode NFKC) antes dos validadores, no cadastro, no login e na troca. Sem isso, a troca aceitava uma imitação em letras de largura total do nome de outra conta, e o cadastro respondia 500 nesse caso.
  - Depois da troca de senha, `update_session_auth_hash` mantém a sessão atual e derruba as outras.
  - As regras são validação de serializer, sem `servicos.py` novo, porque CRUD é CRUD.
- **Arquivos:** `usuarios/serializers.py`, `views.py` e `urls.py`; `usuarios/tests/test_api_conta.py`; `Docs/API.md` e `Docs/testes_das_rotas.md`.
- **Conceitos novos:**
  - `check_password`, equivalente ao `PasswordEncoder.matches`.
  - `validate_password`, equivalente a um validador de senha.
  - `update_session_auth_hash`, equivalente a invalidar as outras sessões no Spring Security.
- **Verificação:** testes com o cliente que cobra CSRF e com controle positivo, incluindo um segundo cliente cuja sessão cai depois da troca de senha. `spectacular --validate --fail-on-warn` sem avisos.

### Etapa 11: Configurações no front

- **Entrega:** o item Configurações aparece no menu só com sessão aberta. São dois formulários no painel, nome e senha, e cada um pede a senha atual. Depois da troca, o nome novo aparece no menu, e o resultado é anunciado.
- Na implementação:
  - O item fica entre "Lista de locais" e "Sair", e o `definirUsuario` do `sessao.js` o mostra e esconde junto com Entrar e Sair. A visão Configurações tem "Voltar à lista" e Esc, como Buscar.
  - Formulário do nome: "Nome atual: {nome}.", o novo nome e a senha atual. Formulário da senha: a senha atual e a nova. Os campos têm `autocomplete` `username`, `current-password` e `new-password` (WCAG 1.3.5), e a ajuda da senha atual diz por que ela é pedida.
  - Conferidos antes de ir à API: campo vazio e o nome que já é o seu, também na forma de largura total (`normalize("NFKC")`, como a API). Sem isso, a API aceitaria o mesmo nome e a página diria que trocou.
  - Depois da troca, os campos são esvaziados e o foco fica no botão. O nome novo vai para o menu e para "Nome atual", e o anúncio diz onde ele aparece (menu e autoria, RN-08). A troca de senha anuncia que esta sessão continua e as outras foram encerradas (decisão 23).
  - Um 403 confere a sessão com a API: se ela caiu (a senha foi trocada em outro lugar, por exemplo), o menu volta a mostrar Entrar e a mensagem diz para entrar de novo; senão, pede para recarregar a página.
  - Sair com Configurações aberta leva o painel para a lista, sem tirar o foco do Menu.
  - Os quatro formulários do painel mostram os erros do mesmo jeito: a lógica saiu do `sessao.js` para `formularios.js`, sem mudar o comportamento da etapa 9 (a verificação dela no Chrome deu os mesmos resultados).
  - Achado na verificação: com duas janelas na mesma conta, a troca de senha numa derruba a sessão da outra, e a outra só descobre no próximo pedido; é esse 403 que mostra "Sua sessão terminou".
  - Achados na revisão: Sair com a sessão já caída (logout com 403) também tira Configurações da tela; e quem envia com Enter num campo tem o foco levado ao botão depois da troca, porque o campo fica vazio.
- **Arquivos:** `js/conta.js`, `js/formularios.js`, `js/sessao.js`, `testes/conta.test.js`, `testes/formularios.test.js` e o template.
- **Verificação:** itens 4 e 5.

### Etapa 12: adicionar local, escolha do ponto

- **Entrega:** três entradas equivalentes para o ponto (especificação, seção 3):
  - Mira fixa no centro: as setas movem o mapa, e "Usar o centro do mapa" confirma. É a alternativa a arrastar (WCAG 2.5.7) e o caminho por teclado.
  - Clique no mapa.
  - Endereço, reaproveitando a etapa 6.
  - Esc cancela o modo de cadastro.
- Na implementação:
  - O item "Adicionar local" aparece para todos, na ordem da especificação (2.5). Sem sessão, leva a Entrar com o contexto "Entre ou crie uma conta para adicionar um local", pela mesma ação pendente da etapa 9, e depois do login a pessoa entra direto no modo.
  - O modo é a visão "Adicionar local" do painel e vale só enquanto ela está na tela: Cancelar, Esc, o menu, um marcador, o Voltar do navegador e Sair o encerram (`aoTrocarVisao`). Enquanto dura, aparecem a mira (só visual, `aria-hidden`) e "Usar o centro do mapa", no lugar de "Buscar nesta área", que não aparece no modo; o `aria-describedby` do mapa passa a apontar instruções próprias.
  - "Usar o centro do mapa" fica antes do mapa no HTML, como "Buscar nesta área": com o mapa em foco, Shift+Tab chega nele depois das setas.
  - O clique no mapa escolhe o ponto; o clique num marcador continua abrindo os detalhes daquele local, e isso encerra o modo.
  - O endereço usa o `endereco.js`, adaptado num commit próprio para servir mais de um formulário (ids por prefixo, a mesma trava de 1 s e o mesmo cache), sem mudar a visão Buscar: a mesma verificação, com o Nominatim simulado, deu o mesmo resultado antes e depois.
  - O ponto escolhido ganha o marcador "Novo local", um quadrado. O painel diz como ele foi escolhido ("pelo centro do mapa", "por um clique no mapa" ou "pelo endereço …") e mostra as coordenadas em pt-BR, com o foco no título "Ponto escolhido"; em tela estreita, o painel vem para a frente. "Escolher outro ponto" recomeça, e "Continuar" anuncia que nome e comodidades chegam numa próxima versão (etapa 13).
  - O Esc cancela com o foco na visão, em "Usar o centro do mapa" ou no próprio mapa; num marcador, continua só escondendo o nome (WCAG 1.4.13). Sair da conta com o modo aberto volta à lista, como Configurações.
  - A mira tem linhas escuras com contorno branco, para o contraste de 3:1 sobre qualquer tile (WCAG 1.4.11).
  - Achado na verificação: a faixa de anúncios muda de altura e o mapa é medido de novo (etapa 7), o que o desloca alguns pixels; o marcador do ponto acompanha o lugar escolhido, e a mira continua no centro.
- **Arquivos:** `js/cadastro_local.js`, `js/endereco.js`, `js/mapa.js`, `js/sessao.js`, `testes/cadastro_local.test.js`, o CSS da mira e o template.
- **Verificação:** itens 4 e 5.

### Etapa 13: adicionar local, formulário em etapas

- **Entrega:**
  - Primeiro nome e comodidades. Comodidade não respondida vai como `null` ("não informado").
  - Se o POST responder 409 (`Docs/API.md`, 6.2): "É este lugar" abre o local existente, e "É outro lugar" reenvia com `confirmar_novo`.
  - Com 201, a pessoa acrescenta os equipamentos. `nome_outro` só aparece com o tipo "outro", e largura só com barras paralelas.
  - Ao concluir, o local novo aparece no mapa e na lista, e o resultado é anunciado.
  - Na lista vazia, o botão "Cadastrar um local", a segunda ação da especificação (2.3), ao lado de "Buscar até 10 km" (etapa 3).
- **Arquivos:** `js/cadastro_local.js`, `testes/cadastro_local.test.js` (montagem do corpo) e o template.
- **Verificação:** itens 3, 4 e 5.

---

## 4. Cobertura da verificação

Itens da especificação, seção 6, e as etapas que os verificam.

| Item | Etapas |
|---|---|
| 1. Tiles do OSM carregados | 2 |
| 2. Geolocalização permitida e negada | 6 e 7 |
| 3. Mapa e lista com os mesmos locais | 3, 5 e 13 |
| 4. Só com teclado | 3, 4, 8, 9, 11, 12 e 13 |
| 5. Anúncios no leitor de tela | 3 em diante |
| 6. 320 px sem rolagem horizontal | 4 |
| 7. Movimento reduzido | 3 e 7 |
| 8. axe e Lighthouse | 4, 7 e o marco da etapa 8 |
| 9. `pytest` e `ruff` | Todas |

---

## 5. Pendências para a Fase 5

| Item | Observação |
|---|---|
| Módulos ES com `ManifestStaticFilesStorage` | O Django só reescreve os `import` com os nomes de arquivo versionados se `support_js_module_import_aggregation` estiver ligado |
| Página do QUnit no `collectstatic` | Excluir com `collectstatic --ignore`, para os testes não irem para produção |

---

## 6. Fora deste plano

- Avaliação de segurança e limpeza, registro de condição, denúncia e envio de foto (especificação, seção 4). Seguem num plano próprio, na ordem do HANDOFF, seção 5.
- Excluir a conta: Configurações cobre só nome de usuário e senha (decisão 23).
- Tudo o que a seção 4 da especificação e o `CLAUDE.md` já deixam de fora.
