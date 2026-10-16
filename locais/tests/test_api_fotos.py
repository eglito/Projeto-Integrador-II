"""Fotos do local e do registro de condição (decisões 16 e 17 do README)."""

import pytest

from locais.models import TipoEquipamento

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("midia_temporaria")]

TEXTO_ALTERNATIVO = "Barras paralelas e barra fixa sob árvores, ao lado de bancos"


def url_foto(local):
    return f"/api/locais/{local.pk}/foto/"


def test_foto_do_local_aparece_no_detalhe_com_texto_alternativo(
    api_logado, enviar_foto, parque_infantil
):
    objeto = enviar_foto(api_logado)

    resposta = api_logado.put(
        url_foto(parque_infantil),
        {"objeto": objeto, "texto_alternativo": TEXTO_ALTERNATIVO},
        format="json",
    )
    detalhe = api_logado.get(f"/api/locais/{parque_infantil.pk}/").json()

    assert resposta.status_code == 201
    assert resposta.json()["url"] == f"/media/{objeto}"
    assert detalhe["foto"]["texto_alternativo"] == TEXTO_ALTERNATIVO
    assert detalhe["foto"]["enviada_por"] == "praticante"


def test_foto_sem_texto_alternativo_e_recusada_com_explicacao(
    api_logado, enviar_foto, parque_infantil
):
    objeto = enviar_foto(api_logado)

    resposta = api_logado.put(
        url_foto(parque_infantil),
        {"objeto": objeto, "texto_alternativo": "   "},
        format="json",
    )

    assert resposta.status_code == 400
    assert "texto alternativo" in resposta.json()["non_field_errors"][0]


@pytest.mark.parametrize(
    "objeto",
    [f"fotos/{'0' * 32}.png", "../config/settings.py"],
    ids=["nunca_enviada", "caminho_malicioso"],
)
def test_foto_que_nao_veio_do_upload_e_recusada(api_logado, parque_infantil, objeto):
    resposta = api_logado.put(
        url_foto(parque_infantil),
        {"objeto": objeto, "texto_alternativo": TEXTO_ALTERNATIVO},
        format="json",
    )

    assert resposta.status_code == 400
    assert "Foto não encontrada" in resposta.json()["objeto"][0]


def test_trocar_a_foto_responde_200_e_remove_o_arquivo_antigo(
    api_logado, enviar_foto, parque_infantil, midia_temporaria
):
    dados = {"texto_alternativo": TEXTO_ALTERNATIVO}
    primeira = enviar_foto(api_logado)
    api_logado.put(
        url_foto(parque_infantil), {**dados, "objeto": primeira}, format="json"
    )
    segunda = enviar_foto(api_logado)

    resposta = api_logado.put(
        url_foto(parque_infantil), {**dados, "objeto": segunda}, format="json"
    )

    assert resposta.status_code == 200
    assert not (midia_temporaria / primeira).exists()
    assert (midia_temporaria / segunda).exists()


def test_visitante_nao_define_foto(api_com_csrf, parque_infantil):
    resposta = api_com_csrf.put(url_foto(parque_infantil), {}, format="json")

    assert resposta.status_code == 403


def test_foto_do_registro_mais_recente_aparece_no_equipamento(
    api_logado, enviar_foto, parque_infantil
):
    barra = parque_infantil.equipamentos.get(tipo=TipoEquipamento.BARRA_FIXA)
    objeto = enviar_foto(api_logado)

    resposta = api_logado.post(
        f"/api/equipamentos/{barra.pk}/registros-condicao/",
        {
            "condicao": "precario",
            "foto_objeto": objeto,
            "foto_texto_alternativo": "Barra fixa com ferrugem na base",
        },
        format="json",
    )
    detalhe = api_logado.get(f"/api/locais/{parque_infantil.pk}/").json()

    assert resposta.status_code == 201
    assert resposta.json()["foto_url"] == f"/media/{objeto}"
    equipamento = next(e for e in detalhe["equipamentos"] if e["id"] == barra.pk)
    assert equipamento["foto_condicao_url"] == f"/media/{objeto}"
    assert (
        equipamento["foto_condicao_texto_alternativo"]
        == "Barra fixa com ferrugem na base"
    )


def test_foto_de_registro_sem_texto_alternativo_e_recusada(
    api_logado, enviar_foto, parque_infantil
):
    barra = parque_infantil.equipamentos.get(tipo=TipoEquipamento.BARRA_FIXA)

    resposta = api_logado.post(
        f"/api/equipamentos/{barra.pk}/registros-condicao/",
        {"condicao": "precario", "foto_objeto": enviar_foto(api_logado)},
        format="json",
    )

    assert resposta.status_code == 400
    assert "texto alternativo" in resposta.json()["non_field_errors"][0]
