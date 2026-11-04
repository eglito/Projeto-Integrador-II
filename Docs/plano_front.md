# Plano: front-end do mapa (Fase 4)

Etapas para entregar o que pede `Docs/especificacao_mapa.md`. Aprovado em 03/11/2026.
As respostas da entrevista estão na especificação, seção 5. As decisões estão no README, seção 5 (22 a 37).

> Regras de cada etapa: branch própria, commits por unidade lógica e PR aberta pelo autor (`CLAUDE.md`, Git). `pytest` e `ruff` rodam antes de cada commit, então o item 9 da verificação vale para todas as etapas e não é repetido. Cada etapa termina com evidência (screenshot, saída de comando), não com "pronto".

---

## 1. Visão geral

| Etapa | Entrega | Branch | Depende de | Situação |
|---|---|---|---|---|
| 0 | Teste do protótipo de baixa fidelidade (autor) | — | — | Pendente |
| 1 | Centro padrão e dados de desenvolvimento no back | `feat/centro-padrao-e-dados-dev` | — | Concluída (PR #20) |
| 2 | Página com o mapa | `feat/pagina-mapa` | 1 | Concluída (PR #21) |
| 3 | Locais no mapa e na lista | `feat/locais-mapa-lista` | 2 | Pendente |
| 4 | Layout responsivo | `feat/layout-responsivo` | 0 e 3 | Pendente |
| 5 | Filtros e "Buscar nesta área" | `feat/filtros-busca-area` | 4 | Pendente |
| 6 | Busca por endereço | `feat/busca-endereco` | 5 | Pendente |
| 7 | Geolocalização | `feat/geolocalizacao` | 6 | Pendente |
| 8 | Painel de detalhes. **Marco:** fecha a entrega só de leitura | `feat/painel-detalhes` | 7 | Pendente |
| 9 | Sessão no painel | `feat/sessao-front` | 8 | Pendente |
| 10 | Configurações no back | `feat/api-conta` | — | Pendente |
| 11 | Configurações no front | `feat/configuracoes-front` | 9 e 10 | Pendente |
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
- **Bloqueia:** a etapa 4. O layout espera as conclusões.

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

Começa só com as conclusões da etapa 0.

- **Entrega:**
  - Menu lateral recolhível. O botão tem `aria-expanded` e `aria-controls`, e Esc fecha o menu e devolve o foco ao botão. Itens: Buscar, Lista de locais e Entrar; os outros entram nas etapas que os implementam.
  - Painel de resultados.
  - Abaixo de 48em, um botão alterna entre Mapa e Lista (decisão 29). O limite é em `em` para valer também com zoom de 400%.
  - Com a gaveta aberta, o resto da tela recebe `inert`.
  - Alvos de toque com pelo menos 24 × 24 px. O foco fica sempre visível e nunca encoberto.
  - Rótulo visível nos botões de zoom ("+ Aproximar", "− Afastar"). Na etapa 2 eles já têm nome acessível em português; o texto visível muda o visual dos controles e por isso espera o layout.
- **Arquivos:** o template, o CSS e `js/layout.js`.
- **Conceitos novos:** media query em `em`, o atributo `inert` e o padrão disclosure do WAI-ARIA.
- **Verificação:** itens 4 (menu e Esc), 6 e 8 (axe e Lighthouse na tela base).

### Etapa 5: filtros e "Buscar nesta área"

- **Entrega:**
  - Filtros de tipo, altura máxima e raio no item Buscar, com os limites de `opcoes.busca`. Uma chamada continua alimentando mapa e lista.
  - Depois de mover o mapa (`moveend`), aparece o botão "Buscar nesta área". O raio vai do centro ao canto da área visível, limitado ao máximo da API, e o anúncio avisa quando o limite cortou a área.
  - Sem resultados no raio máximo, a mensagem da etapa 3 ("Esse é o maior raio da busca") passa a sugerir mover o mapa e buscar nesta área.
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
- **Arquivos:** `js/detalhes.js`, `js/navegacao.js`, `testes/detalhes.test.js` e o template.
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
- **Arquivos:** `js/sessao.js`, `js/detalhes.js` e o template.
- **Conceitos novos:**
  - A ação pendente equivale ao `SavedRequest` do Spring Security.
  - O token CSRF muda no login, por isso `api.js` lê o cookie a cada requisição.
- **Verificação:** itens 4 e 5, e o fluxo do login de volta ao local.

### Etapa 10: Configurações no back

- **Entrega:** duas rotas novas, que exigem login e CSRF (decisão 23):

  | Método | Rota | Entrada | Resposta |
  |---|---|---|---|
  | PATCH | `/api/auth/conta/` | `username`, `senha_atual*` | 200 Usuario |
  | POST | `/api/auth/conta/senha/` | `senha_atual*`, `nova_senha*` | 204 |

  - Senha atual errada responde 400 em `senha_atual`, com orientação.
  - A nova senha passa pelos `AUTH_PASSWORD_VALIDATORS`.
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
- **Arquivos:** `js/conta.js` e o template.
- **Verificação:** itens 4 e 5.

### Etapa 12: adicionar local, escolha do ponto

- **Entrega:** três entradas equivalentes para o ponto (especificação, seção 3):
  - Mira fixa no centro: as setas movem o mapa, e "Usar o centro do mapa" confirma. É a alternativa a arrastar (WCAG 2.5.7) e o caminho por teclado.
  - Clique no mapa.
  - Endereço, reaproveitando a etapa 6.
  - Esc cancela o modo de cadastro.
- **Arquivos:** `js/cadastro_local.js`, o CSS da mira e o template.
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
