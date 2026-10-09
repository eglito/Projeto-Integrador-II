"""Cadastro pelo admin, a ferramenta de moderação (README, decisão 01)."""

import pytest

from locais.models import Local, TipoEquipamento

pytestmark = pytest.mark.django_db


def test_cadastro_de_local_com_equipamento_registra_o_autor_dos_dois(
    admin_client, admin_user
):
    # Mesmos campos que o formulário do admin envia, incluindo o "management
    # form" do inline de equipamentos. Coordenada real da Praça Pedro de Toledo.
    resposta = admin_client.post(
        "/admin/locais/local/add/",
        {
            "nome": "Praça Pedro de Toledo",
            "municipio_ibge": "3503208",
            "endereco": "",
            "ponto": "SRID=4326;POINT (-48.1794181 -21.7941043)",
            "equipamentos-TOTAL_FORMS": "1",
            "equipamentos-INITIAL_FORMS": "0",
            "equipamentos-MIN_NUM_FORMS": "0",
            "equipamentos-MAX_NUM_FORMS": "1000",
            "equipamentos-0-tipo": TipoEquipamento.BARRA_FIXA,
            "equipamentos-0-nome_outro": "",
            "equipamentos-0-altura_cm": "",
            "equipamentos-0-largura_cm": "",
        },
    )

    assert resposta.status_code == 302  # admin redireciona após salvar
    local = Local.objects.get(nome="Praça Pedro de Toledo")
    assert local.criado_por == admin_user
    assert local.equipamentos.get().criado_por == admin_user
