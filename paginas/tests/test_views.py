"""Página do mapa servida pelo Django (README, decisão 26)."""

import re
from pathlib import Path

import pytest
from django.contrib.staticfiles import finders
from pytest_django.asserts import assertTemplateUsed

PASTA_JS = Path(__file__).resolve().parent.parent / "static" / "paginas" / "js"


@pytest.fixture
def pagina(client):
    return client.get("/")


def test_raiz_entrega_a_pagina_do_mapa(pagina):
    assert pagina.status_code == 200
    assertTemplateUsed(pagina, "paginas/mapa.html")


def test_arquivos_estaticos_citados_na_pagina_existem(pagina):
    caminhos = re.findall(r'(?:src|href)="/static/([^"]+)"', pagina.content.decode())

    assert caminhos, "A página deveria citar o CSS e o JavaScript em /static/."
    assert [caminho for caminho in caminhos if finders.find(caminho) is None] == []


def test_importacoes_entre_modulos_apontam_para_arquivos_existentes():
    # Um import com nome errado só apareceria como erro no console do navegador.
    conferidas = 0
    for modulo in PASTA_JS.glob("*.js"):
        for relativo in re.findall(r'from "(\.{1,2}/[^"]+)"', modulo.read_text()):
            assert (modulo.parent / relativo).resolve().is_file(), (
                f"{modulo.name} importa {relativo}, que não existe."
            )
            conferidas += 1

    # Controle: a expressão regular achou importações, e o teste não passou vazio.
    assert conferidas > 0


def test_html_traz_o_basico_de_acessibilidade(pagina):
    html = pagina.content.decode()

    assert '<html lang="pt-BR">' in html
    assert "<main" in html
    assert "<h1" in html
    assert 'role="status"' in html  # região aria-live
    assert 'aria-label="Mapa dos locais"' in html
    # WCAG 1.4.4: o viewport não pode bloquear o zoom do navegador.
    assert "user-scalable=no" not in html
    assert "maximum-scale" not in html


def test_pular_para_a_lista_aponta_para_um_destino_existente(pagina):
    # README, decisão 30: o link evita atravessar todos os marcadores (WCAG 2.4.1).
    html = pagina.content.decode()
    destino = re.search(r'<a class="pular" href="#([^"]+)"', html)

    assert destino, "A página deveria ter o link 'Pular para a lista'."
    assert f'id="{destino.group(1)}"' in html
    # O destino recebe o foco: sem tabindex, alguns navegadores só rolam a página.
    assert re.search(rf'id="{destino.group(1)}"[^>]*tabindex="-1"', html)


def test_todo_campo_do_formulario_tem_rotulo(pagina):
    # WCAG 1.3.1 e 4.1.2: cada campo dos filtros tem um <label for> que o nomeia.
    html = pagina.content.decode()
    campos = re.findall(r"<(?:input|select|textarea)\b[^>]*>", html)
    ids = [re.search(r'\bid="([^"]+)"', campo) for campo in campos]

    assert campos, "A página deveria ter os campos dos filtros."
    assert all(ids), "Todo campo precisa de id para o <label for> apontar."
    rotulos = set(re.findall(r'<label for="([^"]+)"', html))
    assert [id_.group(1) for id_ in ids if id_.group(1) not in rotulos] == []
