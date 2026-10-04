"""Restrições garantidas pelo banco (Docs/modelo_dados.md, seção 3)."""

import pytest
from django.db import IntegrityError, connection

from locais.models import (
    AvaliacaoLocal,
    Equipamento,
    FaixaHorario,
    Limpeza,
    Local,
    Movimento,
    TipoEquipamento,
)

pytestmark = pytest.mark.django_db


def test_nome_repetido_no_mesmo_municipio_e_recusado_sem_diferenciar_maiusculas(
    parque_infantil,
):
    with pytest.raises(IntegrityError):
        Local.objects.create(
            nome="PARQUE INFANTIL",
            municipio_ibge=parque_infantil.municipio_ibge,
            ponto=parque_infantil.ponto,
        )


@pytest.mark.parametrize(
    ("tipo", "nome_outro"),
    [
        (TipoEquipamento.OUTRO, ""),
        (TipoEquipamento.BARRA_FIXA, "Barra torta"),
    ],
    ids=["outro_sem_nome", "tipo_comum_com_nome"],
)
def test_nome_outro_existe_somente_no_tipo_outro(parque_infantil, tipo, nome_outro):
    with pytest.raises(IntegrityError):
        Equipamento.objects.create(
            local=parque_infantil, tipo=tipo, nome_outro=nome_outro
        )


def test_largura_e_recusada_fora_das_barras_paralelas(parque_infantil):
    with pytest.raises(IntegrityError):
        Equipamento.objects.create(
            local=parque_infantil, tipo=TipoEquipamento.BARRA_FIXA, largura_cm=50
        )


def test_altura_zero_e_recusada(parque_infantil):
    with pytest.raises(IntegrityError):
        Equipamento.objects.create(
            local=parque_infantil, tipo=TipoEquipamento.BARRA_FIXA, altura_cm=0
        )


def test_avaliacao_noturna_sem_iluminacao_e_recusada(parque_infantil):
    with pytest.raises(IntegrityError):
        AvaliacaoLocal.objects.create(
            local=parque_infantil,
            faixa_horario=FaixaHorario.NOITE,
            movimento=Movimento.MOVIMENTADO,
            limpeza=Limpeza.REGULAR,
        )


def test_avaliacao_diurna_dispensa_iluminacao(parque_infantil):
    avaliacao = AvaliacaoLocal.objects.create(
        local=parque_infantil,
        faixa_horario=FaixaHorario.TARDE,
        movimento=Movimento.MOVIMENTADO,
        limpeza=Limpeza.REGULAR,
    )

    assert avaliacao.iluminacao == ""


def test_excluir_conta_mantem_o_local_sem_autor(parque_infantil, usuario):
    usuario.delete()
    parque_infantil.refresh_from_db()

    assert parque_infantil.criado_por is None


def test_ponto_do_local_tem_indice_espacial_gist():
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT indexdef FROM pg_indexes WHERE tablename = 'locais_local'"
        )
        definicoes = [linha[0] for linha in cursor.fetchall()]

    assert any("USING gist (ponto)" in definicao for definicao in definicoes)
