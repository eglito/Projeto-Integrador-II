FROM python:3.12-slim-trixie

# Não gera arquivos .pyc e não segura a saída em buffer: os logs aparecem na hora em "docker compose logs".
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Número de processos do gunicorn (ele lê esta variável sozinho). Cada um usa
# cerca de 100 MB: 2 cabe numa VM de 2 GB junto com o banco.
ENV WEB_CONCURRENCY=2

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

# Junta os estáticos em STATIC_ROOT para o WhiteNoise servir em produção.
# Valores fictícios só para o settings carregar: o collectstatic não abre o
# banco, e nenhum segredo real entra na imagem.
RUN DJANGO_SECRET_KEY=so-para-o-build POSTGRES_DB=x POSTGRES_USER=x \
    POSTGRES_PASSWORD=x POSTGRES_HOST=x \
    python manage.py collectstatic --noinput

EXPOSE 8000

# Desenvolvimento. Em produção, o Render roda docker/iniciar_producao.sh (render.yaml).
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

EXPOSE 8000

# Servidor de produção. Sem log de acesso (--access-logfile) de propósito: a URL
# da busca leva a latitude e a longitude de quem consulta (dado pessoal, LGPD).
# O desenvolvimento troca este comando por runserver no docker-compose.yml.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
