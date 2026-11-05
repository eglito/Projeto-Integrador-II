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


def test_link_direto_de_um_local_entrega_a_mesma_pagina(client):
    # README, decisão 33: ?local=id é lido pelo JavaScript; o Django só entrega a
    # página, também para um id que não existe ou que nem é número.
    for query in ("?local=7", "?local=999999", "?local=abc"):
        resposta = client.get(f"/{query}")

        assert resposta.status_code == 200, query
        assertTemplateUsed(resposta, "paginas/mapa.html")


def test_visao_de_detalhes_comeca_escondida_e_com_titulo_focavel(pagina):
    # O foco vai para o nome do local quando os detalhes abrem (especificação, 2.4).
    html = pagina.content.decode()
    visao = re.search(r'<section id="visao-detalhes"[^>]*>', html)

    assert visao, "O painel deveria ter a visão Detalhes."
    assert "hidden" in visao.group(0)
    assert re.search(r'id="titulo-detalhes"[^>]*tabindex="-1"', html)


def test_menu_comeca_como_visitante_com_entrar_e_sair_escondido(pagina):
    # Especificação, 2.5: Entrar para visitantes; com sessão, o nome e Sair.
    html = pagina.content.decode()
    entrar = re.search(r'<li id="item-entrar"[^>]*>', html)
    sair = re.search(r'<li id="item-sair"[^>]*>', html)

    assert entrar and "hidden" not in entrar.group(0)
    assert sair and "hidden" in sair.group(0)
    assert re.search(r'<p id="menu-usuario"[^>]*hidden', html)


def test_campos_de_conta_dizem_o_proposito_ao_navegador(pagina):
    # WCAG 1.3.5: autocomplete identifica o campo, e o gerenciador de senhas
    # preenche (WCAG 3.3.8). Senha nova e senha atual não se confundem.
    html = pagina.content.decode()
    esperados = {
        "entrar-usuario": "username",
        "entrar-senha": "current-password",
        "cadastro-usuario": "username",
        "cadastro-senha": "new-password",
    }
    for id_, proposito in esperados.items():
        campo = re.search(rf'<input id="{id_}"[^>]*>', html)
        assert campo, f"Falta o campo {id_}."
        assert f'autocomplete="{proposito}"' in campo.group(0), id_


def test_configuracoes_so_aparecem_com_sessao(pagina):
    # Plano, etapa 11: o item do menu e a visão começam escondidos.
    html = pagina.content.decode()
    item = re.search(r'<li id="item-configuracoes"[^>]*>', html)
    visao = re.search(r'<section id="visao-configuracoes"[^>]*>', html)

    assert item and "hidden" in item.group(0)
    assert visao and "hidden" in visao.group(0)


def test_campos_de_configuracoes_dizem_o_proposito_ao_navegador(pagina):
    # WCAG 1.3.5: senha atual e senha nova não se confundem, e o gerenciador de
    # senhas sabe qual atualizar.
    html = pagina.content.decode()
    esperados = {
        "conta-nome-usuario": "username",
        "conta-nome-senha": "current-password",
        "conta-senha-atual": "current-password",
        "conta-senha-nova": "new-password",
    }
    for id_, proposito in esperados.items():
        campo = re.search(rf'<input id="{id_}"[^>]*>', html)
        assert campo, f"Falta o campo {id_}."
        assert f'autocomplete="{proposito}"' in campo.group(0), id_


def test_adicionar_local_aparece_para_todos_e_o_modo_comeca_fechado(pagina):
    # Plano, etapa 12: o item leva visitantes a Entrar; o modo só abre pelo item.
    html = pagina.content.decode()
    item = re.search(r'<li id="item-adicionar"[^>]*>', html)
    visao = re.search(r'<section id="visao-adicionar"[^>]*>', html)

    assert item and "hidden" not in item.group(0)
    assert visao and "hidden" in visao.group(0)


def test_mira_e_so_visual_e_o_botao_do_centro_vem_antes_do_mapa(pagina):
    # A mira é decorativa (as instruções do mapa a descrevem), e "Usar o centro
    # do mapa" fica antes do mapa no Tab, como "Buscar nesta área": com o mapa em
    # foco, Shift+Tab chega nele.
    html = pagina.content.decode()
    mira = re.search(r'<div id="mira"[^>]*>', html)
    botao = re.search(r'<button[^>]*id="usar-centro"[^>]*>', html)

    assert mira and 'aria-hidden="true"' in mira.group(0) and "hidden" in mira.group(0)
    assert botao and "hidden" in botao.group(0)
    assert html.index('id="usar-centro"') < html.index('id="mapa"')
    assert 'id="mapa-instrucoes-cadastro"' in html


def test_detalhes_tem_as_tres_acoes_de_contribuicao(pagina):
    # Especificação, 2.4: avaliar, registrar condição e denunciar, como botões.
    acoes = re.findall(
        r'<button type="button" data-acao="(\w+)"', pagina.content.decode()
    )

    assert acoes == ["avaliar", "condicao", "denunciar"]


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
    # Título visível na barra superior (decisão 40), e não só para leitor de tela.
    assert "<h1>Mapa de Calistenia</h1>" in html
    assert 'role="status"' in html  # região aria-live
    assert 'aria-label="Mapa dos locais"' in html
    # WCAG 1.4.4: o viewport não pode bloquear o zoom do navegador.
    assert "user-scalable=no" not in html
    assert "maximum-scale" not in html


def test_links_de_pular_apontam_para_destinos_existentes(pagina):
    # README, decisão 30, e WCAG 2.4.1: pular para a lista e para o mapa.
    html = pagina.content.decode()
    destinos = re.findall(r'<a class="pular" href="#([^"]+)"', html)

    assert destinos == ["titulo-lista", "mapa"]
    for destino in destinos:
        assert f'id="{destino}"' in html
    # O título recebe o foco: sem tabindex, alguns navegadores só rolam a página.
    # O mapa fica focável pelo Leaflet, que lhe dá tabindex="0".
    assert re.search(r'id="titulo-lista"[^>]*tabindex="-1"', html)


def test_todo_campo_do_formulario_tem_rotulo(pagina):
    # WCAG 1.3.1 e 4.1.2: cada campo dos filtros tem um <label for> que o nomeia.
    html = pagina.content.decode()
    campos = re.findall(r"<(?:input|select|textarea)\b[^>]*>", html)
    ids = [re.search(r'\bid="([^"]+)"', campo) for campo in campos]

    assert campos, "A página deveria ter os campos dos filtros."
    assert all(ids), "Todo campo precisa de id para o <label for> apontar."
    rotulos = set(re.findall(r'<label for="([^"]+)"', html))
    assert [id_.group(1) for id_ in ids if id_.group(1) not in rotulos] == []


def test_botao_do_menu_controla_a_gaveta_e_comeca_fechado(pagina):
    # Padrão disclosure do WAI-ARIA (especificação, 2.5): aria-expanded e aria-controls.
    html = pagina.content.decode()
    botao = re.search(r'<button[^>]*id="botao-menu"[^>]*>', html)

    assert botao, "A barra superior deveria ter o botão do menu."
    assert 'aria-expanded="false"' in botao.group(0)
    controlado = re.search(r'aria-controls="([^"]+)"', botao.group(0)).group(1)
    gaveta = re.search(rf'<nav[^>]*id="{controlado}"[^>]*>', html)
    assert gaveta, "aria-controls deveria apontar para a gaveta do menu."
    assert "hidden" in gaveta.group(0)


def test_barra_inferior_alterna_mapa_e_lista_com_o_mapa_na_frente(pagina):
    # README, decisão 29: em tela estreita, Mapa e Lista se alternam; o Mapa abre na frente.
    html = pagina.content.decode()
    botoes = re.findall(r'<button[^>]*data-tela="(mapa|lista)"[^>]*>', html)
    atual = re.search(r'<button[^>]*data-tela="(\w+)"[^>]*aria-current="true"', html)

    assert botoes == ["mapa", "lista"]
    assert atual and atual.group(1) == "mapa"
    assert 'data-tela="mapa"' in re.search(r"<main[^>]*>", html).group(0)


def test_ids_usados_como_seletor_no_javascript_existem_na_pagina(pagina):
    # Um $("#id") que não acha nada falha calado: o clique simplesmente não faz nada.
    html = pagina.content.decode()
    ids_da_pagina = set(re.findall(r'\bid="([^"]+)"', html))
    citados = set()
    for modulo in PASTA_JS.glob("*.js"):
        citados |= set(re.findall(r'"#([\w-]+)', modulo.read_text()))

    # Controle: a expressão regular achou seletores, e o teste não passou vazio.
    assert citados
    assert sorted(citados - ids_da_pagina) == []
