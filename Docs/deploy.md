# Deploy de teste em VM

Roteiro para publicar o mapa numa VM única, com Docker Compose e Caddy (README, decisão 46). Serve para qualquer provedor que ofereça uma VM Ubuntu.

```
Internet ──80/443──► Caddy ──► gunicorn (web:8000) ──► PostgreSQL + PostGIS (db:5432)
                       │
                       └── /media/ lido do volume "media", onde o Django grava as fotos
```

Só o Caddy publica portas. Banco e gunicorn ficam na rede interna do Compose.

---

## 1. Antes de começar

| Item | Detalhe |
|---|---|
| VM | Ubuntu 24.04 LTS, 2 GB de RAM (1 GB funciona com swap, seção 2), 20 GB de disco |
| Rede | IP que não muda e portas 22, 80 e 443 liberadas no firewall **do provedor** |
| Domínio | Registro `A` apontando para o IP da VM. HTTPS não é opcional: a geolocalização só funciona em contexto seguro (`Docs/especificacao_mapa.md`) e os cookies saem como `Secure` |
| Acesso | Chave SSH. Entrar por senha não é necessário |

A VM se cria pelo painel do provedor. O jeito de apagar tudo está na seção 9: leia antes de criar.

## 2. Preparar a VM

```bash
ssh usuario@IP_DA_VM
sudo apt update && sudo apt -y upgrade
```

**Docker:** siga a instalação oficial do repositório apt em <https://docs.docker.com/engine/install/ubuntu/>. Depois:

```bash
sudo usermod -aG docker $USER   # sai e entra de novo no SSH para valer
docker compose version
```

**Firewall do sistema:**

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable
```

O Docker publica portas direto no iptables e **ignora o ufw**. Por isso o `docker-compose.prod.yml` só tem `ports` no Caddy, e a barreira que vale é o firewall do provedor.

**Swap (só em VM de 1 GB):** o build da imagem e o PostgreSQL somados passam da memória.

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Baixar o código e configurar

```bash
git clone URL_DO_REPOSITORIO calistenia && cd calistenia
cp .env.prod.example .env && chmod 600 .env
python3 -c "import secrets; print(secrets.token_urlsafe(50))"   # copie para DJANGO_SECRET_KEY
nano .env
```

Troque no `.env`: `SITE_ADDRESS` e `DJANGO_ALLOWED_HOSTS` (o domínio, sem `https://`), `DJANGO_SECRET_KEY` e `POSTGRES_PASSWORD`. Deixe `DJANGO_HTTPS=True`.

Repositório privado: crie uma *deploy key* só de leitura (GitHub, Settings, Deploy keys) e clone por SSH.

**Confira o DNS antes de subir.** O Let's Encrypt bloqueia o domínio por um tempo depois de várias tentativas com falha.

```bash
dig +short SEU_DOMINIO     # tem que devolver o IP da VM
```

## 4. Subir

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web python manage.py migrate
docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

O `-f` é obrigatório: sem ele, o Compose lê o `docker-compose.yml` do desenvolvimento.

Opcional, para o mapa não abrir vazio: `docker compose -f docker-compose.prod.yml exec web python manage.py carregar_locais_araraquara` (dados de desenvolvimento, decisão 37; pode rodar várias vezes).

O Caddy leva alguns segundos para emitir o certificado na primeira vez: `docker compose -f docker-compose.prod.yml logs caddy`.

## 5. Conferir

- [ ] `https://SEU_DOMINIO/` abre o mapa, e `http://` redireciona para `https://`.
- [ ] Cadastrar conta, entrar, cadastrar um local e enviar uma foto (exercita o `PUT` por URL assinada e o `/media/`).
- [ ] `/admin/` aceita o superusuário.
- [ ] "Usar minha posição" funciona (só funciona em HTTPS).
- [ ] `docker compose -f docker-compose.prod.yml exec web python manage.py check --deploy` mostra **só** `W005` e `W021`. Os dois ficam de propósito: `includeSubDomains` e `preload` prendem todos os subdomínios e a lista dos navegadores por muito tempo, e com subdomínio de DNS dinâmico o `preload` nem é possível.

O que foi verificado numa pilha igual a esta, com Caddy em `localhost`: redirecionamento 308, estáticos com gzip, QUnit ausente, cabeçalhos HSTS e `X-Frame-Options`, processo como usuário `app` (não root), portas publicadas só pelo Caddy, `PUT` de foto (200), link reutilizado (409), foto de 2,5 MB recusada pelo Django (413), corpo de 4 MB cortado pelo Caddy (413), `/media/` sem sair da pasta, cadastro com cookies `Secure` e erro 500 no `docker logs`. **Não** foi verificado: certificado do Let's Encrypt (precisa de domínio real), geolocalização no navegador e a restauração de backup.

## 6. Atualizar a versão

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec web python manage.py migrate
```

Os estáticos não têm hash no nome (decisão 47): depois de um deploy, o navegador pode mostrar CSS/JS antigo por até 60 segundos.

## 7. Backup

O disco da VM é o único lugar dos dados. **Ensaie a restauração antes de depender dela:** estes comandos não foram testados.

```bash
# Banco
docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > backup-$(date +%F).sql.gz

# Fotos (confira o nome do volume com: docker volume ls)
docker run --rm -v calistenia_media:/media:ro -v "$PWD":/backup alpine tar czf /backup/fotos-$(date +%F).tar.gz -C /media .
```

Copie para fora da VM, a partir do seu computador: `scp usuario@IP_DA_VM:calistenia/backup-*.gz .`

Restaurar o banco, num banco vazio (depois de `down -v` e `up`, **sem** rodar `migrate`):

```bash
gunzip -c backup-AAAA-MM-DD.sql.gz | docker compose -f docker-compose.prod.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

## 8. Logs e problemas comuns

```bash
docker compose -f docker-compose.prod.yml logs -f web      # erros e tracebacks do Django
docker compose -f docker-compose.prod.yml logs caddy       # certificado
docker stats --no-stream                                   # memória
```

O gunicorn **não** grava log de acesso, de propósito: a URL da busca leva a latitude e a longitude de quem consulta (LGPD).

Depois de editar o `.env`, `restart` não basta: use `docker compose -f docker-compose.prod.yml up -d --force-recreate web`.

| Sintoma | Causa provável |
|---|---|
| Login ou cadastro devolve **403** "Origin checking failed" | `DJANGO_HTTPS` não está `True` no `.env`: o Django acha que a requisição é HTTP, e o navegador manda `Origin: https://...`. (Testado. Se um dia o mesmo site responder por mais de um domínio, aí entra `CSRF_TRUSTED_ORIGINS`.) |
| **400** "Bad Request" em toda página | O domínio não está em `DJANGO_ALLOWED_HOSTS` |
| Navegador não abre, ou avisa certificado inválido | DNS ainda não aponta para a VM, ou as portas 80/443 estão fechadas no firewall do provedor. Veja `logs caddy`. Não apague o volume `caddy_data` |
| Foto enviada não aparece | O volume `media` não é o mesmo no `web` e no `caddy`, ou o `PUT` passou de 3 MB |
| HSTS prendeu um domínio de teste | Começa em 1 hora (`DJANGO_HSTS_SEGUNDOS=3600`). Só suba para `31536000` (1 ano) com o HTTPS estável |

## 9. Destruir

```bash
# Para tudo e mantém banco, fotos e certificados
docker compose -f docker-compose.prod.yml down

# Para tudo e APAGA banco, fotos e certificados (sem volta)
docker compose -f docker-compose.prod.yml down -v
```

Para parar de pagar: apague, pelo painel do provedor, a VM, o disco e o IP reservado (confira que nada sobrou cobrando), e remova o registro DNS.

## 10. O que ainda falta

| Item | Observação |
|---|---|
| Limite de tentativas (throttling) em login, cadastro e uploads | `docs/HANDOFF.md`, Fase 5. Faça **antes** de divulgar o link |
| `/admin/` público | Senha forte no superusuário. Restringir por IP é uma opção depois |
| Versões travadas das dependências | `requirements*.txt` ainda usam `~=` (`docs/HANDOFF.md`, Fase 5) |
| Backup agendado (cron) e restauração ensaiada | Seção 7 |
| Cloud Storage e Cloud Run | Depois da entrega: troca-se `armazenamento()` e migra-se (decisões 15 e 46) |
