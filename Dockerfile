FROM python:3.12-slim-trixie

# Não gera arquivos .pyc e não segura a saída em buffer: os logs aparecem
# na hora em "docker compose logs".
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Bibliotecas geoespaciais do GeoDjango (GDAL, GEOS, PROJ).
# Pacotes recomendados pela documentação do Django para Debian/Ubuntu.
RUN apt-get update \
    && apt-get install -y --no-install-recommends binutils libproj-dev gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia os requirements antes do código: enquanto eles não mudarem, o Docker
# reaproveita a camada com as dependências já instaladas.
# REQUIREMENTS escolhe entre produção (padrão) e desenvolvimento.
ARG REQUIREMENTS=requirements.txt
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r ${REQUIREMENTS}

COPY . .

EXPOSE 8000

# Servidor de desenvolvimento. A imagem de produção (Fase 5) usará gunicorn.
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
