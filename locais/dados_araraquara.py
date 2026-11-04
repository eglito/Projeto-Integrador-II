"""Locais reais de Araraquara, usados nos testes e no banco de desenvolvimento.

Coordenadas do OpenStreetMap (consultadas em 04/10/2026) e equipamentos
observados na pesquisa de campo (Docs/sintese-pesquisa.md, seção 1).
Quem usa: `conftest.py` e o comando `carregar_locais_araraquara`.
"""

# Point recebe (longitude, latitude), nesta ordem.
COORDENADAS = {
    "Parque Infantil": (-48.1793589, -21.7827686),
    "Praça Pedro de Toledo": (-48.1794181, -21.7941043),
    "Praça dos Advogados": (-48.1734075, -21.7667175),
    "Praça Paulo Elias Antonio": (-48.1614378, -21.7734436),
    "Jardim Botânico": (-48.1817270, -21.7572576),
}

# A pesquisa não registrou os equipamentos da Praça Pedro de Toledo.
EQUIPAMENTOS = {
    "Parque Infantil": ["barra_fixa", "barra_australiana", "barras_paralelas"],
    "Praça dos Advogados": ["espaldar", "barras_paralelas", "barra_fixa"],
    "Praça Paulo Elias Antonio": ["barra_fixa", "barra_australiana"],
    "Jardim Botânico": ["barra_australiana", "barra_fixa"],
}
