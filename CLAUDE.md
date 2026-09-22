# CLAUDE.md

Mapa colaborativo de equipamentos de calistenia em espaços públicos de Araraquara (SP). Django + DRF + PostGIS, front-end com jQuery/Ajax e Leaflet, hospedado no GCP.

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

- Python 3.12, Django 5.x, Django REST Framework, GeoDjango
- PostgreSQL 16 + PostGIS
- pytest + pytest-django
- Docker Compose no ambiente local
- GCP: Cloud Run, Cloud SQL, Cloud Storage, Secret Manager

## Comandos

```bash
# TODO: preencher conforme o projeto for construído
# Subir ambiente:   docker compose up -d
# Migrations:       docker compose exec web python manage.py migrate
# Testes:           docker compose exec web pytest
# Lint:             ruff check . && ruff format --check .
```

## Arquitetura

- Regras de negócio ficam na camada de serviço, não em views nem em models.
- Views são finas: validam entrada, chamam serviço, devolvem resposta.
- Consultas espaciais usam GeoDjango e índice GiST, nunca cálculo de distância em Python.
- Não fuja do ORM do Django em busca de pureza arquitetural. Isole o que tem regra de negócio real; deixe CRUD ser CRUD.

### Modelagem

- Condição de equipamento é **registro datado com autor**, nunca campo no equipamento.
- Segurança do local usa campos estruturados (iluminação, movimento, horário), nunca texto livre.
- Foto exige texto alternativo. Campo obrigatório no modelo, não só no formulário.

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

## Git

- Branch: `feat/`, `fix/`, `docs/`, `test/`, `chore/`
- Commits em português, no imperativo: `adiciona busca por raio`
- Um commit por unidade lógica de trabalho. Não agrupar mudanças não relacionadas.
- Nunca commitar em `main` diretamente.

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