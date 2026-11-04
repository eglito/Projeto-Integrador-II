"""Vocabulário controlado que o front-end usa nos formulários e filtros."""

import pytest


def test_opcoes_trazem_valores_e_rotulos_para_os_formularios(client):
    opcoes = client.get("/api/opcoes/").json()

    assert {"valor": "barra_fixa", "rotulo": "Barra fixa"} in opcoes[
        "tipos_equipamento"
    ]
    assert {"valor": 3503208, "rotulo": "Araraquara (SP)"} in opcoes["municipios"]
    assert {"valor": "precario", "rotulo": "Precário"} in opcoes["condicoes"]
    assert opcoes["busca"] == {
        "raio_padrao_m": 2000,
        "raio_maximo_m": 10000,
        "centro_padrao": {
            "latitude": -21.7886713,
            "longitude": -48.1773096,
            "zoom": 14,
        },
    }


@pytest.mark.django_db
def test_centro_padrao_alcanca_os_locais_reais_com_o_raio_maximo(
    api, locais_araraquara
):
    """Sem a posição da pessoa, a busca parte do centro (decisão 31).

    Com o raio máximo, ela alcança todos os locais reais. Com o raio padrão
    (2 km), só o Parque Infantil e a Praça Pedro de Toledo.
    """
    busca = api.get("/api/opcoes/").json()["busca"]
    centro = busca["centro_padrao"]

    resposta = api.get(
        "/api/locais/",
        {
            "latitude": centro["latitude"],
            "longitude": centro["longitude"],
            "raio": busca["raio_maximo_m"],
        },
    )

    assert resposta.status_code == 200
    assert {local["nome"] for local in resposta.json()} == set(locais_araraquara)
