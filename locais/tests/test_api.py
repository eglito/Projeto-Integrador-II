"""API de leitura de locais, com os locais reais de Araraquara (conftest.py)."""

import pytest

from locais.models import (
    AvaliacaoLocal,
    Condicao,
    FaixaHorario,
    Iluminacao,
    Limpeza,
    Local,
    Movimento,
    RegistroCondicao,
    TipoEquipamento,
)

pytestmark = pytest.mark.django_db

# Coordenada real do Parque Infantil (OpenStreetMap).
PARQUE_INFANTIL = {"latitude": -21.7827686, "longitude": -48.1793589}


def nomes(resposta):
    return [local["nome"] for local in resposta.json()]


def test_lista_sem_coordenadas_traz_todos_os_locais_por_nome(api, locais_araraquara):
    resposta = api.get("/api/locais/")

    assert resposta.status_code == 200
    assert nomes(resposta) == list(
        Local.objects.order_by("nome").values_list("nome", flat=True)
    )
    assert len(nomes(resposta)) == 5


def test_busca_por_raio_traz_os_proximos_com_a_distancia(api, locais_araraquara):
    resposta = api.get("/api/locais/", {**PARQUE_INFANTIL, "raio": 1500})

    assert nomes(resposta) == ["Parque Infantil", "Praça Pedro de Toledo"]
    assert resposta.json()[1]["distancia_m"] == pytest.approx(1260, abs=15)


def test_lista_textual_aceita_os_mesmos_filtros_do_mapa(api, locais_araraquara):
    resposta = api.get("/api/locais/", {"tipo": TipoEquipamento.ESPALDAR})

    assert nomes(resposta) == ["Praça dos Advogados"]
    assert resposta.json()[0]["distancia_m"] is None


def test_raio_acima_do_limite_informa_o_limite(api):
    resposta = api.get("/api/locais/", {**PARQUE_INFANTIL, "raio": 20000})

    assert resposta.status_code == 400
    assert "10000" in resposta.json()["raio"][0]


def test_latitude_sem_longitude_explica_como_corrigir(api):
    resposta = api.get("/api/locais/", {"latitude": PARQUE_INFANTIL["latitude"]})

    assert resposta.status_code == 400
    assert "latitude e longitude juntas" in resposta.json()["non_field_errors"][0]


def test_detalhe_traz_condicao_com_data_e_resumo_de_seguranca(
    api, parque_infantil, usuario
):
    barra = parque_infantil.equipamentos.get(tipo=TipoEquipamento.BARRA_FIXA)
    RegistroCondicao.objects.create(
        equipamento=barra, autor=usuario, condicao=Condicao.PRECARIO
    )
    AvaliacaoLocal.objects.create(
        local=parque_infantil,
        autor=usuario,
        faixa_horario=FaixaHorario.NOITE,
        iluminacao=Iluminacao.BOA,
        movimento=Movimento.MOVIMENTADO,
        limpeza=Limpeza.REGULAR,
    )

    dados = api.get(f"/api/locais/{parque_infantil.pk}/").json()

    barra_fixa = next(e for e in dados["equipamentos"] if e["id"] == barra.pk)
    assert barra_fixa["condicao_atual_nome"] == "Precário"
    assert barra_fixa["condicao_registrada_em"] is not None
    assert dados["seguranca"]["noite"]["avaliacoes"] == 1
    assert dados["criado_por"] == "praticante"


def test_listagem_nao_faz_uma_consulta_por_local(
    api, locais_araraquara, django_assert_max_num_queries
):
    # Locais + equipamentos com condição atual. Sem o prefetch seriam 1 + 5.
    with django_assert_max_num_queries(2):
        api.get("/api/locais/")
