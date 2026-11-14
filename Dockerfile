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

# Reúne os arquivos estáticos em /app/staticfiles, de onde o WhiteNoise os serve.
# O settings exige variáveis que só existem em execução; as daqui são falsas e
# valem só para este comando (não ficam gravadas na imagem).
# --ignore deixa de fora a página de testes do QUnit (docs/plano_front.md).
RUN DJANGO_SECRET_KEY=so-para-o-build POSTGRES_DB=build POSTGRES_USER=build \
    POSTGRES_PASSWORD=build POSTGRES_HOST=build \
    python manage.py collectstatic --noinput --ignore testes --ignore qunit

# Usuário sem privilégios: se alguém explorar uma falha da aplicação, não vira
# root dentro do container. Só /app/media precisa ser gravável (fotos). O dono
# da pasta na imagem vira o dono do volume nomeado na primeira vez que ele é criado.
RUN useradd --system --create-home --uid 1000 app \
    && mkdir -p /app/media \
    && chown app:app /app/media
USER app

EXPOSE 8000

# Servidor de produção. Sem log de acesso (--access-logfile) de propósito: a URL
# da busca leva a latitude e a longitude de quem consulta (dado pessoal, LGPD).
# O desenvolvimento troca este comando por runserver no docker-compose.yml.
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
