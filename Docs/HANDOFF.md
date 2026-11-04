# Handoff: fim da Fase 3

Estado do projeto para quem começa a Fase 4 (front-end acessível).
Atualizado em 03/11/2026, com a `main` no merge da PR #16.

> Leitura em ordem: este arquivo, depois `CLAUDE.md` (regras), `Docs/API.md` (contrato) e README, seção 5 (decisões 01 a 21).

---

## 1. O que está pronto

| Área | Onde | Evidência |
|---|---|---|
| Pesquisa de campo e síntese | `Docs/sintese-pesquisa.md`, `Docs/entrevistas.md` (anonimizadas) | Regras RN-01 a RN-10 rastreáveis a E01–E06 |
| Modelo de dados | `Docs/modelo_dados.md`; migrations em `locais/` (0001–0004) e `moderacao/` (0001–0002) | Diagrama ER validado; `makemigrations --check` sem pendências |
| Regras de negócio | `locais/servicos.py` | Busca por raio, filtros por equipamento, condição atual, resumo de segurança, duplicatas, cadastro e troca de foto |
| API REST | 25 rotas, com as duas de Configurações da Fase 4; `Docs/API.md` | OpenAPI validado sem avisos (`spectacular --validate --fail-on-warn`) |
| Autenticação | `usuarios/` | Sessão + CSRF, inclusive no login e no cadastro |
| Fotos | `fotos/` | Fluxo de URL assinada com armazenamento simulado em disco |
| Moderação | `*/admin.py` | Locais com mapa, denúncias com status editável, fotos com link para abrir |
| Testes | `conftest.py`, pastas `tests/` | 88 testes contra PostgreSQL + PostGIS real, com locais reais de Araraquara |
| Documentação de uso | `Docs/comandos_de_teste.md`, `Docs/testes_das_rotas.md`, `Docs/comandos_acesso_db.md` | Comandos conferidos contra a aplicação em execução |

---

## 2. O que falta no back-end

### Decidir no início da Fase 4

| Item | Situação | Opções a avaliar |
|---|---|---|
| Servir as páginas | Não há templates nem arquivos estáticos | Um app novo para as páginas, ou templates por app; `STATICFILES_DIRS` |
| Origem do jQuery e do Leaflet | — | CDN (cdnjs, jsDelivr) ou cópia local em `static/`. Sem build step nos dois casos |
| Cadastro por endereço (README, escopo do MVP) | Não implementado | Nominatim chamado direto pelo navegador (política: 1 requisição por segundo, sem autocompletar) ou um proxy no back |
| Protótipo de baixa fidelidade | Fase 2 marcada como concluída, sem protótipo no repositório | Testar com 2 ou 3 participantes antes do HTML, incluindo o perfil de E04 |

### Pendências que podem aparecer durante o front

| Item | Onde | Observação |
|---|---|---|
| `GET /api/locais/` sem paginação | `locais/views.py` | Suficiente para dezenas de locais; necessário quando crescer |
| OpenAPI só documenta respostas de sucesso | `extend_schema` nas views | Faltam os formatos de 400, 403 e 404 no esquema; hoje estão só em `Docs/API.md` |
| Autor escolhido à mão no admin de registros e avaliações | `locais/admin.py` | Foge da RN-08; locais e denúncias já preenchem o autor sozinhos |
| Sem teste da exclusão de equipamento pelo admin | `locais/tests/test_admin.py` | O trecho existe e foi corrigido, mas não é exercitado |

### Fase 5 (nuvem)

| Item | Onde |
|---|---|
| Armazenamento real no Cloud Storage, CORS do bucket e remoção da rota `/armazenamento-local/` | `fotos/armazenamento.py`, `fotos/urls.py` |
| Ajustes de produção do `check --deploy`: HSTS, redirecionamento para HTTPS, cookies `Secure` | `config/settings.py` |
| Imagem de produção: gunicorn no lugar do `runserver`, `collectstatic`, usuário sem privilégio de root | `Dockerfile` |
| Limite de tentativas (throttling) em login, cadastro e uploads | `REST_FRAMEWORK` em `config/settings.py` |
| Versões travadas das dependências | `requirements*.txt`: o `~=` já aceitou a troca de 5.2.17 para 5.2.18 sozinho |

---

## 3. Bugs e limitações conhecidos

| # | Sintoma | Causa | Onde olhar |
|---|---|---|---|
| 1 | POST sem a barra final responde **500** (`RuntimeError`) | `APPEND_SLASH`: com `DEBUG` ligado, o Django recusa redirecionar POST. Em produção, vira redirecionamento que perde o corpo, uma falha silenciosa | `django/middleware/common.py`; o front deve sempre usar a barra |
| 2 | 404 em inglês e sem orientação: `No Local matches the given query.` | Mensagem do `get_object_or_404`, que não é traduzida | `moderacao/views.py`, `get_object` dos ViewSets |
| 3 | Dois cadastros simultâneos do mesmo lugar, com nomes diferentes, passam os dois | A checagem de duplicata acontece antes do INSERT (verificar e depois agir); o banco só barra nome igual | `cadastrar_local` em `locais/servicos.py`. A denúncia "local duplicado" é a rede de segurança |
| 4 | "Praca" e "Praça" não são tratados como o mesmo nome | `nome__iexact` não ignora acentos | `possiveis_duplicatas`; a extensão `unaccent` do PostgreSQL resolveria |
| 5 | Apagar uma foto, um registro ou um local pelo admin deixa o arquivo no armazenamento | Só a troca de foto pela API remove o arquivo antigo | `definir_foto_local` em `locais/servicos.py` |
| 6 | No Swagger, escritas dão 403 depois de logar pela própria página | O login troca o token CSRF gravado na página | Recarregar a página; ver `Docs/API.md`, seção 5.6 |

---

## 4. Abordagens tentadas e descartadas

| Abordagem | Por que foi descartada | O que ficou |
|---|---|---|
| Imagem `postgis/postgis` | Só existe para amd64; rodaria emulada no Mac com processador ARM | Imagem própria: `docker/postgis/Dockerfile` |
| Imagem `imresamu/postgis` (com ARM) | Conta pessoal no Docker Hub, não oficial | Idem |
| SQLite nos testes | O GeoDjango exige SpatiaLite, e as funções espaciais se comportam diferente do PostGIS | Testes contra PostGIS real (`tests/test_banco.py`) |
| Projeção UTM 22S | Fixaria a aplicação na região, contra a RN-09 | `geography` com SRID 4326 (decisão 07) |
| Município como texto + UF, ou como tabela | Grafias ambíguas; tabela exigiria carga de dados | Código IBGE (decisão 08) |
| Segurança e zeladoria em entidades separadas | Dois formulários e duas tabelas por visita | `AvaliacaoLocal` única (decisão 09) |
| Denúncia sobre qualquer registro (`GenericForeignKey`) | Associação polimórfica: complexidade sem ganho no MVP | Denúncia só sobre o local (decisão 10) |
| Token do DRF ou JWT | Token guardado no navegador fica exposto a XSS; não há múltiplos domínios | Sessão + CSRF (decisão 11) |
| GeoJSON nas respostas | A ordem `[lon, lat]` do GeoJSON é o inverso da do Leaflet | `latitude` e `longitude` explícitas (decisão 12) |
| `Referrer-Policy` padrão do Django (`same-origin`) | Omitia o Referer, e o OpenStreetMap bloqueava os tiles | `strict-origin-when-cross-origin` (decisão 13) |
| Bucket real no desenvolvimento; emulador `fake-gcs-server` | Recurso pago no GCP; imagem de terceiro com suporte parcial a URL assinada | Simulação local com URL assinada (decisão 15) |
| Upload passando pela aplicação | Contraria o CLAUDE.md e sobrecarrega a aplicação | URL assinada em três passos |
| Limite de 5 MB por foto | Acima do limite de 2,5 MB do Django para o corpo da requisição | 2 MB, com redimensionamento no navegador (decisão 21) |
| Galeria de fotos por equipamento; várias fotos por local | A foto envelhece como a condição; escopo maior | Foto no registro de condição e uma por local (decisões 16 e 17) |
| Edição livre (estilo wiki) ou nenhuma edição | Sobrescrita sem histórico; ou o autor não corrigiria um erro de digitação | Só o autor faz PATCH (decisão 18) |
| Rota separada para verificar duplicata | O POST não se protegeria sozinho | `409` com candidatos e `confirmar_novo` (decisão 19) |
| Raio de duplicata de 50 m | Perderia a duplicata real: duas marcações do Parque Infantil ficaram a 84 m | 150 m (`RAIO_DUPLICATA_M`) |
| `readonly_fields` fixo no admin de denúncias | Tirava local e motivo do formulário de criação (bug, PR #12) | `get_readonly_fields` |
| `save_formset` lendo `deleted_objects` antes do `save` | O atributo ainda não existia (bug, PR #10) | Ordem da documentação do Django |
| `auto_now_add` nas datas de registro | Impede datar no passado, e os testes de "mais recente" precisam disso | `default=timezone.now` |
| `on_delete=PROTECT` na autoria | Impediria excluir uma conta (LGPD) | `SET_NULL` |
| Publicar a porta 5432 do banco | Conflita com o PostgreSQL instalado no Mac (EDB) | Sem porta no compose; override local na 5434 (`Docs/comandos_acesso_db.md`) |
| Regra E501 do ruff | Só apontaria strings que o formatador não consegue quebrar | Desligada no `pyproject.toml` |
| Abrir PRs pelo `gh` | Preferência do autor | PRs abertas manualmente (CLAUDE.md, Git) |

---

## 5. Por onde começar a Fase 4

1. Resolver as decisões da seção 2 ("Decidir no início da Fase 4") e registrá-las no README, a partir da decisão 22.
2. Primeira entrega só de leitura: mapa Leaflet e lista textual com os mesmos dados e filtros (`GET /api/locais/`, `GET /api/opcoes/`), operável por teclado, com resultados anunciados em `aria-live`.
3. Depois: sessão e login, cadastro de local com o fluxo de duplicata, avaliações e envio de foto, nesta ordem (fluxos em `Docs/API.md`, seção 6).
