"""Vocabulário controlado que o front-end usa nos formulários e filtros."""


def test_opcoes_trazem_valores_e_rotulos_para_os_formularios(client):
    opcoes = client.get("/api/opcoes/").json()

    assert {"valor": "barra_fixa", "rotulo": "Barra fixa"} in opcoes[
        "tipos_equipamento"
    ]
    assert {"valor": 3503208, "rotulo": "Araraquara (SP)"} in opcoes["municipios"]
    assert {"valor": "precario", "rotulo": "Precário"} in opcoes["condicoes"]
    assert opcoes["busca"] == {"raio_padrao_m": 2000, "raio_maximo_m": 10000}
