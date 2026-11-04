# Especificação: experiência de mapa (Fase 4)

O que o front-end entrega e como saber que ficou pronto.
Stack, acessibilidade, testes e Git seguem o `CLAUDE.md`; o contrato da API está em `Docs/API.md`. Este arquivo não repete essas regras.

---

## 1. Objetivo

A pessoa abre o app e vê, num mapa centrado onde ela está, os locais próximos com barras fixas e demais equipamentos de calistenia. Todo o resto é secundário a isso (RN-06: a busca por proximidade é a consulta principal).

Referência de interação: Google Maps, Apple Maps e Strava. O mapa ocupa a tela, os controles flutuam sobre ele e um painel lateral mostra resultados e detalhes. Copie o comportamento, não o visual: nada de marca, ícones ou cores desses serviços.

---

## 2. Tela principal

### 2.1 Layout

| Região | Conteúdo |
|---|---|
| Mapa | Ocupa a área toda. Leaflet + OSM, controles de zoom e botão "Minha localização" |
| Menu lateral esquerdo | Recolhível, aberto e fechado por botão. Itens na seção 2.5 |
| Painel de resultados | Lista textual dos locais da área (RN-10), sincronizada com o mapa. Ao escolher um local, vira o painel de detalhes (2.4) |
| Região `aria-live` | Anuncia resultados ("12 locais a até 2 km"), erros e confirmações |

Em tela estreita (320 px, WCAG 1.4.10), o menu vira gaveta sobre o mapa e o painel de resultados vira folha inferior ou tela própria; o plano propõe qual. É web responsiva, não app mobile.
Painel ou menu abertos não podem esconder o elemento com foco (WCAG 2.4.11). Alvos de toque com pelo menos 24 × 24 px (WCAG 2.5.8; E04 tem mobilidade reduzida).

### 2.2 Ponto de partida: a localização da pessoa

1. O mapa abre num centro padrão, nunca vazio (decisão 5.4).
2. Se a permissão de geolocalização **já foi concedida** (Permissions API), centraliza na pessoa e busca os locais próximos sem perguntar nada.
3. Se ainda não foi pedida, mostra um convite visível, "Usar minha localização", no mapa e no painel. O pedido do navegador só acontece no clique: pedir no carregamento da página é apontado como má prática pelo Lighthouse, usado na validação (README, seção 6).
4. Se for negada, indisponível ou demorar demais, mantém o centro padrão, explica em `aria-live` o que aconteceu e como mudar, e oferece a busca por endereço.
5. A posição da pessoa tem marcador distinto dos locais, com rótulo textual.

Privacidade: as coordenadas da pessoa só saem do navegador como parâmetro de `GET /api/locais/` e não são gravadas. Nenhum terceiro recebe as coordenadas, mas os tiles da área visível vêm do servidor do OSM, que assim vê a região exibida no mapa. Por isso a busca por endereço usa o centro padrão como referência, nunca a posição (decisão 28).
A geolocalização exige contexto seguro: funciona em `localhost`, não pelo IP da rede local. Em produção, HTTPS (Fase 5).

### 2.3 Locais no mapa e na lista

- Uma única chamada, `GET /api/locais/?latitude=&longitude=&raio=`, alimenta o mapa **e** a lista (`Docs/API.md`, 6.1). Raio padrão e máximo vêm de `/api/opcoes/` (`busca`).
- Lista ordenada por `distancia_m`, exibida como "350 m" ou "1,2 km". Cada item: nome, distância, tipos de equipamento (rótulos de `/api/opcoes/`) e comodidades.
- Lista e mapa andam juntos: escolher um item centraliza e destaca o marcador; clicar ou dar Enter no marcador seleciona o item e abre os detalhes.
- Mover o mapa **não** recarrega sozinho. Aparece o botão "Buscar nesta área", como no Google Maps, com raio derivado da área visível e limitado ao máximo da API.
- Sem resultados: diga o que fazer ("Nenhum local a até 2 km. Aumente o raio ou cadastre um local") e ofereça as duas ações.
- Cada marcador tem nome acessível (o nome do local) e é operável por teclado.

### 2.4 Painel de detalhes do local

Dados de `GET /api/locais/{id}/` (LocalDetalhe):

- Nome, endereço, distância e foto com o texto alternativo.
- Equipamentos: tipo, dimensões e condição atual **com a data** (RN-02), por exemplo "Bom, registrado em 12/10/2026". Sem registro: "Sem registro de condição".
- Comodidades: `true`, `false` e `null` viram "Sim", "Não" e "Não informado". `null` não é "não tem".
- Segurança por faixa de horário (manhã, tarde, noite), últimos 90 dias, em texto e não só em cor.
- Autoria: "Cadastrado por {usuário} em {data}" (RN-08).
- Ações de contribuição (avaliar, registrar condição, denunciar) aparecem como botões. Sem login, levam ao login e voltam a este local. A implementação delas vem em etapas posteriores.
- Esc ou "Voltar à lista" fecham o painel e devolvem o foco ao item de origem.

### 2.5 Menu lateral

| Item | Ação | Exige login |
|---|---|---|
| Buscar | Endereço ou lugar, que recentraliza o mapa, e filtros por tipo de equipamento, altura máxima e raio. Os filtros valem para mapa e lista juntos | Não |
| Lista de locais | Leva o foco à lista textual | Não |
| Adicionar local | Entra no modo de cadastro (seção 3) | Sim |
| Configurações | Decisão 5.2 | — |
| Entrar / Sair | Login e cadastro de conta; com sessão aberta, mostra o nome do usuário e "Sair" | — |

- Botão do menu com `aria-expanded` e `aria-controls`. Esc fecha e devolve o foco ao botão.
- Todo ícone tem rótulo textual visível.
- A busca por endereço depende da decisão do Nominatim (`Docs/HANDOFF.md`, seção 2): no máximo 1 requisição por segundo e sem autocompletar, então a busca só dispara no Enter ou no botão.

### 2.6 Sessão

- Ao carregar, `GET /api/auth/sessao/` define o estado (visitante ou logado) e grava o cookie CSRF.
- Depois do login ou do cadastro de conta, a pessoa cai no mapa, ou volta ao local e à ação que pediram o login.
- Logout: `POST /api/auth/logout/`; o destino depende da decisão 5.1.
- CSRF e barra final conforme `Docs/API.md`, seções 1 e 2 (bug 1 do HANDOFF).

---

## 3. Adicionar local (etapa posterior)

- Três entradas equivalentes: clique no mapa, endereço e "usar o centro do mapa". Nesse modo há uma mira fixa no centro, a pessoa move o mapa com as setas e confirma. Esse modo é a alternativa a arrastar o marcador (WCAG 2.5.7) e o caminho por teclado.
- Formulário em etapas (README, seção 6): nome e comodidades, depois o fluxo de duplicata com 409 (`Docs/API.md`, 6.2), depois os equipamentos.
- Ao concluir, o local novo aparece no mapa e na lista, e o resultado é anunciado em `aria-live`.

---

## 4. Fora de escopo

- Rotas e navegação até o local, feed social, ranking, segmentos e mapas de calor (Strava), modo offline.
- Rota nova no back-end sem combinar antes. Já combinados: o campo `busca.centro_padrao` em `/api/opcoes/` (decisão 25) e as rotas de Configurações (decisão 23).
- Tudo o que a seção "Fora de escopo" do `CLAUDE.md` já lista.
- Avaliação, registro de condição, denúncia e envio de foto: etapas seguintes, na ordem do HANDOFF, seção 5.

---

## 5. Decisões

Resolvidas na entrevista de 03/11/2026, antes do plano (`Docs/plano_front.md`). As decisões técnicas estão no README, seção 5, de 22 a 37.

| # | Pergunta | Resposta | README |
|---|---|---|---|
| 5.1 | O mapa só aparece depois do login? | Não. O mapa é aberto a visitantes, e o login só é pedido para contribuir | 22 |
| 5.2 | O que é "Configurações" no MVP? | Troca do nome de usuário e da senha. As duas trocas pedem a senha atual; a sessão atual continua e as outras são encerradas. Pede duas rotas novas no back (plano, etapa 10) | 23 |
| 5.3 | Agrupar marcadores próximos? | Não no MVP. Reavaliar quando o volume de locais pesar na ordem de Tab | 24 |
| 5.4 | De onde vem o centro padrão do mapa? | Do back: constante comentada, exposta em `/api/opcoes/` como `busca.centro_padrao` | 25 |
| 5.5 | Como servir as páginas, origem do jQuery e do Leaflet, Nominatim | App `paginas`; jQuery e Leaflet copiados em `static/`; Nominatim chamado direto do navegador | 26, 27 e 28 |
| 5.6 | Testar o protótipo de baixa fidelidade antes do HTML? | Sim, em paralelo às etapas que não dependem do layout (plano, etapas 1 a 3). O layout (etapa 4) espera as conclusões do autor | Processo; fica no plano |

Decididas na mesma entrevista:

| Pergunta | Resposta | README |
|---|---|---|
| O que o painel de resultados vira em tela estreita? | Um botão alterna entre Mapa e Lista, cada um na tela inteira | 29 |
| Como os marcadores entram na ordem de Tab? | Todos, na ordem da lista, com o link "Pular para a lista" antes do mapa | 30 |
| O que a lista mostra sem a posição da pessoa? | A busca por proximidade a partir do centro do mapa, com a origem da distância no texto | 31 |
| Onde ficam login, cadastro de conta e Configurações? | No painel lateral, na mesma página | 32 |
| A URL acompanha o estado da tela? | Só o local aberto (`?local=id`) | 33 |
| Como organizar o JavaScript sem build step? | Módulos ES nativos | 34 |
| Como testar o JavaScript? | QUnit para as funções puras; interação pela seção 6, com evidência | 35 |
| Como povoar o banco local? | Fixture com os 5 locais do `conftest.py`, carregada com `loaddata`. Revista na implementação: um comando que pode rodar várias vezes, porque a fixture conflitava com os locais já cadastrados | 36, substituída pela 37 |

---

## 6. Verificação de ponta a ponta

Cada etapa termina com evidência (screenshot, saída de comando), não com "pronto".

1. Com `docker compose up -d`, http://localhost:8000/ abre o mapa com os tiles do OSM carregados (sem bloqueio por Referer; decisão 13).
2. Geolocalização **permitida** (simulada em Araraquara pelo Chrome DevTools, Sensors): o mapa centraliza na pessoa e a lista vem ordenada por distância. **Negada**: centro padrão, mensagem com orientação e busca por endereço funcionando.
3. Mapa e lista mostram os mesmos locais, também depois de filtrar.
4. Só com teclado: Tab alcança menu, busca, marcadores e lista; Enter abre detalhes; Esc fecha menu e painel; o foco fica sempre visível.
5. Leitor de tela: resultados, filtros e erros são anunciados pela região `aria-live`.
6. Com 320 px de largura, não há rolagem horizontal e menu e painel continuam utilizáveis.
7. Com `prefers-reduced-motion`, o mapa troca de posição sem animação (`setView` sem `animate`, em vez de `flyTo`).
8. axe DevTools e Lighthouse sem erros de acessibilidade, e sem aviso de geolocalização pedida no carregamento.
9. `pytest` e `ruff` passam (`CLAUDE.md`, Comandos), incluindo teste da view que serve a página, se houver.
