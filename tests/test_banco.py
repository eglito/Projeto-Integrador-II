import pytest
from django.db import connection


@pytest.mark.django_db
def test_banco_de_testes_tem_postgis_habilitado():
    with connection.cursor() as cursor:
        cursor.execute("SELECT extversion FROM pg_extension WHERE extname = 'postgis'")
        linha = cursor.fetchone()

    assert linha is not None, "Extensão PostGIS não está habilitada no banco"
