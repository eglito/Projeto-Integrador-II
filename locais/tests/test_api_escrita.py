"""Rotas de escrita de locais, equipamentos, registros e avaliações.

Coordenadas reais (OpenStreetMap). A Praça Doutor Roque José Hage fica a 949 m
do local mais próximo das fixtures: um cadastro sem possíveis duplicatas.
"""

from datetime import timedelta

import pytest
from django.utils import timezone

from locais.models import (
    AvaliacaoLocal,
    Condicao,
    FaixaHorario,
    Limpeza,
    Local,
    Movimento,
    RegistroCondicao,
    TipoEquipamento,
)

pytestmark = pytest.mark.django_db

PRACA_ROQUE_HAGE = {
    "nome": "Praça Doutor Roque José Hage",
    "municipio_ibge": 3503208,
    "latitude": -21.7737308,
    "longitude": -48.1786489,
}
# Ponto real marcado no admin para o Parque Infantil, a 84 m do ponto do OSM.
PARQUE_INFANTIL_MARCADO_NO_ADMIN = {
    "latitude": -21.78252490771411,
    "longitude": -48.17859112312939,
}


# Cadastro de local


def test_visitante_nao_cadastra_local(api_com_csrf, locais_araraquara):
    resposta = api_com_csrf.post("/api/locais/", PRACA_ROQUE_HAGE, format="json")

    assert resposta.status_code == 403


def test_cadastro_de_local_registra_o_autor_e_aponta_o_novo_recurso(
    api_logado, usuario, locais_araraquara
):
    resposta = api_logado.post(
        "/api/locais/",
        {
            **PRACA_ROQUE_HAGE,
            "nome": "  Praça   Doutor Roque José Hage ",
            "tem_bancos": True,
        },
        format="json",
    )

    assert resposta.status_code == 201
    local = Local.objects.get(pk=resposta.json()["id"])
    assert resposta["Location"] == f"/api/locais/{local.pk}/"
    assert local.nome == "Praça Doutor Roque José Hage"  # espaços normalizados
    assert local.criado_por == usuario
    assert local.tem_bancos is True
    assert resposta.json()["latitude"] == pytest.approx(PRACA_ROQUE_HAGE["latitude"])


def test_possivel_duplicata_responde_409_com_os_candidatos(
    api_logado, locais_araraquara
):
    dados = {
        **PRACA_ROQUE_HAGE,
        **PARQUE_INFANTIL_MARCADO_NO_ADMIN,
        "nome": "Praça Major Abel Fortes",
    }

    resposta = api_logado.post("/api/locais/", dados, format="json")

    assert resposta.status_code == 409
    candidatos = resposta.json()["possiveis_duplicatas"]
    assert [c["nome"] for c in candidatos] == ["Parque Infantil"]
    assert candidatos[0]["distancia_m"] == pytest.approx(84, abs=5)
    assert not Local.objects.filter(nome="Praça Major Abel Fortes").exists()


def test_confirmar_novo_cadastra_mesmo_com_candidatos(api_logado, locais_araraquara):
    dados = {
        **PRACA_ROQUE_HAGE,
        **PARQUE_INFANTIL_MARCADO_NO_ADMIN,
        "nome": "Praça Major Abel Fortes",
        "confirmar_novo": True,
    }

    resposta = api_logado.post("/api/locais/", dados, format="json")

    assert resposta.status_code == 201


def test_nome_repetido_no_municipio_explica_como_corrigir(
    api_logado, locais_araraquara
):
    resposta = api_logado.post(
        "/api/locais/", {**PRACA_ROQUE_HAGE, "nome": "parque infantil"}, format="json"
    )

    assert resposta.status_code == 400
    assert "Já existe um local com este nome" in resposta.json()["non_field_errors"][0]


def test_latitude_sem_longitude_e_recusada(api_logado):
    dados = {**PRACA_ROQUE_HAGE}
    del dados["longitude"]

    resposta = api_logado.post("/api/locais/", dados, format="json")

    assert resposta.status_code == 400
    assert "longitude" in resposta.json()


# Edição pelo autor


def test_autor_corrige_o_proprio_local(api_logado, parque_infantil):
    resposta = api_logado.patch(
        f"/api/locais/{parque_infantil.pk}/", {"tem_bancos": True}, format="json"
    )

    assert resposta.status_code == 200
    assert resposta.json()["tem_bancos"] is True


def test_outra_pessoa_nao_edita_o_local_e_e_orientada_a_denunciar(
    cliente_logado, outro_usuario, parque_infantil
):
    resposta = cliente_logado(outro_usuario).patch(
        f"/api/locais/{parque_infantil.pk}/", {"tem_bancos": False}, format="json"
    )

    assert resposta.status_code == 403
    assert "abra uma denúncia" in resposta.json()["detail"]


def test_local_nao_aceita_put_nem_delete(api_logado, parque_infantil):
    url = f"/api/locais/{parque_infantil.pk}/"

    assert api_logado.put(url, {}, format="json").status_code == 405
    assert api_logado.delete(url).status_code == 405


# Equipamentos


def test_qualquer_pessoa_logada_adiciona_equipamento(
    cliente_logado, outro_usuario, parque_infantil
):
    resposta = cliente_logado(outro_usuario).post(
        f"/api/locais/{parque_infantil.pk}/equipamentos/",
        {"tipo": TipoEquipamento.ESPALDAR},
        format="json",
    )

    assert resposta.status_code == 201
    assert resposta.json()["tipo_nome"] == "Espaldar"
    assert resposta.json()["condicao_atual"] is None


def test_equipamento_invalido_recebe_a_mensagem_da_restricao(
    api_logado, parque_infantil
):
    resposta = api_logado.post(
        f"/api/locais/{parque_infantil.pk}/equipamentos/",
        {"tipo": TipoEquipamento.BARRA_FIXA, "largura_cm": 50},
        format="json",
    )

    assert resposta.status_code == 400
    assert (
        "A largura vale só para barras paralelas"
        in resposta.json()["non_field_errors"][0]
    )


def test_autor_registra_a_altura_medida_e_outra_pessoa_nao(
    api_logado, cliente_logado, outro_usuario, parque_infantil
):
    barra = parque_infantil.equipamentos.get(tipo=TipoEquipamento.BARRA_AUSTRALIANA)
    url = f"/api/equipamentos/{barra.pk}/"

    assert (
        api_logado.patch(url, {"altura_cm": 95}, format="json").json()["altura_cm"]
        == 95
    )
    resposta = cliente_logado(outro_usuario).patch(
        url, {"altura_cm": 10}, format="json"
    )
    assert resposta.status_code == 403


# Registros de condição (RN-02)


def test_registro_de_condicao_e_historico_do_mais_recente_ao_mais_antigo(
    api_logado, usuario, parque_infantil
):
    barra = parque_infantil.equipamentos.get(tipo=TipoEquipamento.BARRA_FIXA)
    RegistroCondicao.objects.create(
        equipamento=barra,
        autor=usuario,
        condicao=Condicao.BOM,
        registrado_em=timezone.now() - timedelta(days=30),
    )
    url = f"/api/equipamentos/{barra.pk}/registros-condicao/"

    criado = api_logado.post(url, {"condicao": Condicao.QUEBRADO}, format="json")
    historico = api_logado.get(url).json()

    assert criado.status_code == 201
    assert criado.json()["autor"] == "praticante"
    assert [r["condicao"] for r in historico["results"]] == ["quebrado", "bom"]
    assert historico["count"] == 2


def test_visitante_le_o_historico_mas_nao_registra(api_com_csrf, parque_infantil):
    barra = parque_infantil.equipamentos.get(tipo=TipoEquipamento.BARRA_FIXA)
    url = f"/api/equipamentos/{barra.pk}/registros-condicao/"

    assert api_com_csrf.get(url).status_code == 200
    assert api_com_csrf.post(url, {"condicao": "bom"}, format="json").status_code == 403


# Avaliações (RN-04, RN-05)


def test_avaliacao_noturna_sem_iluminacao_explica_como_corrigir(
    api_logado, parque_infantil
):
    resposta = api_logado.post(
        f"/api/locais/{parque_infantil.pk}/avaliacoes/",
        {"faixa_horario": "noite", "movimento": "movimentado", "limpeza": "limpo"},
        format="json",
    )

    assert resposta.status_code == 400
    assert (
        "informe também como está a iluminação"
        in resposta.json()["non_field_errors"][0]
    )


def test_avaliacao_criada_aparece_e_as_antigas_ficam_de_fora(
    api_logado, usuario, parque_infantil
):
    AvaliacaoLocal.objects.create(
        local=parque_infantil,
        autor=usuario,
        faixa_horario=FaixaHorario.TARDE,
        movimento=Movimento.VAZIO,
        limpeza=Limpeza.SUJO,
        registrado_em=timezone.now() - timedelta(days=120),
    )
    url = f"/api/locais/{parque_infantil.pk}/avaliacoes/"

    criada = api_logado.post(
        url,
        {
            "faixa_horario": "noite",
            "iluminacao": "boa",
            "movimento": "movimentado",
            "limpeza": "regular",
        },
        format="json",
    )
    recentes = api_logado.get(url).json()

    assert criada.status_code == 201
    assert [a["faixa_horario"] for a in recentes["results"]] == ["noite"]
