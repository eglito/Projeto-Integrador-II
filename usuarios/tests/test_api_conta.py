"""Configurações da conta: troca do nome e da senha (README, decisão 23)."""

import pytest

pytestmark = pytest.mark.django_db

SENHA = "Barra-fixa-2026"  # senhas de teste, só existem no banco de testes
NOVA_SENHA = "Paralelas-baixas-2026"

ROTAS = [("put", "/api/auth/conta/"), ("post", "/api/auth/conta/senha/")]


@pytest.fixture
def praticante(django_user_model):
    return django_user_model.objects.create_user(username="praticante", password=SENHA)


@pytest.fixture
def logado(cliente_logado, praticante):
    return cliente_logado(praticante)


def trocar_nome(cliente, **dados):
    return cliente.put("/api/auth/conta/", dados, format="json")


def trocar_senha(cliente, **dados):
    return cliente.post("/api/auth/conta/senha/", dados, format="json")


def entrar(cliente, senha):
    return cliente.post(
        "/api/auth/login/", {"username": "praticante", "password": senha}, format="json"
    )


# Troca do nome


def test_troca_o_nome_com_a_senha_atual_e_a_sessao_continua(logado, praticante):
    resposta = trocar_nome(logado, username="praticante_nova", senha_atual=SENHA)

    assert resposta.status_code == 200
    assert resposta.json() == {"id": praticante.id, "username": "praticante_nova"}
    assert logado.get("/api/auth/sessao/").json()["usuario"]["username"] == (
        "praticante_nova"
    )


def test_senha_atual_errada_nao_troca_o_nome(logado, praticante):
    resposta = trocar_nome(logado, username="outro_nome", senha_atual="errada")

    assert resposta.status_code == 400
    assert resposta.json()["senha_atual"] == [
        "Senha atual incorreta. Digite a senha que você usa para entrar."
    ]
    praticante.refresh_from_db()
    assert praticante.username == "praticante"


def test_sem_a_senha_atual_explica_que_ela_confirma_a_troca(logado):
    resposta = trocar_nome(logado, username="outro_nome")

    assert resposta.status_code == 400
    assert resposta.json()["senha_atual"] == [
        "Informe a sua senha atual para confirmar a troca."
    ]


def test_nome_em_uso_e_recusado_dizendo_como_corrigir(logado, outro_usuario):
    resposta = trocar_nome(logado, username=outro_usuario.username, senha_atual=SENHA)

    assert resposta.status_code == 400
    assert resposta.json()["username"] == [
        "Este nome de usuário já está em uso. Escolha outro."
    ]


def test_imitacao_em_largura_total_de_nome_em_uso_e_recusada(
    logado, outro_usuario, em_largura_total
):
    imitacao = em_largura_total(outro_usuario.username)

    resposta = trocar_nome(logado, username=imitacao, senha_atual=SENHA)

    assert resposta.status_code == 400
    assert resposta.json()["username"] == [
        "Este nome de usuário já está em uso. Escolha outro."
    ]


def test_o_nome_novo_e_gravado_na_forma_normalizada(
    logado, praticante, em_largura_total
):
    # Controle da normalização: um nome livre é aceito, já com as letras comuns.
    resposta = trocar_nome(
        logado, username=em_largura_total("filipe"), senha_atual=SENHA
    )

    assert resposta.status_code == 200
    praticante.refresh_from_db()
    assert praticante.username == "filipe"


def test_manter_o_proprio_nome_nao_conta_como_nome_em_uso(logado):
    # Controle da unicidade: a conta não colide com ela mesma.
    assert (
        trocar_nome(logado, username="praticante", senha_atual=SENHA).status_code == 200
    )


# Troca da senha


def test_troca_a_senha_mantem_esta_sessao_e_derruba_as_outras(
    cliente_logado, praticante
):
    esta = cliente_logado(praticante)
    outra = cliente_logado(praticante)  # a mesma conta aberta em outro aparelho
    # Controle: antes da troca, a outra sessão está aberta.
    assert outra.get("/api/auth/sessao/").json()["autenticado"] is True

    resposta = trocar_senha(esta, senha_atual=SENHA, nova_senha=NOVA_SENHA)

    assert resposta.status_code == 204
    assert esta.get("/api/auth/sessao/").json()["autenticado"] is True
    assert outra.get("/api/auth/sessao/").json()["autenticado"] is False


def test_depois_da_troca_so_a_senha_nova_entra(logado, api_com_csrf):
    trocar_senha(logado, senha_atual=SENHA, nova_senha=NOVA_SENHA)

    assert entrar(api_com_csrf, SENHA).status_code == 400
    assert entrar(api_com_csrf, NOVA_SENHA).status_code == 200


def test_senha_atual_errada_nao_troca_a_senha(logado, praticante):
    resposta = trocar_senha(logado, senha_atual="errada", nova_senha=NOVA_SENHA)

    assert resposta.status_code == 400
    assert "Senha atual incorreta" in resposta.json()["senha_atual"][0]
    praticante.refresh_from_db()
    assert praticante.check_password(SENHA)


def test_nova_senha_fraca_e_recusada_explicando_o_motivo(logado):
    resposta = trocar_senha(logado, senha_atual=SENHA, nova_senha="123")

    assert resposta.status_code == 400
    assert any("curta" in mensagem for mensagem in resposta.json()["nova_senha"])


def test_nova_senha_igual_a_atual_e_recusada(logado):
    resposta = trocar_senha(logado, senha_atual=SENHA, nova_senha=SENHA)

    assert resposta.status_code == 400
    assert resposta.json()["nova_senha"] == [
        "A nova senha precisa ser diferente da atual."
    ]


# Acesso


@pytest.mark.parametrize(("metodo", "rota"), ROTAS)
def test_sem_login_as_rotas_da_conta_sao_recusadas(api_com_csrf, metodo, rota):
    resposta = getattr(api_com_csrf, metodo)(
        rota, {"senha_atual": SENHA}, format="json"
    )

    assert resposta.status_code == 403


@pytest.mark.parametrize(("metodo", "rota"), ROTAS)
def test_sem_token_csrf_as_rotas_da_conta_sao_recusadas(api, praticante, metodo, rota):
    api.force_login(praticante)  # sessão aberta, mas sem o cabeçalho X-CSRFToken
    dados = {"username": "outro_nome", "senha_atual": SENHA, "nova_senha": NOVA_SENHA}

    resposta = getattr(api, metodo)(rota, dados, format="json")

    assert resposta.status_code == 403
    praticante.refresh_from_db()
    assert praticante.username == "praticante"
    assert praticante.check_password(SENHA)
