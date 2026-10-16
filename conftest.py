"""Fixtures compartilhadas por todos os testes.

Locais e equipamentos são reais: coordenadas do OpenStreetMap (consultadas em
04/10/2026) e equipamentos observados na pesquisa de campo
(Docs/sintese-pesquisa.md, seção 1).
"""

import pytest
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient

from locais.models import Equipamento, Local, Municipio, TipoEquipamento

# Point recebe (longitude, latitude), nesta ordem.
COORDENADAS = {
    "Parque Infantil": (-48.1793589, -21.7827686),
    "Praça Pedro de Toledo": (-48.1794181, -21.7941043),
    "Praça dos Advogados": (-48.1734075, -21.7667175),
    "Praça Paulo Elias Antonio": (-48.1614378, -21.7734436),
    "Jardim Botânico": (-48.1817270, -21.7572576),
}

# A pesquisa não registrou os equipamentos da Praça Pedro de Toledo.
EQUIPAMENTOS = {
    "Parque Infantil": ["barra_fixa", "barra_australiana", "barras_paralelas"],
    "Praça dos Advogados": ["espaldar", "barras_paralelas", "barra_fixa"],
    "Praça Paulo Elias Antonio": ["barra_fixa", "barra_australiana"],
    "Jardim Botânico": ["barra_australiana", "barra_fixa"],
}


@pytest.fixture
def usuario(django_user_model):
    return django_user_model.objects.create_user(username="praticante")


@pytest.fixture
def api():
    """Cliente HTTP que cobra o token CSRF, como acontece no navegador."""
    return APIClient(enforce_csrf_checks=True)


@pytest.fixture
def api_com_csrf(api):
    """Faz o que o jQuery fará: pega o cookie csrftoken e o envia no cabeçalho."""
    api.get("/api/auth/sessao/")
    api.credentials(HTTP_X_CSRFTOKEN=api.cookies["csrftoken"].value)
    return api


@pytest.fixture
def api_logado(api_com_csrf, usuario):
    api_com_csrf.force_login(usuario)
    return api_com_csrf


@pytest.fixture
def outro_usuario(django_user_model):
    return django_user_model.objects.create_user(username="outra_praticante")


@pytest.fixture
def cliente_logado():
    """Fábrica de clientes com CSRF e sessão, para simular pessoas diferentes."""

    def criar(pessoa):
        cliente = APIClient(enforce_csrf_checks=True)
        cliente.get("/api/auth/sessao/")
        cliente.credentials(HTTP_X_CSRFTOKEN=cliente.cookies["csrftoken"].value)
        cliente.force_login(pessoa)
        return cliente

    return criar


@pytest.fixture
def locais_araraquara(usuario):
    """Os cinco locais citados nas entrevistas, com seus equipamentos."""
    locais = {}
    for nome, (longitude, latitude) in COORDENADAS.items():
        local = Local.objects.create(
            nome=nome,
            municipio_ibge=Municipio.ARARAQUARA,
            ponto=Point(longitude, latitude, srid=4326),
            criado_por=usuario,
        )
        for tipo in EQUIPAMENTOS.get(nome, []):
            Equipamento.objects.create(
                local=local, tipo=TipoEquipamento(tipo), criado_por=usuario
            )
        locais[nome] = local
    return locais


@pytest.fixture
def parque_infantil(locais_araraquara):
    return locais_araraquara["Parque Infantil"]


@pytest.fixture
def png_1x1():
    """Imagem PNG real e válida, de 1 por 1 pixel."""
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )


@pytest.fixture
def midia_temporaria(settings, tmp_path):
    """Fotos dos testes vão para uma pasta temporária, apagada ao fim do teste."""
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture
def enviar_foto(midia_temporaria, png_1x1):
    """Faz os passos 1 e 2 do upload e devolve o objeto, pronto para anexar."""

    def enviar(cliente):
        upload = cliente.post(
            "/api/uploads/",
            {"tipo_conteudo": "image/png", "tamanho": len(png_1x1)},
            format="json",
        ).json()
        cliente.put(upload["url"], png_1x1, content_type="image/png")
        return upload["objeto"]

    return enviar
