"""Fluxo de upload por URL assinada, com a simulação local do bucket."""

from datetime import timedelta

import pytest

from fotos import armazenamento as modulo_armazenamento
from fotos.armazenamento import PADRAO_OBJETO, TAMANHO_MAXIMO_BYTES

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("midia_temporaria")]


def pedir_upload(cliente, tipo="image/png", tamanho=100):
    return cliente.post(
        "/api/uploads/", {"tipo_conteudo": tipo, "tamanho": tamanho}, format="json"
    )


def test_visitante_nao_pede_upload(api_com_csrf):
    assert pedir_upload(api_com_csrf).status_code == 403


def test_upload_devolve_nome_gerado_pelo_servidor_e_url_assinada(api_logado):
    resposta = pedir_upload(api_logado)

    assert resposta.status_code == 201
    upload = resposta.json()
    assert PADRAO_OBJETO.match(upload["objeto"])
    assert upload["objeto"].endswith(".png")
    assert upload["metodo"] == "PUT"
    assert upload["cabecalhos"] == {"Content-Type": "image/png"}


def test_formato_nao_aceito_informa_os_formatos(api_logado):
    resposta = pedir_upload(api_logado, tipo="image/gif")

    assert resposta.status_code == 400
    assert resposta.json()["tipo_conteudo"] == ["Envie a foto em JPEG, PNG ou WebP."]


def test_foto_acima_do_limite_informa_o_limite(api_logado):
    resposta = pedir_upload(api_logado, tamanho=TAMANHO_MAXIMO_BYTES + 1)

    assert resposta.status_code == 400
    assert "no máximo 2 MB" in resposta.json()["tamanho"][0]


def test_envio_grava_o_arquivo_no_armazenamento(api_logado, png_1x1, midia_temporaria):
    upload = pedir_upload(api_logado, tamanho=len(png_1x1)).json()

    resposta = api_logado.put(upload["url"], png_1x1, content_type="image/png")

    assert resposta.status_code == 200
    assert (midia_temporaria / upload["objeto"]).read_bytes() == png_1x1


def test_link_adulterado_e_recusado(api_logado, png_1x1):
    resposta = api_logado.put(
        "/armazenamento-local/link-falso/", png_1x1, content_type="image/png"
    )

    assert resposta.status_code == 403


def test_link_expirado_e_recusado(api_logado, png_1x1, monkeypatch):
    upload = pedir_upload(api_logado).json()
    monkeypatch.setattr(modulo_armazenamento, "VALIDADE_UPLOAD", timedelta(seconds=-1))

    resposta = api_logado.put(upload["url"], png_1x1, content_type="image/png")

    assert resposta.status_code == 403
    assert "expirou" in resposta.json()["detail"]


def test_conteudo_que_nao_e_imagem_e_recusado(api_logado):
    upload = pedir_upload(api_logado).json()

    resposta = api_logado.put(
        upload["url"], b"<script>alert(1)</script>", content_type="image/png"
    )

    assert resposta.status_code == 400
    assert "não é uma imagem" in resposta.json()["detail"]


def test_tipo_diferente_do_assinado_e_recusado(api_logado, png_1x1):
    upload = pedir_upload(api_logado).json()

    resposta = api_logado.put(upload["url"], png_1x1, content_type="image/jpeg")

    assert resposta.status_code == 400


def test_link_so_pode_ser_usado_uma_vez(api_logado, png_1x1):
    upload = pedir_upload(api_logado).json()
    api_logado.put(upload["url"], png_1x1, content_type="image/png")

    resposta = api_logado.put(upload["url"], png_1x1, content_type="image/png")

    assert resposta.status_code == 409


def test_arquivo_acima_do_limite_e_recusado(api_logado, png_1x1):
    upload = pedir_upload(api_logado).json()
    grande = png_1x1 + b"\x00" * TAMANHO_MAXIMO_BYTES

    resposta = api_logado.put(upload["url"], grande, content_type="image/png")

    assert resposta.status_code == 413
