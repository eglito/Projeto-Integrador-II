"""Comando que carrega os locais reais no banco de desenvolvimento (decisão 37)."""

from io import StringIO

import pytest
from django.contrib.gis.geos import Point
from django.core.management import call_command

from locais.dados_araraquara import COORDENADAS, EQUIPAMENTOS
from locais.models import Equipamento, Local, Municipio

pytestmark = pytest.mark.django_db

TOTAL_EQUIPAMENTOS = sum(len(tipos) for tipos in EQUIPAMENTOS.values())


def carregar():
    saida = StringIO()
    call_command("carregar_locais_araraquara", stdout=saida)
    return saida.getvalue()


def test_banco_vazio_recebe_os_locais_reais_com_equipamentos():
    saida = carregar()

    pontos = {local.nome: local.ponto.coords for local in Local.objects.all()}
    assert pontos == COORDENADAS
    assert Equipamento.objects.count() == TOTAL_EQUIPAMENTOS
    assert "Criados: 5. Já existiam: 0." in saida


def test_rodar_de_novo_nao_duplica_nada():
    carregar()
    saida = carregar()

    assert Local.objects.count() == len(COORDENADAS)
    assert Equipamento.objects.count() == TOTAL_EQUIPAMENTOS
    assert "Criados: 0. Já existiam: 5." in saida


def test_mesmo_lugar_com_outro_nome_e_pulado_e_os_demais_sao_criados():
    # O Parque Infantil também é chamado de Praça Major Abel Fortes (RN-01).
    longitude, latitude = COORDENADAS["Parque Infantil"]
    Local.objects.create(
        nome="Praça Major Abel Fortes",
        municipio_ibge=Municipio.ARARAQUARA,
        ponto=Point(longitude, latitude, srid=4326),
    )

    saida = carregar()

    nomes = set(Local.objects.values_list("nome", flat=True))
    assert nomes == set(COORDENADAS) - {"Parque Infantil"} | {"Praça Major Abel Fortes"}
    assert "Já existe: Parque Infantil." in saida
    assert "Criados: 4. Já existiam: 1." in saida
