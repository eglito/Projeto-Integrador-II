"""Denúncias no admin, onde a moderação acontece (RN-08, README decisão 01)."""

import pytest

from moderacao.models import Denuncia, MotivoDenuncia, StatusDenuncia

pytestmark = pytest.mark.django_db


def test_cadastro_de_denuncia_pelo_admin_grava_local_motivo_e_autor(
    admin_client, admin_user, parque_infantil
):
    resposta = admin_client.post(
        "/admin/moderacao/denuncia/add/",
        {
            "local": parque_infantil.pk,
            "motivo": MotivoDenuncia.LOCAL_DUPLICADO,
            "status": StatusDenuncia.ABERTA,
        },
    )

    assert resposta.status_code == 302  # admin redireciona após salvar
    denuncia = Denuncia.objects.get()
    assert denuncia.local == parque_infantil
    assert denuncia.motivo == MotivoDenuncia.LOCAL_DUPLICADO
    assert denuncia.autor == admin_user


def test_moderador_altera_so_o_status_de_uma_denuncia_existente(
    admin_client, parque_infantil, usuario
):
    denuncia = Denuncia.objects.create(
        local=parque_infantil, autor=usuario, motivo=MotivoDenuncia.LOCAL_DUPLICADO
    )

    admin_client.post(
        f"/admin/moderacao/denuncia/{denuncia.pk}/change/",
        {
            "status": StatusDenuncia.PROCEDENTE,
            "motivo": MotivoDenuncia.FOTO_INADEQUADA,  # deve ser ignorado
        },
    )

    denuncia.refresh_from_db()
    assert denuncia.status == StatusDenuncia.PROCEDENTE
    assert denuncia.motivo == MotivoDenuncia.LOCAL_DUPLICADO
    assert denuncia.autor == usuario
