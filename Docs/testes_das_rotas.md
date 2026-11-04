# Testes das Rotas da API

Material de apoio para testar, uma a uma, as rotas da API e do admin.
Os comandos e as respostas esperadas foram conferidos contra a aplicação em execução.

> Os testes de escrita gravam dados reais no banco de desenvolvimento: um usuário de teste, locais, avaliações e denúncias. A seção 14 explica como limpar.

---

## 1. Antes de começar

O ambiente precisa estar no ar, com as migrations aplicadas e um superusuário criado. Os comandos estão no [guia de comandos de teste](comandos_de_teste.md).

Há três formas de testar, e cada rota indica a mais adequada:

| Forma | Serve para | Limitação |
|---|---|---|
| **Navegador** | Rotas GET: abrir a URL e ler o JSON | Não envia POST, PATCH nem PUT |
| **`/api/docs/`** (Swagger) | Todas as rotas da API, com formulários prontos | O passo 2 do envio de foto não aparece |
| **Terminal com `curl`** | Todas as rotas, inclusive o envio de arquivo | Exige preparar cookies e o token CSRF (seção 2) |

Três regras valem para todas as rotas:

- **Barra no final da URL é obrigatória.** `POST /api/auth/cadastro` (sem barra) responde **500**: o Django não consegue redirecionar um POST para a URL com barra sem perder os dados.
- **Escrita exige o cabeçalho `X-CSRFToken`,** com o valor do cookie `csrftoken`. Vale também para login e cadastro, mesmo sem sessão.
- **O token CSRF muda a cada login ou cadastro.** Depois de entrar, use o token novo; o antigo responde 403.

---

## 2. Preparando o terminal

Use o Terminal do macOS ou o Ubuntu (WSL) no Windows. O PowerShell trata aspas e o `curl` de outro jeito e não serve para estes comandos.

Crie uma pasta de trabalho **fora do repositório**, porque o arquivo de cookies guarda a sua sessão:

```bash
mkdir -p ~/teste-api && cd ~/teste-api
```

Cole o bloco abaixo. Ele define o endereço da aplicação e duas funções que fazem o que o jQuery fará no front-end: guardar os cookies e enviar o token CSRF.

```bash
BASE=http://localhost:8000
csrf() { awk '$6=="csrftoken" {print $7}' "${JAR:-cookies.txt}" 2>/dev/null; }
api() {
  curl -s -c "${JAR:-cookies.txt}" -b "${JAR:-cookies.txt}" \
       -H "X-CSRFToken: $(csrf)" -H "Content-Type: application/json" \
       -w "\nHTTP %{http_code}\n" "$@"
}
```

| Peça | Papel |
|---|---|
| `-c` e `-b cookies.txt` | Gravam e reenviam os cookies, como o navegador faz |
| `csrf` | Lê o token atual do arquivo de cookies; por isso sempre pega o token novo depois do login |
| `-w "HTTP ..."` | Mostra o status da resposta na última linha |
| `JAR` | Permite simular uma segunda pessoa com outro arquivo de cookies (seção 5.4) |

Para ler respostas longas formatadas, troque a última linha da saída por `| python3 -m json.tool` (sem o `-w`). Exemplo: `curl -s $BASE/api/locais/ | python3 -m json.tool`.

---

## 3. Autenticação

### 3.1 GET `/api/auth/sessao/`

Informa se há sessão aberta e entrega o cookie `csrftoken`. É sempre a primeira chamada.

**Navegador:** abra http://localhost:8000/api/auth/sessao/

**Terminal:**

```bash
api $BASE/api/auth/sessao/
```

Resultado esperado:

```
{"autenticado":false,"usuario":null}
HTTP 200
```

Confira que o cookie chegou: `cat cookies.txt` deve mostrar uma linha com `csrftoken`.

### 3.2 POST `/api/auth/cadastro/`

Cria o usuário e já abre a sessão. Só pede nome e senha (minimização de dados, LGPD).

```bash
api -X POST -d '{"username": "testadora", "password": "Barra-fixa-2026"}' $BASE/api/auth/cadastro/
```

Resultado esperado: `{"id":...,"username":"testadora"}` e `HTTP 201`. A senha nunca volta na resposta.

Casos de erro para testar:

| Teste | Comando (troque o `-d`) | Esperado |
|---|---|---|
| Senha fraca | `'{"username": "x1", "password": "123"}'` | 400, com as três explicações: muito curta, muito comum, inteiramente numérica |
| Sem token CSRF | `curl -s -X POST -H "Content-Type: application/json" -d '{}' $BASE/api/auth/cadastro/` | 403, `CSRF Failed: CSRF token missing.` |
| Sem a barra final | `api -X POST -d '{}' $BASE/api/auth/cadastro` | 500, `RuntimeError` |

### 3.3 POST `/api/auth/login/`

```bash
api -X POST -d '{"username": "testadora", "password": "Barra-fixa-2026"}' $BASE/api/auth/login/
```

Resultado esperado: `{"id":...,"username":"testadora"}` e `HTTP 200`. Confirme com a seção 3.1: agora `autenticado` deve ser `true`.

| Teste | Esperado |
|---|---|
| Senha errada | 400, `Usuário ou senha incorretos. Confira os dois campos e tente de novo.` |
| Usuário que não existe | A mesma mensagem: a API não revela quais usuários existem |

### 3.4 PUT `/api/auth/conta/`

Troca o nome de usuário (Configurações, README, decisões 23 e 38). Exige sessão aberta e a senha atual. É PUT, e não PATCH: os dois campos são obrigatórios.

```bash
api -X PUT -d '{"username": "testadora_nova", "senha_atual": "Barra-fixa-2026"}' $BASE/api/auth/conta/
```

Resultado esperado: `{"id":...,"username":"testadora_nova"}` e `HTTP 200`. A sessão continua aberta, já com o nome novo (seção 3.1).

| Teste | Comando (troque o `-d`) | Esperado |
|---|---|---|
| Senha atual errada | `'{"username": "outro", "senha_atual": "errada"}'` | 400, `Senha atual incorreta. Digite a senha que você usa para entrar.` |
| Sem a senha atual | `'{"username": "outro"}'` | 400, `Informe a sua senha atual para confirmar a troca.` |
| Nome de outra conta | `'{"username": "<nome que já existe>", "senha_atual": "Barra-fixa-2026"}'` | 400, `Este nome de usuário já está em uso. Escolha outro.` |
| PATCH no lugar de PUT | `api -X PATCH -d '{}' $BASE/api/auth/conta/` | 405, `Método "PATCH" não é permitido.` |
| Nome com letras de largura total | `'{"username": "ｔｅｓｔａｄｏｒａ_ｎｏｖａ", "senha_atual": "Barra-fixa-2026"}'` | 200, gravado como `testadora_nova`: o nome é normalizado antes de conferir se está livre |

Para seguir o roteiro com os exemplos das outras seções, volte ao nome original:

```bash
api -X PUT -d '{"username": "testadora", "senha_atual": "Barra-fixa-2026"}' $BASE/api/auth/conta/
```

### 3.5 POST `/api/auth/conta/senha/`

Troca a senha. Mantém a sessão atual e encerra as outras sessões da mesma conta.

Para ver as outras sessões caírem, abra antes uma segunda sessão, como se fosse outro aparelho:

```bash
JAR=outra.txt api $BASE/api/auth/sessao/
JAR=outra.txt api -X POST -d '{"username": "testadora", "password": "Barra-fixa-2026"}' $BASE/api/auth/login/
```

Depois, troque a senha pela sessão principal:

```bash
api -X POST -d '{"senha_atual": "Barra-fixa-2026", "nova_senha": "Paralelas-baixas-2026"}' $BASE/api/auth/conta/senha/
```

Resultado esperado: corpo vazio e `HTTP 204`. Confira as duas sessões com a seção 3.1: `api` continua com `autenticado: true`, e `JAR=outra.txt api` passa a `autenticado: false`.

Depois dos casos de erro abaixo, volte à senha dos exemplos, que as outras seções usam:

```bash
api -X POST -d '{"senha_atual": "Paralelas-baixas-2026", "nova_senha": "Barra-fixa-2026"}' $BASE/api/auth/conta/senha/
```

| Teste | Comando (troque o `-d`) | Esperado |
|---|---|---|
| Senha atual errada | `'{"senha_atual": "errada", "nova_senha": "Paralelas-baixas-2026"}'` | 400, em `senha_atual` |
| Nova igual à atual | `'{"senha_atual": "<atual>", "nova_senha": "<atual>"}'` | 400, `A nova senha precisa ser diferente da atual.` |
| Nova senha fraca | `'{"senha_atual": "<atual>", "nova_senha": "123"}'` | 400, com as três explicações do cadastro |
| Sem login | `curl -s -X POST -d '{}' $BASE/api/auth/conta/senha/` | 403 |

### 3.6 POST `/api/auth/logout/`

```bash
api -X POST $BASE/api/auth/logout/
```

Resultado esperado: corpo vazio e `HTTP 204`. Sem sessão aberta, a resposta é 403.

> Para as seções 5 a 10, faça login de novo (3.3).

---

## 4. Vocabulário: GET `/api/opcoes/`

Valores e rótulos de todos os campos de escolha: tipos de equipamento, condições, faixas de horário, iluminação, movimento, limpeza, motivos de denúncia e municípios. Traz também os limites da busca e o centro padrão do mapa.

**Navegador:** http://localhost:8000/api/opcoes/

Confira: `{"valor": "barra_fixa", "rotulo": "Barra fixa"}` em `tipos_equipamento` e, em `busca`, `"raio_padrao_m": 2000`, `"raio_maximo_m": 10000` e `"centro_padrao": {"latitude": -21.7886713, "longitude": -48.1773096, "zoom": 14}`. Os valores (`valor`) são os que as outras rotas aceitam.

---

## 5. Locais

### 5.1 GET `/api/locais/`

Lista os locais com equipamentos e condição atual. A mesma rota serve o mapa e a lista textual.

**Navegador:**

| Teste | URL | Esperado |
|---|---|---|
| Todos, por nome | http://localhost:8000/api/locais/ | Lista em ordem alfabética, `distancia_m` nulo |
| Perto do Parque Infantil | http://localhost:8000/api/locais/?latitude=-21.7827686&longitude=-48.1793589&raio=1500 | Só os locais a até 1,5 km, do mais perto ao mais longe, com `distancia_m` |
| Só com espaldar | http://localhost:8000/api/locais/?tipo=espaldar | Só locais com espaldar, com ou sem coordenadas |
| Barra australiana até 100 cm | http://localhost:8000/api/locais/?tipo=barra_australiana&altura_maxima=100 | Tipo e altura valem para o mesmo equipamento (RN-03) |
| Raio acima do limite | http://localhost:8000/api/locais/?latitude=-21.7827686&longitude=-48.1793589&raio=20000 | 400, `Certifique-se de que este valor seja inferior ou igual a 10000.` |
| Latitude sem longitude | http://localhost:8000/api/locais/?latitude=-21.7827686 | 400, `Informe latitude e longitude juntas...` |

### 5.2 POST `/api/locais/`

Exemplo com uma praça real do OpenStreetMap, a Praça Doutor Roque José Hage:

```bash
api -X POST -d '{"nome": "Praça Doutor Roque José Hage", "municipio_ibge": 3503208, "latitude": -21.7737308, "longitude": -48.1786489, "tem_bancos": true}' $BASE/api/locais/
```

Resultado esperado: o local completo e `HTTP 201`. Anote o `id`: ele substitui `{id}` nas próximas seções. Para ver o cabeçalho `Location` com o endereço do recurso criado, acrescente `-i` ao comando.

**Possível duplicata (RN-01).** Tente cadastrar o Parque Infantil com o nome oficial do OpenStreetMap, num ponto a poucos metros do cadastrado:

```bash
api -X POST -d '{"nome": "Praça Major Abel Fortes", "municipio_ibge": 3503208, "latitude": -21.78252490771411, "longitude": -48.17859112312939}' $BASE/api/locais/
```

Resultado esperado: `HTTP 409`, a orientação em `detail` e a lista `possiveis_duplicatas`, com o Parque Infantil e a distância. Nada é gravado. O 409 depende de existir um local a até 150 m desse ponto: no banco de desenvolvimento, é o Parque Infantil cadastrado pelo admin. Num banco vazio, a resposta seria 201. Se fosse mesmo outro lugar, o mesmo comando com `"confirmar_novo": true` no JSON responderia 201.

| Teste | Esperado |
|---|---|
| Nome já usado no município (`"nome": "parque infantil"`, em qualquer ponto) | 400, `Já existe um local com este nome neste município...` |
| Sem login | 403, `As credenciais de autenticação não foram fornecidas.` |

### 5.3 GET `/api/locais/{id}/`

**Navegador:** http://localhost:8000/api/locais/1/ (troque o 1 pelo `id`)

Além dos campos da lista, o detalhe traz `foto`, `criado_por`, `criado_em` e `seguranca`: as avaliações dos últimos 90 dias contadas por faixa de horário (RN-04).

Um `id` inexistente responde 404, com a mensagem `No Local matches the given query.`

### 5.4 PATCH `/api/locais/{id}/`

Só quem cadastrou corrige o local.

```bash
api -X PATCH -d '{"tem_bebedouro": false}' $BASE/api/locais/{id}/
```

Resultado esperado: o local atualizado e `HTTP 200`.

**Outra pessoa tentando editar.** Crie uma segunda sessão com outro arquivo de cookies e tente o mesmo PATCH:

```bash
JAR=outra.txt api $BASE/api/auth/sessao/
```

```bash
JAR=outra.txt api -X POST -d '{"username": "outra_pessoa", "password": "Barra-paralela-2026"}' $BASE/api/auth/cadastro/
```

```bash
JAR=outra.txt api -X PATCH -d '{"tem_bebedouro": true}' $BASE/api/locais/{id}/
```

Resultado esperado: `HTTP 403`, `Só quem cadastrou pode alterar este item. Se a informação estiver errada, abra uma denúncia para a moderação.`

| Teste | Esperado |
|---|---|
| `api -X PUT -d '{}' $BASE/api/locais/{id}/` | 405, `Método "PUT" não é permitido.` |
| `api -X DELETE $BASE/api/locais/{id}/` | 405: a exclusão é feita pela moderação, no admin |

---

## 6. Equipamentos

### 6.1 POST `/api/locais/{id}/equipamentos/`

Qualquer pessoa logada acrescenta equipamentos a qualquer local.

```bash
api -X POST -d '{"tipo": "barra_australiana", "altura_cm": 110}' $BASE/api/locais/{id}/equipamentos/
```

Resultado esperado: o equipamento, com `condicao_atual` nulo, e `HTTP 201`. Anote o `id` do equipamento.

| Teste | Esperado |
|---|---|
| `'{"tipo": "barra_fixa", "largura_cm": 50}'` | 400, `A largura vale só para barras paralelas...` |
| `'{"tipo": "outro"}'` | 400, `Preencha o nome do equipamento quando o tipo for “Outro”...` |
| `'{"tipo": "barra_fixa", "altura_cm": 0}'` | 400, `Informe a altura em centímetros, com valor maior que zero.` |

### 6.2 GET `/api/equipamentos/{id}/`

**Navegador:** http://localhost:8000/api/equipamentos/1/

Traz a condição atual, a data do registro e a foto do registro mais recente, se houver.

### 6.3 PATCH `/api/equipamentos/{id}/`

Só o autor do equipamento corrige. Uso típico: registrar a altura medida em campo (RN-03).

```bash
api -X PATCH -d '{"altura_cm": 95}' $BASE/api/equipamentos/{id}/
```

Resultado esperado: o equipamento com `"altura_cm": 95` e `HTTP 200`. Com `JAR=outra.txt`, a resposta é 403.

---

## 7. Registros de condição

### 7.1 POST `/api/equipamentos/{id}/registros-condicao/`

```bash
api -X POST -d '{"condicao": "precario"}' $BASE/api/equipamentos/{id}/registros-condicao/
```

Resultado esperado: o registro com `condicao_nome` "Precário", o `autor` e a data do envio, e `HTTP 201`. Os valores aceitos estão em `condicoes`, na rota de opções. Registre outro com `"quebrado"` para o teste seguinte.

### 7.2 GET `/api/equipamentos/{id}/registros-condicao/`

**Navegador:** http://localhost:8000/api/equipamentos/1/registros-condicao/

Resultado esperado: `{"count": ..., "next": ..., "previous": ..., "results": [...]}`, do registro mais recente ao mais antigo, 20 por página (RN-02). No detalhe do local, o equipamento passa a mostrar a condição do registro mais recente.

Não existe PUT nem DELETE: os registros são imutáveis, para preservar o histórico.

---

## 8. Avaliações

### 8.1 POST `/api/locais/{id}/avaliacoes/`

```bash
api -X POST -d '{"faixa_horario": "noite", "iluminacao": "boa", "movimento": "movimentado", "limpeza": "regular"}' $BASE/api/locais/{id}/avaliacoes/
```

Resultado esperado: a avaliação com `autor` e data, e `HTTP 201`.

| Teste | Esperado |
|---|---|
| Noite sem iluminação: `'{"faixa_horario": "noite", "movimento": "movimentado", "limpeza": "limpo"}'` | 400, `Na avaliação noturna, informe também como está a iluminação.` |
| Tarde sem iluminação: o mesmo JSON com `"tarde"` | 201: de dia, a iluminação é opcional (RN-05) |

### 8.2 GET `/api/locais/{id}/avaliacoes/`

**Navegador:** http://localhost:8000/api/locais/1/avaliacoes/

Resultado esperado: as avaliações dos últimos 90 dias, paginadas. No detalhe do local (5.3), o bloco `seguranca` passa a contar a avaliação na faixa correspondente.

---

## 9. Denúncias: POST `/api/locais/{id}/denuncias/`

```bash
api -X POST -d '{"motivo": "local_duplicado"}' $BASE/api/locais/{id}/denuncias/
```

Resultado esperado: a denúncia com `"status": "aberta"` e `HTTP 201`. Os motivos aceitos estão em `motivos_denuncia`, na rota de opções.

| Teste | Esperado |
|---|---|
| Mesmo motivo, de novo | 400, `Você já tem uma denúncia aberta por este motivo para este local. Aguarde a análise da moderação.` |
| Enviar `"status": "procedente"` junto | O status é ignorado: a denúncia nasce `aberta` |
| Local inexistente | 404 |

Depois, confira a denúncia no admin (seção 12). Ao mudar o status para "Procedente" ou "Improcedente", a mesma pessoa pode denunciar o mesmo motivo de novo.

---

## 10. Fotos

O envio de foto tem três passos, e o arquivo nunca passa pela API (README, decisão 15). Coloque uma foto JPEG ou PNG de até 2 MB na pasta `~/teste-api` com o nome `foto.jpg` (para PNG, troque o nome e o tipo nos comandos).

### 10.1 Passo 1: POST `/api/uploads/`

O `tamanho` é o tamanho do arquivo em bytes; o `wc -c` mede:

```bash
api -X POST -d "{\"tipo_conteudo\": \"image/jpeg\", \"tamanho\": $(wc -c < foto.jpg | tr -d ' ')}" $BASE/api/uploads/
```

Resultado esperado: `objeto` (ex.: `fotos/3f2a...c9.jpg`), `url` (começa com `/armazenamento-local/`), `metodo` PUT, `cabecalhos` e `expira_em`, com `HTTP 201`. Guarde a `url` e o `objeto`:

```bash
URL_UPLOAD="cole aqui a url"
```

```bash
OBJETO="cole aqui o objeto"
```

| Teste | Esperado |
|---|---|
| `"tipo_conteudo": "image/gif"` | 400, `Envie a foto em JPEG, PNG ou WebP.` |
| `"tamanho": 3000000` | 400, `A foto pode ter no máximo 2 MB...` |

### 10.2 Passo 2: PUT do arquivo na URL assinada

Este passo não usa a função `api`: o corpo é a imagem, não JSON, e a URL assinada dispensa sessão e token.

```bash
curl -s -X PUT -H "Content-Type: image/jpeg" --data-binary @foto.jpg -w "HTTP %{http_code}\n" "$BASE$URL_UPLOAD"
```

Resultado esperado: `HTTP 200`.

| Teste | Esperado |
|---|---|
| Repetir o mesmo comando | 409, `Este link já foi usado...` |
| Esperar mais de 10 minutos entre os passos 1 e 2 | 403, `O link de envio expirou...` |
| `Content-Type` diferente do pedido no passo 1 | 400 |
| Enviar um arquivo de texto renomeado para `.jpg` | 400, `O arquivo não é uma imagem...` |

### 10.3 Passo 3a: PUT `/api/locais/{id}/foto/`

```bash
api -X PUT -d "{\"objeto\": \"$OBJETO\", \"texto_alternativo\": \"Barra australiana sob árvores, ao lado de bancos\"}" $BASE/api/locais/{id}/foto/
```

Resultado esperado: `texto_alternativo`, `url` (ex.: `/media/fotos/...jpg`), `enviada_por` e `enviada_em`, com `HTTP 201`. Abra http://localhost:8000 seguido da `url` para ver a imagem. Uma segunda foto, enviada pelos três passos, substitui a primeira com `HTTP 200`.

| Teste | Esperado |
|---|---|
| `"texto_alternativo": ""` | 400, `Descreva a foto no texto alternativo, para quem usa leitor de tela...` |
| `"objeto": "../config/settings.py"` | 400, `Foto não encontrada. Envie o arquivo pelo fluxo de upload...` |

### 10.4 Passo 3b: foto no registro de condição

Faça os passos 1 e 2 com outra foto e anexe ao registrar a condição:

```bash
api -X POST -d "{\"condicao\": \"precario\", \"foto_objeto\": \"$OBJETO\", \"foto_texto_alternativo\": \"Barra fixa com ferrugem na base\"}" $BASE/api/equipamentos/{id}/registros-condicao/
```

Resultado esperado: o registro com `foto_url` e `HTTP 201`. No detalhe do local, o equipamento passa a mostrar `foto_condicao_url`: a foto do registro mais recente envelhece com ele (decisão 16). Foto sem texto alternativo responde 400.

---

## 11. Documentação

### 11.1 GET `/api/schema/`

| URL | Esperado |
|---|---|
| http://localhost:8000/api/schema/ | O navegador baixa um arquivo YAML (`application/vnd.oai.openapi`) |
| http://localhost:8000/api/schema/?format=json | O mesmo esquema em JSON, com 15 caminhos em `paths` |

É o contrato da API: qualquer ferramenta compatível com OpenAPI 3 lê esse arquivo.

### 11.2 GET `/api/docs/`

A interface Swagger lista todas as rotas, com os campos aceitos e as respostas possíveis. Para testar por ela:

1. **Faça login primeiro pelo admin** (http://localhost:8000/admin/) e só depois abra http://localhost:8000/api/docs/. A sessão do admin vale para a API.
2. Abra uma rota, clique em **Try it out**, preencha e clique em **Execute**. A página envia o token CSRF sozinha.
3. **Se fizer login ou cadastro pela própria página, recarregue-a (F5) antes de testar outras rotas de escrita.** O token fica gravado na página quando ela carrega, e o login o troca: sem recarregar, as escritas respondem 403.
4. O passo 2 do envio de foto não aparece no Swagger: faça-o pelo terminal (10.2).

---

## 12. Admin: `/admin/`

Abrir http://localhost:8000/admin/ sem login redireciona (302) para a tela de login. Entre com o superusuário e confira:

| Tela | O que verificar |
|---|---|
| Locais | Mapa do OpenStreetMap no cadastro, "criado por" preenchido sozinho e equipamentos editados na mesma tela, com as mensagens das regras ao salvar (ex.: largura fora das barras paralelas) |
| Registros de condição | Os registros feitos pela API, com autor e foto |
| Avaliações do local | Filtros por faixa de horário, movimento e limpeza |
| Denúncias | Status editável direto na lista; ao abrir uma denúncia, só o status pode ser alterado |
| Fotos dos locais | Link "Abrir foto" para a moderação |
| Usuários | `testadora` e `outra_pessoa`, criadas pela API |

---

## 13. Roteiro rápido

Para conferir tudo depois de uma mudança, sem repetir cada caso de erro:

| # | Rota | Esperado |
|---|---|---|
| 1 | GET `/api/auth/sessao/` | 200, `autenticado: false` |
| 2 | POST `/api/auth/cadastro/` | 201 |
| 3 | POST `/api/auth/logout/` | 204 |
| 4 | POST `/api/auth/login/` | 200 |
| 5 | PUT `/api/auth/conta/` | 200 |
| 6 | POST `/api/auth/conta/senha/` | 204 |
| 7 | GET `/api/opcoes/` | 200 |
| 8 | GET `/api/locais/` e com `latitude`, `longitude` e `raio` | 200 |
| 9 | POST `/api/locais/` | 201 (ou 409 com candidatos) |
| 10 | GET e PATCH `/api/locais/{id}/` | 200 e 200 |
| 11 | POST `/api/locais/{id}/equipamentos/` | 201 |
| 12 | GET e PATCH `/api/equipamentos/{id}/` | 200 e 200 |
| 13 | POST e GET `/api/equipamentos/{id}/registros-condicao/` | 201 e 200 |
| 14 | POST e GET `/api/locais/{id}/avaliacoes/` | 201 e 200 |
| 15 | POST `/api/locais/{id}/denuncias/` | 201 |
| 16 | POST `/api/uploads/`, PUT na URL e PUT `/api/locais/{id}/foto/` | 201, 200 e 201 |
| 17 | GET `/api/schema/` e `/api/docs/` | 200 e 200 |
| 18 | GET `/admin/` sem login | 302 |

---

## 14. Limpeza

Apague os arquivos de cookies, que guardam as sessões:

```bash
rm -f ~/teste-api/cookies.txt ~/teste-api/outra.txt
```

Os dados criados (usuários `testadora` e `outra_pessoa`, locais, equipamentos, registros, avaliações, denúncias e fotos) ficam no banco de desenvolvimento. Remova-os pelo admin ou, para recomeçar com o banco vazio, use `docker compose down -v` e depois o `migrate` (o comando apaga **todos** os dados locais).

---

## 15. Problemas comuns

| Sintoma | Causa | Correção |
|---|---|---|
| `curl: (7) Failed to connect` | Ambiente desligado | Suba o ambiente ([comandos de teste](comandos_de_teste.md)) |
| 500 com `RuntimeError` | URL sem a barra final num POST | Termine a URL com `/` |
| 403, `CSRF Failed: CSRF token missing.` | Faltou o cabeçalho `X-CSRFToken` | Use a função `api` ou chame `/api/auth/sessao/` antes |
| 403, `CSRF Failed: CSRF token from the 'X-Csrftoken' HTTP header incorrect.` | Token antigo, de antes do login | Use `$(csrf)`, que lê o token atual; no Swagger, recarregue a página |
| 403, `As credenciais de autenticação não foram fornecidas.` | Rota de escrita sem login | Faça login (3.3) |
| 403, `Só quem cadastrou pode alterar este item...` | PATCH de quem não é o autor | Use a conta do autor ou abra uma denúncia |
| 404, `No Local matches the given query.` | `id` inexistente | Confira o `id` na listagem |
| 405 | Método que a rota não aceita | Consulte a tabela de rotas no README, seção 10 |
| 409 em `/api/locais/` | Possível duplicata | Confira os candidatos ou reenvie com `confirmar_novo` |
| 409 no envio de arquivo | URL assinada já usada | Peça uma nova URL (10.1) |
| `relation "..." does not exist` | Migrations não aplicadas | `docker compose exec web python manage.py migrate` |
