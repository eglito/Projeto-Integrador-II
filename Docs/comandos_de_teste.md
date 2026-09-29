# Comandos de Teste

Material de apoio para subir, testar e desligar a aplicação no ambiente local.
Todos os comandos rodam na raiz do projeto.

Há duas formas de testar: a suíte automática (pytest e ruff) e o uso da aplicação no navegador. A primeira configuração do ambiente (`.env`, migrations, superusuário) está no [README](../README.md#7-ambiente-local).

---

## 1. Subir o ambiente

Neste projeto o Docker roda dentro do Colima (macOS). Ligue-o antes de qualquer comando `docker`:

```bash
colima start
```

A resposta `already running, ignoring` indica que ele já estava ligado. Não é erro.

> Com Docker Desktop, ignore os comandos `colima` e abra o aplicativo do Docker Desktop.

Suba os containers. O `--build` reconstrói as imagens quando algo mudou:

```bash
docker compose up -d --build
```

Confira se estão de pé:

```bash
docker compose ps
```

O `db` precisa aparecer como `healthy` e o `web` como `Up`. Lista vazia significa containers parados: repita o comando anterior.

### Leitura da saída do build

- **`Using cache`:** o Docker reaproveitou aquela camada da imagem. Sistema, GDAL e dependências Python só são refeitos quando o [Dockerfile](../Dockerfile) ou os `requirements*.txt` mudam; no dia a dia, só o `COPY . .` roda de novo. Mesmo princípio do Maven, que não baixa de novo o que já está no `~/.m2`.
- **`requires buildx plugin`:** aviso inofensivo. Sem o buildx, o Compose usa o builder antigo do Docker (`builder=classic`), que funciona, mas está sendo descontinuado. Para remover o aviso, veja a seção 6.

### Leitura da saída do `docker compose ps`

| Trecho | Significado |
|---|---|
| `(healthy)` no `db` | O banco passou no healthcheck (`pg_isready`) e aceita conexões. |
| `5432/tcp`, sem seta | Porta visível só na rede interna do Docker. O Django acessa o banco pelo nome `db`; o host não enxerga a porta, o que evita conflito com um PostgreSQL instalado localmente. |
| `127.0.0.1:8000->8000/tcp` | Django publicado só para o próprio computador. Outras máquinas da rede não acessam. |
| Tempos de `CREATED` diferentes | O Compose só recria o container cuja imagem mudou. É comum o `db` seguir intacto enquanto o `web` é recriado. |

---

## 2. Testes automáticos

Os testes rodam dentro do container `web`, contra PostgreSQL + PostGIS real.

```bash
# Suíte completa
docker compose exec web pytest

# Nome e resultado de cada teste
docker compose exec web pytest -v

# Só um arquivo
docker compose exec web pytest tests/test_banco.py -v

# Só testes com uma palavra no nome
docker compose exec web pytest -k postgis -v

# Um teste isolado, pelo identificador arquivo::função
docker compose exec web pytest "tests/test_banco.py::test_banco_de_testes_tem_postgis_habilitado"
```

O identificador `arquivo::função` aparece na saída do `-v`. Use-o para depurar um caso sem rodar a suíte inteira.

Nome de teste longo é intencional: quando um teste falha, o nome já diz o que quebrou, sem precisar abrir o arquivo.

### Leitura da saída do pytest

| Linha | Significado |
|---|---|
| `django: version: ..., settings: config.settings (from ini)` | O pytest-django achou a configuração no [pyproject.toml](../pyproject.toml). Sem essa linha, os testes rodam sem Django. |
| `rootdir: /app` | Os testes rodaram dentro do container, onde o código fica montado em `/app`. |
| `collected N items` | Testes encontrados. O pytest procura sozinho funções `test_*` em arquivos `test_*.py`, sem anotação como o `@Test` do JUnit. |
| `.` · `F` · `E` | Teste que passou · falhou · quebrou fora da verificação (preparação ou limpeza, como banco e fixtures). `F` e `E` vêm seguidos do detalhe. |
| `PASSED` · `FAILED` · `ERROR` | O mesmo resultado no modo `-v`, ao lado do identificador `arquivo::função`. |

> O pytest-django cria um banco separado com prefixo `test_` (por exemplo, `test_calistenia`), aplica as migrations, roda os testes e apaga esse banco no fim. O banco de desenvolvimento não é tocado.

---

## 3. Lint e formatação

**Obrigatório antes de todo commit.**

```bash
# Aponta problemas de código: imports, variáveis sem uso, armadilhas comuns
docker compose exec web ruff check .

# Confere a formatação sem alterar arquivos
docker compose exec web ruff format --check .

# Aplica a formatação
docker compose exec web ruff format .
```

As regras ativas estão no [pyproject.toml](../pyproject.toml).

---

## 4. Teste no navegador

Por enquanto a única tela é o admin do Django. Crie um usuário administrador; o comando pede nome, e-mail e senha:

```bash
docker compose exec web python manage.py createsuperuser
```

Acesse http://localhost:8000/admin/ e faça login. Em **Usuários** aparece o modelo `Usuario`. Cadastrar outro usuário por ali confirma que aplicação e banco estão funcionando.

Se algo der errado, os logs do Django mostram o erro. `Ctrl+C` encerra a leitura sem parar o container:

```bash
docker compose logs -f web
```

---

## 5. Parar e limpar

Uso comum ao fim do dia:

```bash
docker compose down
colima stop
```

Cada comando remove uma camada diferente:

| Comando | Remove | Preserva |
|---|---|---|
| `docker compose down` | Containers e rede | Banco e imagens |
| `docker compose down -v` | Containers, rede e banco | Imagens |
| `docker compose down -v --rmi local` | Containers, rede, banco e imagens do projeto | Nada do projeto |
| `colima stop` | Nada; só desliga a máquina virtual do Docker | Imagens e volumes de todos os projetos |

Depois de um `down -v`, o banco volta vazio. Ao subir de novo, rode as migrations e, se precisar, recrie o superusuário:

```bash
docker compose exec web python manage.py migrate
```

> `colima delete` apaga a máquina virtual inteira, com imagens e volumes de todos os projetos. Use só para recomeçar o Docker do zero.

---

## 6. Problemas comuns

| Sintoma | Causa | Correção |
|---|---|---|
| `Cannot connect to the Docker daemon` | Colima desligado | `colima start` |
| `env file .../.env not found` | `.env` ausente; ele não é versionado | `cp .env.example .env` e troque chave e senha |
| `docker compose ps` sem nenhuma linha | Containers parados | `docker compose up -d --build` |
| `port is already allocated` na porta 8000 | Outro ambiente do projeto rodando, por exemplo em outro worktree | `docker compose down` na outra pasta |
| Aviso `requires buildx plugin` | Plugin buildx não instalado | Opcional; veja abaixo |

### Remover o aviso do buildx

```bash
brew install docker-buildx
```

Em seguida, adicione ao objeto do `~/.docker/config.json` a pasta de plugins do Homebrew (caminho de Mac com Apple Silicon):

```json
"cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"]
```
