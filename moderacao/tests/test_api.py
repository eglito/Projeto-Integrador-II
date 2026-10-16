"""Abertura de denúncias pela API (RN-08)."""

import pytest

from moderacao.models import Denuncia, MotivoDenuncia, StatusDenuncia

pytestmark = pytest.mark.django_db


def url(local):
    return f"/api/locais/{local.pk}/denuncias/"


def test_denuncia_e_aberta_com_autor_e_status_inicial(
    api_logado, usuario, parque_infantil
):
    resposta = api_logado.post(
        url(parque_infantil), {"motivo": MotivoDenuncia.LOCAL_DUPLICADO}, format="json"
    )

    assert resposta.status_code == 201
    assert resposta.json()["status"] == StatusDenuncia.ABERTA
    assert Denuncia.objects.get().autor == usuario


def test_status_enviado_pelo_cliente_e_ignorado(api_logado, parque_infantil):
    resposta = api_logado.post(
        url(parque_infantil),
        {"motivo": MotivoDenuncia.LOCAL_DUPLICADO, "status": StatusDenuncia.PROCEDENTE},
        format="json",
    )

    assert resposta.json()["status"] == StatusDenuncia.ABERTA


def test_mesma_denuncia_aberta_duas_vezes_e_recusada_com_explicacao(
    api_logado, parque_infantil
):
    dados = {"motivo": MotivoDenuncia.EQUIPAMENTO_INCORRETO}
    api_logado.post(url(parque_infantil), dados, format="json")

    resposta = api_logado.post(url(parque_infantil), dados, format="json")

    assert resposta.status_code == 400
    assert "Aguarde a análise da moderação" in resposta.json()["non_field_errors"][0]


def test_depois_da_analise_a_pessoa_pode_denunciar_de_novo(
    api_logado, usuario, parque_infantil
):
    Denuncia.objects.create(
        local=parque_infantil,
        autor=usuario,
        motivo=MotivoDenuncia.EQUIPAMENTO_INCORRETO,
        status=StatusDenuncia.IMPROCEDENTE,
    )

    resposta = api_logado.post(
        url(parque_infantil),
        {"motivo": MotivoDenuncia.EQUIPAMENTO_INCORRETO},
        format="json",
    )

    assert resposta.status_code == 201


def test_visitante_nao_abre_denuncia(api_com_csrf, parque_infantil):
    resposta = api_com_csrf.post(
        url(parque_infantil), {"motivo": MotivoDenuncia.LOCAL_DUPLICADO}, format="json"
    )

    assert resposta.status_code == 403


def test_denuncia_sobre_local_inexistente_responde_404(api_logado):
    resposta = api_logado.post(
        "/api/locais/999999/denuncias/", {"motivo": "local_duplicado"}, format="json"
    )

    assert resposta.status_code == 404
