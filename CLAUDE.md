# CLAUDE.md

Mapa colaborativo de equipamentos de calistenia em espaços públicos de Araraquara (SP). Django + DRF + PostGIS, front-end com jQuery/Ajax e Leaflet, hospedado no GCP.

**Status:** Fases 1 a 3 concluídas (pesquisa, modelagem, back-end e API). Próxima: Fase 4, front-end acessível. Comece por `Docs/HANDOFF.md`; o contrato da API está em `Docs/API.md`.

## Contexto do autor

Desenvolvedor em transição de estágio para júnior. Background em Java/Spring; Python e Django são aprendizado novo. O objetivo do projeto é **aprender**, não entregar rápido.

**IMPORTANTE: explique antes de implementar.** Em código não trivial, apresente a abordagem e o porquê antes de escrever. Código que o autor não consegue explicar linha a linha não pode ser commitado.

Ao introduzir conceito novo de Python ou Django, cite o equivalente em Java/Spring quando existir (ex.: decorator ≈ anotação, `QuerySet` ≈ repositório do Spring Data).

## Restrições inegociáveis

Este projeto atende a uma disciplina acadêmica com requisitos fixos. Não substitua as tecnologias abaixo por alternativas mais modernas.

- **jQuery e Ajax no front-end.** Não use `fetch`, `axios`, React, Vue ou Svelte.
- **JavaScript, HTML e CSS puros.** Sem TypeScript, sem build step, sem Tailwind.
- **Django é o único framework de back-end.** Não introduza FastAPI nem Flask.
- **PostgreSQL com PostGIS.** Não troque por SQLite fora dos testes.
- **Leaflet + OpenStreetMap.** Não use Google Maps Platform (custo).

## Stack

- Python 3.12, Django 5.2 LTS, Django REST Framework 3.18, drf-spectacular 0.30, GeoDjango
- PostgreSQL 16 + PostGIS 3.6, em imagem própria (`docker/postgis/`): a `postgis/postgis` não roda em ARM
- pytest + pytest-django, ruff (lint e formatação)
- Docker Compose. macOS: Colima. Windows: WSL 2 + Docker Desktop, com o código dentro do WSL
- GCP (Fase 5): Cloud Run, Cloud SQL, Cloud Storage, Secret Manager

## Comandos

```bash
# Subir ambiente:   docker compose up -d --build        (macOS: colima start antes)
# Migrations:       docker compose exec web python manage.py migrate
# Testes:           docker compose exec web pytest       (um teste: pytest "arquivo::funcao")
# Lint:             docker compose exec web ruff check . && docker compose exec web ruff format --check .
# OpenAPI:          docker compose exec web python manage.py spectacular --validate --fail-on-warn --file /tmp/schema.yml
# Migrations ok?:   docker compose exec web python manage.py makemigrations --check --dry-run
# Parar:            docker compose down   (down -v apaga o banco local)
```

Passo a passo e problemas comuns: `Docs/comandos_de_teste.md`. Teste manual de cada rota: `Docs/testes_das_rotas.md`.

## Arquitetura

- Regras de negócio ficam na camada de serviço, não em views nem em models.
- Views são finas: validam entrada, chamam serviço, devolvem resposta.
- Consultas espaciais usam GeoDjango e índice GiST, nunca cálculo de distância em Python.
- Não fuja do ORM do Django em busca de pureza arquitetural. Isole o que tem regra de negócio real; deixe CRUD ser CRUD.
- Decisões tomadas estão no README, seção 5 (01 a 21). Não reabra uma decisão sem evidência nova; se reabrir, registre a nova no fim da tabela.

### Mapa do código

| Onde | O quê |
|---|---|
| `config/` | settings (tudo sensível vem do `.env`), rotas raiz, `views.py` com `/api/opcoes/` |
| `usuarios/` | Usuário customizado e autenticação por sessão + CSRF |
| `locais/` | Local, Equipamento, RegistroCondicao, AvaliacaoLocal, FotoLocal. Regras em `servicos.py`, permissão em `permissoes.py` |
| `moderacao/` | Denúncia; análise no admin |
| `fotos/` | Upload por URL assinada. `armazenamento.py` é a interface (simulação local hoje, Cloud Storage na Fase 5) |
| `conftest.py` | Fixtures: locais reais do OSM e clientes HTTP que cobram CSRF |

### Modelagem

- Condição de equipamento é **registro datado com autor**, nunca campo no equipamento.
- Segurança do local usa campos estruturados (iluminação, movimento, horário), nunca texto livre.
- Foto exige texto alternativo. Campo obrigatório no modelo, não só no formulário.

## Convenções de código

- Nomes de domínio em português (models, campos, funções, testes); o vocabulário do framework fica como é.
- Escalas e listas fixas são `TextChoices`/`IntegerChoices` no model. O front lê valores e rótulos de `/api/opcoes/`, nunca repete as listas em JS.
- Regra verificável numa linha vira `CheckConstraint`/`UniqueConstraint` com `violation_error_message` que diz como corrigir. A API aplica antes de gravar com o `ValidaRestricoesMixin` (`locais/serializers.py`); não duplique a regra no serializer.
- Autoria: FK para o usuário com `on_delete=SET_NULL` (excluir conta não apaga dado coletivo, LGPD).
- Datas de registro com `default=timezone.now`, não `auto_now_add`, para os testes conseguirem datar no passado.
- Registros de condição e avaliações são imutáveis (só GET e POST). Local e equipamento: PATCH só pelo autor.
- Erros: `400` com a orientação no campo ou em `non_field_errors`; `409` para possível duplicata. Formato completo em `Docs/API.md`.
- Toda decisão de projeto que não vem da pesquisa fica registrada como constante comentada (ex.: `RAIO_DUPLICATA_M`) e em `Docs/modelo_dados.md`.

## Acessibilidade — WCAG 2.2 AA

Toda interface nasce acessível. Não é etapa posterior.

- HTML semântico. `<div>` clicável só com `role` e handler de teclado.
- Tudo operável por teclado, incluindo marcadores do Leaflet.
- Todo recurso do mapa tem equivalente na lista textual.
- Contraste mínimo AA. Ícone sempre acompanhado de rótulo textual.
- Respeitar `prefers-reduced-motion`. Nada piscando acima de 3 Hz.
- Mensagem de erro diz como corrigir, não apenas que houve erro.
- Atualização via Ajax anuncia o resultado em região `aria-live`.

## Testes

- Teste primeiro as regras de negócio da camada de serviço.
- Teste de consulta espacial usa dados reais de Araraquara, não coordenadas fictícias.
- Rodar a suíte antes de qualquer commit.
- Não usar mock onde um objeto real serve.
- Rotas da API são testadas com o cliente que cobra CSRF (`api`, `api_com_csrf`, `api_logado`, `cliente_logado` em `conftest.py`), como o navegador real.
- Teste que prova uma restrição precisa de controle positivo (o caso válido também passa).

## Git

- Branch: `feat/`, `fix/`, `docs/`, `test/`, `chore/`
- Commits em português, no imperativo: `adiciona busca por raio`
- Um commit por unidade lógica de trabalho. Não agrupar mudanças não relacionadas.
- Nunca commitar em `main` diretamente.
- **PRs são abertas manualmente pelo autor.** Não use `gh auth login` nem `gh pr create`: entregue o link, o título e a descrição prontos para colar.
- A pasta de documentação é `Docs/`, com D maiúsculo. `docs/` cria uma segunda pasta no Linux.

## Segurança e custo

- **Nunca criar recurso no GCP sem confirmação explícita.** Cloud SQL não tem nível gratuito permanente.
- Segredo nenhum vai para o repositório. Use `.env` local e Secret Manager em produção.
- Sempre sugerir o comando de destruição junto com o de criação.
- Upload de foto vai direto ao bucket por signed URL, sem passar pela aplicação.

## Fora de escopo até a entrega acadêmica

Não propor nem implementar: Terraform, CI/CD, Kubernetes, Argo, Pub/Sub, BigQuery, vídeo, notificações, mobile. Entram na fase seguinte, depois da entrega.

## Limite ético

Artefatos de Design Thinking — personas, mapa de empatia, jornada do usuário, respostas de entrevista — **precisam vir de pesquisa com pessoas reais**. Nunca gere esse conteúdo. Revisar roteiro de entrevista é permitido; inventar respostas não.

## Manutenção deste arquivo

Arquivo vivo. Regra que o Claude já cumpre sozinho deve ser removida; regra ignorada repetidamente indica que o arquivo ficou longo demais. Manter abaixo de 200 linhas.
