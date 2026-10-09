> Mapa Colaborativo de Calistenia 

Aplicação web para mapear e avaliar equipamentos de calistenia em espaços públicos de Araraquara (SP).

**Status:** em desenvolvimento — Fase 1 (Design Thinking / pesquisa com usuários)

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
- Comodidades: bebedouro, sanitário, iluminação
- Avaliação de condição datada
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
├── tests/                Testes de infraestrutura: PostGIS, cabeçalhos HTTP, OpenAPI
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

Cada app do Django (`usuarios`, `locais`, `moderacao`) segue a mesma divisão de arquivos:

| Arquivo | Papel |
|---|---|
| `models.py` | Entidades e restrições do banco |
| `servicos.py` | Regras de negócio (camada de serviço) |
| `serializers.py` | Validação da entrada e conversão de e para JSON |
| `views.py` | Views finas da API: validam a entrada, chamam o serviço, devolvem a resposta |
| `urls.py` | Rotas do app |
| `admin.py` | Telas de cadastro e moderação no admin |
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
| GET | `/api/locais/` | Livre | Lista os locais com equipamentos e condição atual. Serve o mapa e a lista textual |
| GET | `/api/locais/{id}/` | Livre | Detalhe do local, com autor e resumo de segurança por faixa de horário |
| GET | `/api/schema/` | Livre | Esquema OpenAPI 3 |
| GET | `/api/docs/` | Livre | Documentação navegável (Swagger UI) |
| — | `/admin/` | Equipe | Cadastro e moderação |

Parâmetros de `GET /api/locais/`:

| Parâmetro | Descrição |
|---|---|
| `latitude`, `longitude` | Juntos, ativam a busca por proximidade, ordenada por distância (RN-06) |
| `raio` | Raio da busca em metros. Padrão 2000, máximo 10000 |
| `tipo` | Tipo de equipamento: `barra_fixa`, `barras_paralelas`, `espaldar`, `barra_australiana`, `outro` |
| `altura_maxima` | Altura máxima do equipamento, em centímetros. Combinado com `tipo`, vale para o mesmo equipamento (RN-03) |

Rotas de escrita (cadastro de locais, condição, avaliações, denúncias e fotos) entram nas próximas etapas da Fase 3.

## 11. Modelo de dados

Diagrama entidade-relacionamento, entidades, restrições e a origem de cada campo na pesquisa em [Docs/modelo_dados.md](Docs/modelo_dados.md).

## 12. Contexto acadêmico

Projeto desenvolvido para a disciplina **Projeto Integrador II** do Bacharelado em Tecnologia da Informação da UNIVESP.

Requisitos atendidos: Design Thinking, front-end em HTML/CSS/JavaScript com jQuery e Ajax, back-end em Python com Django, banco de dados relacional, API REST, hospedagem em nuvem, acessibilidade, testes automatizados e controle de versão com Git.

Disciplinas em diálogo: Algoritmos e Programação I e II, Fundamentos de Internet e Web, Estrutura de Dados, Programação Orientada a Objetos, Banco de Dados, Desenvolvimento Web, Interação Humano-Computador.

> Se o uso de assistentes de IA for declarado no relatório, mantenha a declaração também aqui.

## 13. Roadmap

- [ ] Fase 1 — Empatia e definição (Design Thinking)
- [ ] Fase 2 — Ideação, prototipagem e modelagem de dados
- [ ] Fase 3 — Back-end e API
- [ ] Fase 4 — Front-end acessível
- [ ] Fase 5 — Nuvem, teste com usuários e entrega
- [ ] Pós-entrega — Terraform, CI/CD, pipeline de dados, observabilidade

## 14. Licença

> Definir. Sugestão: MIT.
