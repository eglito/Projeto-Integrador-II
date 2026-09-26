# PostgreSQL 16 oficial + extensão PostGIS.
#
# Por que não usar a imagem postgis/postgis: ela só é publicada para amd64 e
# roda emulada (lenta) em processadores ARM, como o Apple Silicon.
# A imagem oficial do postgres já traz configurado o repositório oficial do
# PostgreSQL (PGDG), de onde vem o pacote do PostGIS.
FROM postgres:16-trixie

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-16-postgis-3 \
    && rm -rf /var/lib/apt/lists/*
