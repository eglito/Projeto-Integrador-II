"""Autenticação por sessão + CSRF, como o front-end jQuery vai usar."""

import pytest

pytestmark = pytest.mark.django_db

SENHA = "Barra-fixa-2026"  # senha de teste, só existe no banco de testes


@pytest.fixture
def praticante(django_user_model):
    return django_user_model.objects.create_user(username="praticante", password=SENHA)


def test_sessao_anonima_informa_que_nao_ha_login_e_entrega_o_cookie_csrf(api):
    resposta = api.get("/api/auth/sessao/")

    assert resposta.status_code == 200
    assert resposta.json() == {"autenticado": False, "usuario": None}
    assert "csrftoken" in resposta.cookies


def test_login_sem_token_csrf_e_recusado(api, praticante):
    resposta = api.post(
        "/api/auth/login/", {"username": "praticante", "password": SENHA}, format="json"
    )

    assert resposta.status_code == 403


def test_login_com_token_csrf_abre_a_sessao(api_com_csrf, praticante):
    resposta = api_com_csrf.post(
        "/api/auth/login/", {"username": "praticante", "password": SENHA}, format="json"
    )

    assert resposta.status_code == 200
    assert resposta.json()["username"] == "praticante"
    assert api_com_csrf.get("/api/auth/sessao/").json()["autenticado"] is True


def test_login_com_senha_errada_explica_como_corrigir(api_com_csrf, praticante):
    resposta = api_com_csrf.post(
        "/api/auth/login/",
        {"username": "praticante", "password": "errada"},
        format="json",
    )

    assert resposta.status_code == 400
    assert "Confira os dois campos" in resposta.json()["non_field_errors"][0]


def test_cadastro_cria_o_usuario_e_ja_abre_a_sessao(api_com_csrf):
    resposta = api_com_csrf.post(
        "/api/auth/cadastro/",
        {"username": "nova_praticante", "password": SENHA},
        format="json",
    )

    assert resposta.status_code == 201
    assert resposta.json()["username"] == "nova_praticante"
    assert "password" not in resposta.json()
    assert api_com_csrf.get("/api/auth/sessao/").json()["autenticado"] is True


def test_cadastro_recusa_senha_fraca_explicando_o_motivo(api_com_csrf):
    resposta = api_com_csrf.post(
        "/api/auth/cadastro/",
        {"username": "praticante", "password": "123"},
        format="json",
    )

    assert resposta.status_code == 400
    assert any("curta" in mensagem for mensagem in resposta.json()["password"])


def test_logout_encerra_a_sessao(api_logado):
    assert api_logado.post("/api/auth/logout/").status_code == 204
    assert api_logado.get("/api/auth/sessao/").json()["autenticado"] is False


def test_logout_sem_login_e_recusado(api_com_csrf):
    assert api_com_csrf.post("/api/auth/logout/").status_code == 403
