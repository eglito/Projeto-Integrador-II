#!/bin/sh
# Início da aplicação em produção (Render). O plano gratuito não tem Shell,
# então banco, dados de exemplo e superusuário são preparados aqui, a cada
# início. Todos os passos podem rodar mais de uma vez.
set -e

python manage.py migrate --noinput

if [ "$CARREGAR_LOCAIS_EXEMPLO" = "True" ]; then
  python manage.py carregar_locais_araraquara
fi

# Falha, sem problema, quando o superusuário já existe.
if [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py createsuperuser --noinput || true
fi

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 \
  --timeout 120 \
  --forwarded-allow-ips "*" \
  --access-logfile -