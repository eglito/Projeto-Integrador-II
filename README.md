> Mapa Colaborativo de Calistenia 

Aplicação web para mapear e avaliar equipamentos de calistenia em espaços públicos de Araraquara (SP).

**Status:** finalizado — Fase 1 (Design Thinking / pesquisa com usuários)
**Status:** finalizado — Fase 2 (Ideação e Prototipagem)
**Status:** em desenvolvimento — Fase 3 (Back-end e API)

---

## 1. Problema

Praticantes de calistenia em Araraquara não têm como saber onde existem barras fixas, paralelas, espaldares e demais equipamentos públicos, nem em que estado de conservação eles estão. A informação existe de forma dispersa em grupos de mensagem e no boca a boca, e envelhece rápido: equipamento enferrujado, praça sem iluminação e bebedouro quebrado mudam de status ao longo do tempo.

## 2. Proposta

Mapa colaborativo onde qualquer pessoa cadastra locais de treino, vincula os equipamentos disponíveis, registra foto e informa comodidades, como bancos, banheiros e bebedouros. A avaliação de condição é um registro datado, não um campo fixo, de modo que o histórico do equipamento fique visível.

O mapa possui uma **lista textual equivalente** com os mesmos dados e filtros, para que a aplicação seja utilizável sem visão e sem mouse, visando atender critérios de acessibilidade.

## 3. Escopo

### No MVP

- Cadastro e autenticação de usuário
- Cadastro de local por clique no mapa ou por endereço
- Equipamentos vinculados ao local (barra fixa, paralelas, espaldar, barra australiana, outros)
- Uma foto por local, com texto alternativo obrigatório
- Comodidades: bebedouro, sanitário e bancos
- Avaliação de condição datada, com foto opcional do equipamento
- Avaliação de segurança e limpeza por faixa de horário (manhã, tarde, noite). A iluminação entra aqui, e não nas comodidades: ela só importa para a segurança, e só à noite (RN-04, RN-05)
- Busca por proximidade geográfica
- API REST documentada
- Acessibilidade WCAG 2.2 nível AA
- Deploy em nuvem

### Fora do MVP

Vídeo, comentários em texto livre, moderação automatizada, notificações, aplicativo mobile, automação de infraestrutura.

## 4. Stack

| Camada | Tecnologia |
|---|---|
| Back-end | Python, Django, Django REST Framework |
| Banco | PostgreSQL + PostGIS |
| Front-end | HTML5, CSS3, JavaScript, jQuery, Ajax |
| Mapa | Leaflet + OpenStreetMap |
| Infraestrutura | Google Cloud Platform |
| Versionamento | Git / GitHub |

### Serviços GCP

| Serviço | Uso |
|---|---|
| Cloud Run | Hospedagem da aplicação |
| Cloud SQL | PostgreSQL gerenciado com PostGIS |
| Cloud Storage | Fotos enviadas pelos usuários |
| Secret Manager | Credenciais |
| Artifact Registry | Imagens de container |

## 5. Decisões técnicas

Registro do que foi decidido e por quê. Decisão nova entra no fim da lista.

| # | Decisão | Motivo |
|---|---|---|
| 01 | Django + DRF como único framework web | Projeto é geoespacial; GeoDjango integra nativamente com PostGIS. Admin resolve moderação sem código. |
| 02 | PostGIS em vez de PostgreSQL puro | Busca por raio sem índice espacial não escala. Índice GiST resolve. |
| 03 | Leaflet + OSM em vez de Google Maps Platform | Custo zero e sem exigência de cartão. Maps Platform cobra por SKU após cota gratuita e não tem teto rígido de gasto. |
| 04 | Condição do equipamento como registro datado | Estado de conservação muda. Campo fixo perde histórico e envelhece silenciosamente. |
| 05 | Segurança do local por campos estruturados | Texto livre sobre segurança de bairro tende a produzir estigmatização. |
| 06 | Lista textual equivalente ao mapa | Mapa puro é inacessível a leitor de tela e a navegação por teclado. |
| 07 | Ponto do local como `geography` (SRID 4326) | Distância em metros sem projeção regional. Não fixa a aplicação em Araraquara (RN-09 da síntese da pesquisa). |
| 08 | Município pelo código IBGE | Identificador oficial, sem ambiguidade de grafia. A UF sai dos dois primeiros dígitos. |
| 09 | Segurança e zeladoria num único relato por visita | Um formulário por visita. A segurança fica vinculada à faixa de horário (RN-04). |
| 10 | Denúncia sobre o local, sem fila de aprovação prévia | Autoria visível e correção posterior (RN-08). A análise das denúncias é feita no admin. |
| 11 | Autenticação por sessão + CSRF | O front-end jQuery é servido pelo mesmo domínio: cookie de sessão HttpOnly e nenhum token guardado no navegador. Login e cadastro também exigem CSRF. |
| 12 | Coordenadas como `latitude` e `longitude` explícitas na API | Evita a troca de ordem entre GeoJSON `[lon, lat]` e Leaflet `[lat, lon]`. |
| 13 | `Referrer-Policy: strict-origin-when-cross-origin` | Os servidores de tiles do OpenStreetMap exigem o cabeçalho Referer; o padrão do Django omitia e o mapa era bloqueado. Só a origem do site é enviada. |
| 14 | Raio padrão de 2 km na busca por proximidade | Cerca de 25 minutos a pé. O máximo é 10 km. |
| 15 | Upload de foto por URL assinada, com simulação local no desenvolvimento | O front faz o mesmo fluxo em desenvolvimento e em produção, sem recurso no GCP até a Fase 5. |
| 16 | Foto de equipamento dentro do registro de condição | A foto envelhece como a condição (decisão 04): nasce datada e com autor. |
| 17 | Uma foto por local | Escopo do MVP. Serve para reconhecer o lugar; a condição vem das fotos dos equipamentos. |
| 18 | Só o autor corrige local e equipamento; registros e avaliações são imutáveis | Preserva a autoria (RN-08) e o histórico (RN-02). Quem não é autor contribui com registros novos ou abre denúncia. |
| 19 | Possível duplicata responde `409` com os candidatos e pede confirmação | O cadastro se protege sozinho, sem rota extra. Candidato: local a até 150 m, ou de mesmo nome a até 10 km (RN-01). |
| 20 | Uma denúncia aberta por pessoa, local e motivo | Índice único parcial no banco: evita denúncias repetidas, mas permite denunciar de novo depois da análise. |
| 21 | Foto de até 2 MB, conferida pelos primeiros bytes e com nome gerado pelo servidor | O front redimensiona a imagem e descarta os metadados de localização (EXIF) antes do envio, redesenhando-a num `<canvas>`: o arquivo vai direto ao armazenamento, sem passar pela aplicação. |
| 22 | Mapa aberto a visitantes; login só para contribuir | A API já libera a consulta (acesso "Livre"). Exigir conta antes de ver o mapa poria atrito na consulta principal (RN-06). |
| 23 | Configurações troca o nome de usuário e a senha, e as duas trocas pedem a senha atual | Quem achar uma sessão aberta não toma a conta, e o nome aparece na autoria (RN-08). A sessão atual continua e as outras são encerradas (`update_session_auth_hash`). Excluir a conta fica fora do MVP. |
| 24 | Marcadores sem agrupamento no MVP | São poucos locais, e o agrupamento (Leaflet.markercluster) exigiria tornar os grupos acessíveis por teclado e leitor de tela. Reavaliar quando o volume pesar na ordem de Tab. |
| 25 | Centro padrão do mapa em `/api/opcoes/` (`busca.centro_padrao`) | Constante comentada no back, como o raio. O front não fixa cidade (RN-09) nem repete dado do back. |
| 26 | Páginas servidas por um app `paginas` | Os apps da API continuam só API, e a interface, que é uma tela só, fica num lugar só. |
| 27 | jQuery, Leaflet e QUnit copiados em `static/`, com as licenças | Versão travada no Git, funciona sem internet no desenvolvimento e o carregamento não passa por terceiro. Os tiles continuam vindo do OSM. |
| 28 | Nominatim chamado direto do navegador | Sem rota nova. Segue a política de uso: busca só no Enter ou no botão, no máximo 1 requisição por segundo, sem autocompletar. A referência geográfica é o centro padrão, nunca a posição da pessoa. |
| 29 | Em tela estreita, um botão alterna entre Mapa e Lista | Sem gesto de arrastar e sem conteúdo coberto pela metade: atende WCAG 1.4.10, 2.4.11 e 2.5.7 com menos código que uma folha inferior. |
| 30 | Marcadores na ordem de Tab, na mesma ordem da lista, com o link "Pular para a lista" | Operáveis por teclado, e o link evita atravessar todos (WCAG 2.4.1). Um só ponto de Tab com setas disputaria as setas com o mapa. |
| 31 | Sem a posição da pessoa, a busca parte do centro do mapa | Um caminho de código só. A distância diz de onde é medida: "de você", "do centro do mapa" ou "do endereço buscado". |
| 32 | Login, cadastro de conta e Configurações no painel lateral da mesma página | Mapa, filtros e posição ficam em memória, e a pessoa volta ao local e à ação sem recarregar. Não há redirecionamento por `?proximo=` a validar. |
| 33 | A URL guarda só o local aberto (`?local=id`), pela History API | Link compartilhável para um local, e o Voltar do navegador fecha o painel. A posição fica fora da URL para não ir ao histórico nem a links compartilhados. |
| 34 | JavaScript em módulos ES nativos | Dependências explícitas e escopo por arquivo, sem build step. jQuery e Leaflet continuam globais. |
| 35 | QUnit para as funções puras do JavaScript | Framework de testes do projeto jQuery, roda no navegador sem build. A interação é verificada pela especificação do mapa, seção 6, com evidência. |
| 36 | Dados de desenvolvimento por fixture (`loaddata`) | Os 5 locais reais do `conftest.py` no banco local, para desenvolver e verificar o mapa sem cadastro à mão. Substituída pela 37. |
| 37 | Dados de desenvolvimento por um comando que pode rodar várias vezes (`carregar_locais_araraquara`), no lugar da fixture | Reabre a 36: o banco local já tinha locais, e a fixture, com ids fixos, falharia na restrição de nome único ou sobrescreveria o local de mesmo id. O comando usa a regra de duplicata da API (RN-01), pula o que já existe e lê `locais/dados_araraquara.py`, a mesma fonte do `conftest.py`. |
| 38 | Troca de nome por `PUT /api/auth/conta/`, e não PATCH | O corpo traz inteiro o único campo editável, junto com a senha atual, e os dois são obrigatórios. O drf-spectacular marca como opcionais os campos de todo PATCH, o que deixaria impreciso o esquema OpenAPI, fonte de verdade dos campos (`Docs/API.md`). |
| 39 | Layout (etapa 4) feito antes do teste do protótipo; o HTML dessa etapa vira o protótipo testado depois | Reabre a 5.6 da especificação, por decisão do autor em 04/11/2026: o front precisava avançar. As escolhas de layout são decisões de projeto do autor, e não resultado de pesquisa (CLAUDE.md, Limite ético). O teste com 2 ou 3 pessoas, incluindo o perfil de E04, passa a usar o próprio HTML, e as conclusões podem mudar o layout. |
| 40 | Layout: barra superior com "Menu" e título; faixa de anúncios sob ela; painel à esquerda, sempre visível em tela larga, com uma visão por vez; menu como gaveta de navegação; abaixo de 48em, barra inferior Mapa/Lista | Painel e menu ficam do mesmo lado. A faixa de anúncios é vista e lida em qualquer visão: com a Lista oculta, uma região aria-live escondida pode não ser lida. Uma gaveta só, em toda largura, é um comportamento para aprender e testar. A barra inferior tem alvos grandes (E04). Zoom no canto superior direito, com rótulo visível. Em tela estreita, escolher um local na lista leva ao Mapa, com o foco no marcador. |
| 41 | Escolher um local na lista abre os detalhes em qualquer largura; o botão "Mostrar no mapa", nos detalhes, leva o foco ao marcador e, em tela estreita, traz o Mapa para a frente | Revê a parte da 40 sobre a lista em tela estreita, decidida antes de existir o painel de detalhes. A especificação, 2.1, diz que, ao escolher um local, o painel vira o de detalhes; com a 40, em tela estreita, ver os detalhes a partir da lista levava dois passos (lista, mapa e Enter no marcador). O caminho da lista até o marcador continua, pelo botão. Decidida pelo autor em 05/11/2026, na etapa 8. |

## 6. Acessibilidade

Meta: **WCAG 2.2 nível AA**.

| Eixo | Implementação |
|---|---|
| Visual | Lista alternativa ao mapa, contraste AA, texto alternativo obrigatório, HTML semântico |
| Motora | Operação completa por teclado, alvos de clique amplos, entrada por endereço |
| Auditiva | Nenhuma informação transmitida apenas por áudio |
| Convulsões | Sem piscadas acima de 3 Hz, respeito a `prefers-reduced-motion` |
| Cognitiva | Linguagem simples, formulário em etapas, erros com instrução de correção |

Validação: Lighthouse, axe DevTools, navegação por teclado e leitor de tela NVDA.

## 7. Ambiente local

> Preencher conforme o projeto for construído.

### Pré-requisitos

- Docker e Docker Compose
- Python 3.12+
- Git

### Subir o projeto

```bash
cp .env.example .env                                    # depois troque chave e senha
docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
```

Aplicação em http://localhost:8000 e admin em http://localhost:8000/admin/.

Para parar: `docker compose down`. Para apagar também o banco local: `docker compose down -v`.

### Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores.

| Variável | Descrição |
|---|---|
| `DJANGO_SECRET_KEY` | Chave criptográfica do Django. Obrigatória. |
| `DJANGO_DEBUG` | `True` só em desenvolvimento. Ausente vale `False`. |
| `DJANGO_ALLOWED_HOSTS` | Domínios aceitos, separados por vírgula. |
| `POSTGRES_DB` | Nome do banco. |
| `POSTGRES_USER` | Usuário do banco. |
| `POSTGRES_PASSWORD` | Senha do banco. |
| `POSTGRES_HOST` | Host do banco. No Docker Compose, `db`. |
| `POSTGRES_PORT` | Porta do banco. Padrão `5432`. |

## 8. Estrutura do repositório

```
.
├── config/               Configuração do projeto: settings, rotas raiz, WSGI e ASGI
├── usuarios/             Modelo de usuário e API de autenticação por sessão
├── locais/               Locais, equipamentos, condição e avaliações
├── moderacao/            Denúncias, analisadas no admin
├── fotos/                Upload de fotos por URL assinada e simulação local do bucket
├── paginas/              Front-end: página do mapa, CSS, módulos JavaScript, bibliotecas e testes QUnit
├── tests/                Testes de infraestrutura: PostGIS, cabeçalhos HTTP, OpenAPI, opções
├── docker/postgis/       Imagem do banco: PostgreSQL 16 + PostGIS
├── Docs/                 Pesquisa de campo, modelo de dados e guias de uso
├── conftest.py           Fixtures dos testes, com locais reais de Araraquara
├── docker-compose.yml    Ambiente local: banco (db) e aplicação (web)
├── Dockerfile            Imagem da aplicação Django
├── manage.py             Linha de comando do Django
├── pyproject.toml        Configuração do ruff e do pytest
├── requirements.txt      Dependências de produção
└── requirements-dev.txt  Dependências de desenvolvimento: testes e lint
```

Cada app do Django (`usuarios`, `locais`, `moderacao`, `fotos`, `paginas`) segue a mesma divisão de arquivos, conforme o que ele precisa:

| Arquivo | Papel |
|---|---|
| `models.py` | Entidades e restrições do banco |
| `servicos.py` | Regras de negócio (camada de serviço) |
| `serializers.py` | Validação da entrada e conversão de e para JSON |
| `views.py` | Views finas da API: validam a entrada, chamam o serviço, devolvem a resposta |
| `urls.py` | Rotas do app |
| `permissoes.py` | Regras de quem pode alterar o quê (em `locais`) |
| `armazenamento.py` | Interface com o armazenamento de arquivos (em `fotos`) |
| `admin.py` | Telas de cadastro e moderação no admin |
| `management/commands/` | Comandos do `manage.py` (em `locais`: carga dos dados de desenvolvimento) |
| `templates/` e `static/` | HTML, CSS, módulos JavaScript, bibliotecas e testes QUnit (em `paginas`) |
| `migrations/` | Histórico das mudanças no banco |
| `tests/` | Testes do app |

## 9. Testes

Os testes rodam dentro do container, contra PostgreSQL + PostGIS real.

```bash
docker compose exec web pytest
docker compose exec web ruff check .
docker compose exec web ruff format --check .
```

## 10. API

Documentação OpenAPI gerada automaticamente em `/api/docs/` com a aplicação rodando.

Consultas são abertas. Rotas que alteram dados exigem sessão autenticada e o cabeçalho `X-CSRFToken`, com o valor do cookie `csrftoken` entregue por `/api/auth/sessao/`. Login e cadastro também exigem o cabeçalho, mesmo sem sessão.

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| GET | `/api/auth/sessao/` | Livre | Informa se há sessão aberta e entrega o cookie `csrftoken` |
| POST | `/api/auth/cadastro/` | Livre, com CSRF | Cria o usuário (nome e senha) e abre a sessão |
| POST | `/api/auth/login/` | Livre, com CSRF | Abre a sessão |
| POST | `/api/auth/logout/` | Autenticado | Encerra a sessão |
| PUT | `/api/auth/conta/` | Autenticado | Configurações: troca o nome de usuário, com a senha atual |
| POST | `/api/auth/conta/senha/` | Autenticado | Configurações: troca a senha, com a atual; encerra as outras sessões da conta |
| GET | `/api/opcoes/` | Livre | Vocabulário dos formulários e filtros (tipos, escalas, motivos), com rótulos, e os limites da busca |
| GET | `/api/locais/` | Livre | Lista os locais com equipamentos e condição atual. Serve o mapa e a lista textual |
| POST | `/api/locais/` | Autenticado | Cadastra um local. Responde `409` com `possiveis_duplicatas` se ele pode já existir (RN-01) |
| GET | `/api/locais/{id}/` | Livre | Detalhe do local, com foto, autor e resumo de segurança por faixa de horário |
| PATCH | `/api/locais/{id}/` | Autor do local | Corrige nome, endereço, localização ou comodidades |
| PUT | `/api/locais/{id}/foto/` | Autenticado | Define (`201`) ou troca (`200`) a foto do local, com texto alternativo |
| POST | `/api/locais/{id}/equipamentos/` | Autenticado | Acrescenta um equipamento ao local |
| GET | `/api/locais/{id}/avaliacoes/` | Livre | Avaliações dos últimos 90 dias, paginadas |
| POST | `/api/locais/{id}/avaliacoes/` | Autenticado | Avalia segurança e limpeza numa faixa de horário |
| POST | `/api/locais/{id}/denuncias/` | Autenticado | Abre uma denúncia para a moderação |
| GET | `/api/equipamentos/{id}/` | Livre | Equipamento, com a condição atual e a foto mais recente |
| PATCH | `/api/equipamentos/{id}/` | Autor do equipamento | Corrige tipo ou dimensões, como a altura medida (RN-03) |
| GET | `/api/equipamentos/{id}/registros-condicao/` | Livre | Histórico de condição, do mais recente ao mais antigo, paginado (RN-02) |
| POST | `/api/equipamentos/{id}/registros-condicao/` | Autenticado | Registra a condição, com foto opcional |
| POST | `/api/uploads/` | Autenticado | Passo 1 do envio de foto: devolve o `objeto` e uma URL assinada, válida por 10 minutos |
| PUT | `/armazenamento-local/{token}/` | URL assinada | Passo 2, só no desenvolvimento: recebe o arquivo (no lugar do Cloud Storage) |
| GET | `/api/schema/` | Livre | Esquema OpenAPI 3 |
| GET | `/api/docs/` | Livre | Documentação navegável (Swagger UI) |
| — | `/admin/` | Equipe | Cadastro e moderação, inclusive de denúncias e fotos |

Parâmetros de `GET /api/locais/`:

| Parâmetro | Descrição |
|---|---|
| `latitude`, `longitude` | Juntos, ativam a busca por proximidade, ordenada por distância (RN-06) |
| `raio` | Raio da busca em metros. Padrão 2000, máximo 10000 |
| `tipo` | Tipo de equipamento: `barra_fixa`, `barras_paralelas`, `espaldar`, `barra_australiana`, `outro` |
| `altura_maxima` | Altura máxima do equipamento, em centímetros. Combinado com `tipo`, vale para o mesmo equipamento (RN-03) |

Convenções:

- **Sem PUT nem DELETE em locais e equipamentos.** O autor corrige com PATCH; a exclusão é feita pela moderação, no admin.
- **Registros de condição e avaliações são imutáveis** (só GET e POST). Um erro se corrige com um registro novo, sem apagar o histórico.
- **Criação responde `201`** com o recurso criado e, quando ele tem endereço próprio, o cabeçalho `Location`.
- **Erros de validação respondem `400`** com a explicação de como corrigir. Erros de campo vêm na chave do campo; erros que envolvem mais de um campo, em `non_field_errors`.
- **Listas de histórico são paginadas** (20 por página), no formato `{"count", "next", "previous", "results"}`.

Envio de foto, em três passos:

1. `POST /api/uploads/` com `tipo_conteudo` (JPEG, PNG ou WebP) e `tamanho` (até 2 MB).
2. `PUT` do arquivo na `url` devolvida, com o `Content-Type` indicado.
3. Anexar o `objeto` devolvido no passo 1: `PUT /api/locais/{id}/foto/` ou `POST /api/equipamentos/{id}/registros-condicao/`, sempre com o texto alternativo.

## 11. Modelo de dados

Diagrama entidade-relacionamento, entidades, restrições e a origem de cada campo na pesquisa em [Docs/modelo_dados.md](Docs/modelo_dados.md).

## 12. Contexto acadêmico

Projeto desenvolvido para a disciplina **Projeto Integrador II** do Bacharelado em Tecnologia da Informação da UNIVESP.

Requisitos atendidos: Design Thinking, front-end em HTML/CSS/JavaScript com jQuery e Ajax, back-end em Python com Django, banco de dados relacional, API REST, hospedagem em nuvem, acessibilidade, testes automatizados e controle de versão com Git.

Disciplinas em diálogo: Algoritmos e Programação I e II, Fundamentos de Internet e Web, Estrutura de Dados, Programação Orientada a Objetos, Banco de Dados, Desenvolvimento Web, Interação Humano-Computador.

> Se o uso de assistentes de IA for declarado no relatório, mantenha a declaração também aqui.

## 13. Roadmap

- [X] Fase 1 — Empatia e definição (Design Thinking)
- [X] Fase 2 — Ideação, prototipagem e modelagem de dados
- [ ] Fase 3 — Back-end e API
- [ ] Fase 4 — Front-end acessível
- [ ] Fase 5 — Nuvem, teste com usuários e entrega
- [ ] Pós-entrega — Terraform, CI/CD, pipeline de dados, observabilidade

## 14. Licença

> Definir. Sugestão: MIT.
