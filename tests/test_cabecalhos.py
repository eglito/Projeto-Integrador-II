def test_paginas_enviam_a_origem_como_referer_para_outros_dominios(client):
    # Sem Referer, os tiles do OpenStreetMap são bloqueados (osm.wiki/Blocked).
    resposta = client.get("/admin/login/")

    assert resposta["Referrer-Policy"] == "strict-origin-when-cross-origin"
