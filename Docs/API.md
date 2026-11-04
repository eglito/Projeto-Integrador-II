# API

Contrato da API REST para o front-end.
O esquema OpenAPI gerado do código, em `/api/schema/` (navegável em `/api/docs/`), é a fonte de verdade dos campos. Este documento explica o que o esquema não mostra: autenticação, formato de erro, paginação e os fluxos que envolvem mais de uma requisição.

---

## 1. Convenções gerais

| Item | Regra |
|---|---|
| Origem | O front é servido pelo próprio Django: use URLs relativas (`/api/...`) |
| Formato | JSON, com `Content-Type: application/json` |
| Barra final | Obrigatória. Um POST sem a barra responde **500** (o Django não redireciona POST) |
| Coordenadas | `latitude` e `longitude` em graus decimais (WGS 84). Ordem do Leaflet: `[latitude, longitude]` |
| Datas | ISO 8601 com fuso, no horário de São Paulo (ex.: `2026-11-02T14:39:10-03:00`) |
| Escolhas | A API recebe e devolve o **valor** (`precario`). Os rótulos (`Precário`) vêm de `/api/opcoes/` |
| Comodidades | `true`, `false` ou `null`; `null` significa "não informado", e não "não tem" |

---

## 2. Autenticação: sessão + CSRF

Decisão 11 do README. Código em `usuarios/views.py`.

1. Ao carregar a página, chame `GET /api/auth/sessao/`. A resposta diz se há sessão (`autenticado`, `usuario`) e grava o cookie `csrftoken`.
2. Em **todo** POST, PUT e PATCH, envie o cabeçalho `X-CSRFToken` com o valor atual do cookie `csrftoken`. Vale também para login e cadastro, mesmo sem sessão.
3. **O token muda no login e no cadastro.** Leia o cookie a cada requisição; não guarde o token numa variável no carregamento da página. Token antigo responde 403.
4. O cookie de sessão é HttpOnly: o JavaScript não o lê, nem precisa. O navegador o envia sozinho nas requisições de mesma origem.

| Acesso | Significado |
|---|---|
| Livre | Qualquer pessoa, com ou sem login |
| Autenticado | Exige sessão aberta |
| Autor | Exige sessão aberta e ser quem cadastrou o item (`locais/permissoes.py`) |

---

## 3. Formato de erro

| Status | Corpo | Quando |
|---|---|---|
| 400 | `{"campo": ["mensagem"]}` | Erro num campo específico. Mostre a mensagem junto do campo |
| 400 | `{"non_field_errors": ["mensagem"]}` | Regra que envolve mais de um campo (restrições do model). Mostre no topo do formulário |
| 403 | `{"detail": "mensagem"}` | Sem login, sem permissão de autor ou token CSRF ausente ou antigo |
| 404 | `{"detail": "mensagem"}` | Item inexistente |
| 405 | `{"detail": "Método \"PUT\" não é permitido."}` | Método que a rota não aceita |
| 409 | `{"detail": "...", "possiveis_duplicatas": [Local, ...]}` | Cadastro de local que pode já existir (seção 6.2) |
| 409, 413 | `{"detail": "mensagem"}` | Envio de arquivo: link já usado (409), arquivo acima de 2 MB (413) |

As mensagens de 400 dizem como corrigir (CLAUDE.md, Acessibilidade) e vêm prontas em português. Exibir o texto como recebido, numa região `aria-live`, já atende à regra.

Os textos de cada caso estão em `Docs/testes_das_rotas.md`.

---

## 4. Paginação

Só os históricos são paginados: `GET .../registros-condicao/` e `GET .../avaliacoes/`. São 20 itens por página, com `?page=2` para avançar:

```json
{"count": 42, "next": "http://.../?page=3", "previous": "http://.../?page=1", "results": [...]}
```

`GET /api/locais/` devolve uma lista simples, sem paginação (limite conhecido, em `Docs/HANDOFF.md`).

---

## 5. Rotas

`*` marca campo obrigatório na entrada.

### 5.1 Sessão e conta

| Método | Rota | Acesso | Entrada | Resposta |
|---|---|---|---|---|
| GET | `/api/auth/sessao/` | Livre | — | 200 `{autenticado, usuario}` e o cookie `csrftoken` |
| POST | `/api/auth/cadastro/` | Livre + CSRF | `username*`, `password*` | 201 Usuario, já com sessão aberta |
| POST | `/api/auth/login/` | Livre + CSRF | `username*`, `password*` | 200 Usuario |
| POST | `/api/auth/logout/` | Autenticado | — | 204 |
| PUT | `/api/auth/conta/` | Autenticado | `username*`, `senha_atual*` | 200 Usuario. A sessão continua, com o nome novo |
| POST | `/api/auth/conta/senha/` | Autenticado | `senha_atual*`, `nova_senha*` | 204. Mantém esta sessão e encerra as outras sessões da conta |

Configurações (decisões 23 e 38): as duas trocas pedem a senha atual. A nova senha passa pelos mesmos validadores do cadastro e precisa ser diferente da atual. O token CSRF não muda na troca de senha.

Nome de usuário: no cadastro, no login e na troca, ele é normalizado (Unicode NFKC) antes de qualquer conferência. Letras de largura total, como `ｐｒａｔｉｃａｎｔｅ`, viram letras comuns; assim um nome não imita outro visualmente.

### 5.2 Vocabulário

| Método | Rota | Acesso | Resposta |
|---|---|---|---|
| GET | `/api/opcoes/` | Livre | 200 Opcoes (seção 5.7) |

### 5.3 Locais

| Método | Rota | Acesso | Entrada | Resposta |
|---|---|---|---|---|
| GET | `/api/locais/` | Livre | Query, abaixo | 200 lista de Local |
| POST | `/api/locais/` | Autenticado | `nome*`, `municipio_ibge*`, `latitude*`, `longitude*`, `endereco`, `tem_bebedouro`, `tem_sanitario`, `tem_bancos`, `confirmar_novo` | 201 LocalDetalhe, com cabeçalho `Location`; ou 409 |
| GET | `/api/locais/{id}/` | Livre | — | 200 LocalDetalhe |
| PATCH | `/api/locais/{id}/` | Autor | Os mesmos campos do POST, todos opcionais. `latitude` e `longitude` só juntas | 200 LocalDetalhe |
| PUT | `/api/locais/{id}/foto/` | Autenticado | `objeto*`, `texto_alternativo*` | 201 (criada) ou 200 (trocada) FotoLocal |
| POST | `/api/locais/{id}/equipamentos/` | Autenticado | `tipo*`, `nome_outro` (obrigatório só se `tipo` = `outro`), `altura_cm`, `largura_cm` (só barras paralelas) | 201 Equipamento |
| GET | `/api/locais/{id}/avaliacoes/` | Livre | `?page` | 200 página de AvaliacaoLocal (últimos 90 dias) |
| POST | `/api/locais/{id}/avaliacoes/` | Autenticado | `faixa_horario*`, `movimento*`, `limpeza*`, `iluminacao` (obrigatória se `faixa_horario` = `noite`) | 201 AvaliacaoLocal |
| POST | `/api/locais/{id}/denuncias/` | Autenticado | `motivo*` | 201 Denuncia, com `status` = `aberta` |

Query de `GET /api/locais/` (`locais/serializers.py`, `BuscaLocaisSerializer`):

| Parâmetro | Efeito |
|---|---|
| `latitude` e `longitude` | Juntas, ativam a busca por proximidade, do mais perto ao mais longe, com `distancia_m` preenchido |
| `raio` | Metros. Padrão 2000, máximo 10000. Só vale com coordenadas |
| `tipo` | Só locais com esse tipo de equipamento |
| `altura_maxima` | Centímetros. Com `tipo`, vale para o mesmo equipamento |

Sem coordenadas, a lista vem em ordem alfabética. Ela serve a lista textual (RN-10), com os mesmos filtros do mapa.

### 5.4 Equipamentos e registros de condição

| Método | Rota | Acesso | Entrada | Resposta |
|---|---|---|---|---|
| GET | `/api/equipamentos/{id}/` | Livre | — | 200 Equipamento |
| PATCH | `/api/equipamentos/{id}/` | Autor | `tipo`, `nome_outro`, `altura_cm`, `largura_cm` | 200 Equipamento |
| GET | `/api/equipamentos/{id}/registros-condicao/` | Livre | `?page` | 200 página de RegistroCondicao, do mais recente ao mais antigo |
| POST | `/api/equipamentos/{id}/registros-condicao/` | Autenticado | `condicao*`, `foto_objeto`, `foto_texto_alternativo` (os dois juntos, ou nenhum) | 201 RegistroCondicao |

### 5.5 Envio de foto

| Método | Rota | Acesso | Entrada | Resposta |
|---|---|---|---|---|
| POST | `/api/uploads/` | Autenticado | `tipo_conteudo*` (`image/jpeg`, `image/png`, `image/webp`), `tamanho*` (bytes, até 2 MB) | 201 Upload |
| PUT | `/armazenamento-local/{token}/` | URL assinada | O arquivo, com o `Content-Type` pedido | 200. Só no desenvolvimento; fora do OpenAPI |

### 5.6 Documentação e admin

| Rota | Conteúdo |
|---|---|
| `/api/schema/` | Esquema OpenAPI 3 (YAML; `?format=json` para JSON) |
| `/api/docs/` | Swagger UI. Envia o CSRF sozinho; depois de logar pela página, recarregue-a |
| `/admin/` | Cadastro e moderação (denúncias e fotos) |

### 5.7 Representações

Campos exatos em `locais/serializers.py`, `usuarios/serializers.py`, `moderacao/serializers.py` e `fotos/serializers.py`.

| Objeto | Campos principais |
|---|---|
| Usuario | `id`, `username` |
| Local | `id`, `nome`, `municipio_ibge`, `municipio_nome`, `endereco`, `latitude`, `longitude`, `tem_bebedouro`, `tem_sanitario`, `tem_bancos`, `distancia_m` (só na busca por proximidade), `equipamentos` |
| LocalDetalhe | Local + `foto` (FotoLocal ou `null`), `criado_por`, `criado_em`, `seguranca` |
| `seguranca` | Por faixa (`manha`, `tarde`, `noite`): `avaliacoes` (total) e contagens de `movimento` e `iluminacao` por valor, dos últimos 90 dias |
| Equipamento | `id`, `tipo`, `tipo_nome`, `nome_outro`, `altura_cm`, `largura_cm`, `condicao_atual`, `condicao_atual_nome`, `condicao_registrada_em`, `foto_condicao_url`, `foto_condicao_texto_alternativo` |
| RegistroCondicao | `id`, `condicao`, `condicao_nome`, `foto_url`, `foto_texto_alternativo`, `autor`, `registrado_em` |
| AvaliacaoLocal | `id`, `faixa_horario`, `iluminacao`, `movimento`, `limpeza`, `autor`, `registrado_em` |
| Denuncia | `id`, `motivo`, `status`, `criada_em` |
| FotoLocal | `url`, `texto_alternativo`, `enviada_por`, `enviada_em` |
| Upload | `objeto`, `url`, `metodo`, `cabecalhos`, `expira_em` |
| Opcoes | `municipios`, `tipos_equipamento`, `condicoes`, `faixas_horario`, `iluminacao`, `movimento`, `limpeza`, `motivos_denuncia` (listas de `{valor, rotulo}`) e `busca` (`raio_padrao_m`, `raio_maximo_m` e `centro_padrao`, com `latitude`, `longitude` e `zoom`) |

A condição e a foto do equipamento são sempre as do **registro mais recente**, com a data (RN-02). Mostre a data junto, para quem lê saber se a informação é atual.

---

## 6. Fluxos para o front-end

### 6.1 Abertura da página

1. `GET /api/auth/sessao/`: mostra "Entrar" ou o nome do usuário e grava o cookie CSRF.
2. `GET /api/opcoes/`: monta seletores, filtros e rótulos, e dá o centro inicial do mapa (`busca.centro_padrao`) enquanto não há a posição da pessoa.
3. `GET /api/locais/`: o mesmo resultado alimenta o mapa e a lista textual.

### 6.2 Cadastro de local com possível duplicata (RN-01)

1. `POST /api/locais/`.
2. Se vier **409**, mostre `detail` e os `possiveis_duplicatas` (nome e `distancia_m`), com duas saídas:
   - "É este lugar": leve a pessoa ao local existente, para avaliar em vez de cadastrar.
   - "É outro lugar": reenvie o mesmo POST com `"confirmar_novo": true`.
3. Com **201**, o cabeçalho `Location` e o `id` apontam para o local criado. O passo seguinte é acrescentar os equipamentos (5.3).

Critério de candidato: local a até 150 m, ou de mesmo nome a até 10 km (`locais/servicos.py`, `possiveis_duplicatas`).

### 6.3 Envio de foto (decisões 15, 16, 17 e 21)

1. **No navegador, antes de tudo:** redesenhe a imagem num `<canvas>`, redimensionando-a. Isso reduz o tamanho e descarta os metadados EXIF, que podem conter o GPS de onde a foto foi tirada. Só então meça o `tamanho`.
2. `POST /api/uploads/` com `tipo_conteudo` e `tamanho`.
3. `PUT` do arquivo na `url` devolvida, com os `cabecalhos` devolvidos. **Não** envie `X-CSRFToken` aqui: quem autoriza é a assinatura da URL, que vale 10 minutos e uma única vez.
4. Anexe o `objeto` devolvido no passo 2:
   - foto do local: `PUT /api/locais/{id}/foto/`, com `texto_alternativo`;
   - foto do equipamento: no `POST` do registro de condição, com `foto_objeto` e `foto_texto_alternativo`.

O texto alternativo é obrigatório no banco. O formulário deve pedi-lo junto com a foto, com orientação de como descrever (ex.: "Barras paralelas ao lado de bancos, sob árvores").

Na Fase 5, a URL do passo 3 passará a ser do Cloud Storage, em outro domínio. O fluxo do front não muda.

### 6.4 Avaliação de segurança e limpeza

O campo `iluminacao` só é obrigatório quando `faixa_horario` é `noite` (RN-05). Mostre-o, ou marque-o como obrigatório, conforme a faixa escolhida, para o erro 400 não ser a primeira notícia da regra.
