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

Privacidade: a posição só sai do navegador como parâmetro de `GET /api/locais/`. Não é gravada nem enviada a terceiros.
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
- Rota nova no back-end sem combinar antes, incluindo Configurações.
- Tudo o que a seção "Fora de escopo" do `CLAUDE.md` já lista.
- Avaliação, registro de condição, denúncia e envio de foto: etapas seguintes, na ordem do HANDOFF, seção 5.

---

## 5. Decisões em aberto

Resolver antes do plano. As escolhas entram no README, seção 5, a partir da decisão 22.

| # | Pergunta | Opções | Observação |
|---|---|---|---|
| 5.1 | O mapa só aparece depois do login? | (a) só após o login; (b) aberto a visitantes, com login só para contribuir | A API já libera consulta sem login (`Docs/API.md`, acesso "Livre"), e o HANDOFF começa por uma entrega só de leitura |
| 5.2 | O que é "Configurações" no MVP? | Preferências guardadas no navegador (raio, filtros, animações), dados da conta ou adiar | Não existe rota de configurações na API |
| 5.3 | Agrupar marcadores próximos? | Leaflet.markercluster sem build step, ou não agrupar no MVP | Avaliar se o volume de locais justifica e se o agrupamento continua acessível |
| 5.4 | De onde vem o centro padrão do mapa? | Constante comentada no front ou dado vindo do back | `/api/opcoes/` não traz coordenadas de município; RN-09 pede não fixar Araraquara |
| 5.5 | Como servir as páginas, origem do jQuery e do Leaflet, Nominatim | `Docs/HANDOFF.md`, seção 2 | Decisões já listadas lá |
| 5.6 | Testar o protótipo de baixa fidelidade antes do HTML? | Sim, com 2 ou 3 participantes, ou seguir sem | O teste e as conclusões são do autor; Claude não gera resultados de pesquisa (`CLAUDE.md`, Limite ético) |

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
