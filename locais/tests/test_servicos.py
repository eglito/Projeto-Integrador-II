"""Regras da camada de serviço, com locais reais de Araraquara (conftest.py).

Distâncias reais a partir do Parque Infantil: Praça Pedro de Toledo ~1,26 km,
Praça dos Advogados ~1,89 km, Praça Paulo Elias Antonio ~2,12 km e
Jardim Botânico ~2,85 km.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from locais.models import (
    AvaliacaoLocal,
    Condicao,
    Equipamento,
    FaixaHorario,
    Iluminacao,
    Limpeza,
    Movimento,
    RegistroCondicao,
    TipoEquipamento,
)
from locais.servicos import (
    RAIO_MAXIMO_M,
    buscar_proximos,
    com_condicao_atual,
    resumo_seguranca,
)

pytestmark = pytest.mark.django_db


def nomes(locais):
    return [local.nome for local in locais]


def test_busca_por_raio_devolve_so_os_locais_dentro_do_raio(parque_infantil):
    resultado = buscar_proximos(parque_infantil.ponto, raio_m=1500)

    assert nomes(resultado) == ["Parque Infantil", "Praça Pedro de Toledo"]


def test_busca_ordena_do_mais_perto_ao_mais_longe(parque_infantil):
    resultado = buscar_proximos(parque_infantil.ponto, raio_m=3000)

    assert nomes(resultado) == [
        "Parque Infantil",
        "Praça Pedro de Toledo",
        "Praça dos Advogados",
        "Praça Paulo Elias Antonio",
        "Jardim Botânico",
    ]


def test_busca_informa_a_distancia_em_metros(parque_infantil):
    pedro_de_toledo = buscar_proximos(parque_infantil.ponto, raio_m=1500)[1]

    assert pedro_de_toledo.distancia.m == pytest.approx(1260, abs=15)


def test_busca_filtra_por_tipo_de_equipamento(parque_infantil):
    resultado = buscar_proximos(
        parque_infantil.ponto, raio_m=3000, tipo=TipoEquipamento.ESPALDAR
    )

    assert nomes(resultado) == ["Praça dos Advogados"]


def test_filtros_de_tipo_e_altura_valem_para_o_mesmo_equipamento(locais_araraquara):
    # Alturas ilustrativas: a medição em campo ainda é pendência da pesquisa.
    jardim = locais_araraquara["Jardim Botânico"]
    jardim.equipamentos.filter(tipo=TipoEquipamento.BARRA_AUSTRALIANA).update(
        altura_cm=110
    )
    jardim.equipamentos.filter(tipo=TipoEquipamento.BARRA_FIXA).update(altura_cm=80)

    def buscar_australiana_ate(altura_cm):
        return buscar_proximos(
            jardim.ponto,
            raio_m=100,
            tipo=TipoEquipamento.BARRA_AUSTRALIANA,
            altura_maxima_cm=altura_cm,
        )

    assert nomes(buscar_australiana_ate(90)) == []
    assert nomes(buscar_australiana_ate(120)) == ["Jardim Botânico"]


@pytest.mark.parametrize("raio_m", [0, -50, RAIO_MAXIMO_M + 1])
def test_raio_fora_do_limite_e_recusado(parque_infantil, raio_m):
    with pytest.raises(ValueError):
        buscar_proximos(parque_infantil.ponto, raio_m=raio_m)


def test_condicao_atual_e_a_do_registro_mais_recente(parque_infantil, usuario):
    barra = parque_infantil.equipamentos.get(tipo=TipoEquipamento.BARRA_FIXA)
    agora = timezone.now()
    RegistroCondicao.objects.create(
        equipamento=barra,
        autor=usuario,
        condicao=Condicao.BOM,
        registrado_em=agora - timedelta(days=30),
    )
    RegistroCondicao.objects.create(
        equipamento=barra,
        autor=usuario,
        condicao=Condicao.QUEBRADO,
        registrado_em=agora - timedelta(days=1),
    )

    anotado = com_condicao_atual(Equipamento.objects.filter(pk=barra.pk)).get()

    assert anotado.condicao_atual == Condicao.QUEBRADO
    assert anotado.condicao_registrada_em == agora - timedelta(days=1)


def test_equipamento_sem_registro_fica_sem_condicao(parque_infantil):
    anotados = com_condicao_atual(parque_infantil.equipamentos.all())

    assert {equipamento.condicao_atual for equipamento in anotados} == {None}


def test_resumo_de_seguranca_separa_faixas_e_ignora_avaliacoes_antigas(
    parque_infantil, usuario
):
    def avaliar(faixa, movimento, iluminacao="", dias_atras=1):
        AvaliacaoLocal.objects.create(
            local=parque_infantil,
            autor=usuario,
            faixa_horario=faixa,
            movimento=movimento,
            iluminacao=iluminacao,
            limpeza=Limpeza.REGULAR,
            registrado_em=timezone.now() - timedelta(days=dias_atras),
        )

    avaliar(FaixaHorario.NOITE, Movimento.MOVIMENTADO, Iluminacao.BOA)
    avaliar(FaixaHorario.NOITE, Movimento.MOVIMENTADO, Iluminacao.BOA)
    avaliar(FaixaHorario.NOITE, Movimento.VAZIO, Iluminacao.FRACA)
    avaliar(FaixaHorario.TARDE, Movimento.POUCO_MOVIMENTO)
    avaliar(FaixaHorario.NOITE, Movimento.VAZIO, Iluminacao.AUSENTE, dias_atras=120)

    resumo = resumo_seguranca(parque_infantil)

    assert resumo["noite"] == {
        "avaliacoes": 3,
        "movimento": {"movimentado": 2, "vazio": 1},
        "iluminacao": {"boa": 2, "fraca": 1},
    }
    assert resumo["tarde"] == {
        "avaliacoes": 1,
        "movimento": {"pouco_movimento": 1},
        "iluminacao": {},
    }
    assert resumo["manha"]["avaliacoes"] == 0
