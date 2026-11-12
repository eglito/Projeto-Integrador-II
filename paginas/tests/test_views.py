"""Página do mapa servida pelo Django (README, decisão 26)."""

import re
from pathlib import Path

import pytest
from django.contrib.staticfiles import finders
from django.urls import Resolver404, resolve
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


def test_detalhes_tem_as_acoes_de_contribuicao(pagina):
    # Especificação, 2.4: avaliar, registrar condição e denunciar, como botões, e
    # o equipamento (plano, etapa 14), sem o qual uma condição não tem onde ser registrada.
    acoes = re.findall(
        r'<button type="button" data-acao="(\w+)"', pagina.content.decode()
    )

    assert acoes == ["avaliar", "condicao", "equipamento", "denunciar"]


def test_visoes_do_painel_comecam_escondidas_e_o_titulo_recebe_o_foco(pagina):
    # mostrarVisao() leva o foco ao h2 da visão: sem tabindex="-1", o foco não vai.
    html = pagina.content.decode()
    visoes = re.findall(
        r'<section id="visao-(\w+)" class="visao" aria-labelledby="([^"]+)"([^>]*)>',
        html,
    )

    nomes = [nome for nome, _, _ in visoes]
    for esperada in ("avaliar", "condicao", "equipamento", "denunciar", "adicionar"):
        assert esperada in nomes, f"Falta a visão {esperada}."
    for nome, titulo, atributos in visoes:
        if nome != "lista":
            assert "hidden" in atributos, f"A visão {nome} deveria começar escondida."
        assert re.search(rf'<h2 id="{titulo}"[^>]*tabindex="-1"', html), nome


def test_contribuicoes_tem_o_botao_de_voltar_ao_local(pagina):
    # Cada formulário diz para onde volta ("Voltar a {nome}", preenchido pelo JS).
    html = pagina.content.decode()

    assert html.count("data-voltar-contribuicao") == 4


def test_seletores_de_contribuicao_nascem_vazios_e_o_front_monta_com_as_opcoes(pagina):
    # CLAUDE.md: o front lê valores e rótulos de /api/opcoes/, nunca repete as listas.
    html = pagina.content.decode()
    seletores = [
        "avaliar-faixa",
        "avaliar-movimento",
        "avaliar-iluminacao",
        "avaliar-limpeza",
        "condicao-equipamento",
        "condicao-condicao",
        "equipamento-tipo",
        "denunciar-motivo",
        "novo-local-municipio",
    ]
    for id_ in seletores:
        assert re.search(rf'<select id="{id_}"[^>]*></select>', html), id_


def test_campos_do_equipamento_que_dependem_do_tipo_comecam_escondidos(pagina):
    # Nome só no tipo "Outro" e largura só nas barras paralelas (restrições do banco).
    html = pagina.content.decode()

    for id_ in ("equipamento-nome-outro-campo", "equipamento-largura-campo"):
        campo = re.search(rf'<div id="{id_}"[^>]*>', html)
        assert campo and "hidden" in campo.group(0), id_


def test_formularios_do_painel_usam_as_mensagens_da_pagina(pagina):
    # novalidate: o navegador não mostra balões em inglês no lugar das nossas mensagens.
    html = pagina.content.decode()
    formularios = re.findall(
        r'<form id="form-[^"]+" class="formulario-conta"[^>]*>', html
    )

    assert len(formularios) >= 8
    assert [f for f in formularios if "novalidate" not in f] == []


def test_aviso_de_duplicata_e_o_passo_dos_dados_comecam_escondidos(pagina):
    # Plano, etapa 13: o 409 e o passo 2 só aparecem pelo JavaScript.
    html = pagina.content.decode()

    for id_ in ("passo-dados", "duplicatas"):
        elemento = re.search(rf'<(?:div|section) id="{id_}"[^>]*>', html)
        assert elemento and "hidden" in elemento.group(0), id_
    assert not re.search(r'<div id="passo-ponto"[^>]*hidden', html)


def test_front_nao_tem_mais_aviso_de_funcao_que_chega_numa_proxima_versao(pagina):
    # Avaliar, registrar condição, denunciar e adicionar local funcionam: nenhum
    # texto provisório pode voltar a bloquear quem está logado.
    textos = [pagina.content.decode()]
    textos += [modulo.read_text() for modulo in PASTA_JS.glob("*.js")]

    for texto in textos:
        assert "próxima versão" not in texto
        assert "ainda não está disponível" not in texto


def test_rotas_que_o_front_chama_existem_no_back():
    # Uma rota com nome errado só apareceria como 404 no navegador. As rotas saem
    # do próprio JavaScript, com os ${...} trocados por um id.
    conferidas = set()
    for modulo in PASTA_JS.glob("*.js"):
        for rota in re.findall(r'[`"](/api/[^`"]*)[`"]', modulo.read_text()):
            caminho = re.sub(r"\$\{[^}]*\}", "1", rota)
            try:
                resolve(caminho)
            except Resolver404:
                pytest.fail(f"{modulo.name} chama {rota}, que não existe no back.")
            conferidas.add(caminho)

    # Controle: as rotas das contribuições entraram na conferência.
    assert {
        "/api/locais/1/avaliacoes/",
        "/api/locais/1/denuncias/",
        "/api/locais/1/equipamentos/",
        "/api/equipamentos/1/registros-condicao/",
        "/api/locais/",
    } <= conferidas


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
