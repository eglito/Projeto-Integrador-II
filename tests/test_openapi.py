"""Documentação OpenAPI gerada a partir do código (README, seção 10)."""


def test_esquema_openapi_documenta_as_rotas_da_api(client):
    resposta = client.get("/api/schema/?format=json")

    assert resposta.status_code == 200
    assert "/api/auth/login/" in resposta.json()["paths"]


def test_documentacao_navegavel_esta_disponivel(client):
    assert client.get("/api/docs/").status_code == 200
