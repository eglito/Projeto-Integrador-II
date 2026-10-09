# Comando de Acesso do Banco de Dados


## 1 Subir Ambiente

```bash
colima start
```

```bash
docker compose up -d
```

## 2 Abrir psql dentro do container

```bash
docker compose exec db psql -U calistenia -d calistenia
```

### Comando úteis dentro do psql:

| Comando | Mostra |
|---|---|
| `\dt` | Todas as tabelas |
| `\d locais_local` | Colunas, restrições e índices de uma tabela, inclusive o GiST |
| `SELECT nome FROM locais_local;` | Os dados |
| `\q` | Sair |