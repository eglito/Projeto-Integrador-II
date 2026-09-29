# PostgreSQL 16 oficial + extensão PostGIS. Configuração com a image oficial do PostgreSQL (PGDG)

FROM postgres:16-trixie

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-postgis-3 \
    && rm -rf /var/lib/apt/lists/*
