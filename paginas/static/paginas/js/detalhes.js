/**
 * Painel de detalhes do local (especificação, 2.4), com os dados de
 * GET /api/locais/{id}/ (LocalDetalhe).
 *
 * As funções puras do início montam os textos e são testadas no QUnit
 * (decisão 35). As demais montam a visão Detalhes do painel. Buscar os dados,
 * abrir, fechar e devolver o foco ficam com o principal.js, que liga o painel
 * ao mapa, à lista e à URL.
 */

import { COMODIDADES, formatarData, rotuloComodidade } from "./formatacao.js";

const SEM_AVALIACOES = "Sem avaliações";

/** No tipo "outro", vale o nome dado por quem cadastrou (Docs/API.md, 5.7). */
export function nomeEquipamento(equipamento) {
  return equipamento.nome_outro || equipamento.tipo_nome;
}

/** "Altura: 220 cm. Largura: 50 cm.", só com o que foi informado. */
export function textoDimensoes({ altura_cm, largura_cm }) {
  const partes = [];
  if (altura_cm) {
    partes.push(`Altura: ${altura_cm} cm.`);
  }
  if (largura_cm) {
    partes.push(`Largura: ${largura_cm} cm.`);
  }
  return partes.length ? partes.join(" ") : "Dimensões não informadas.";
}

/** A condição sempre com a data do registro (RN-02): "Condição: Bom, registrado em 09/10/2026." */
export function textoCondicao({ condicao_atual_nome, condicao_registrada_em }) {
  if (!condicao_atual_nome) {
    return "Sem registro de condição.";
  }
  return `Condição: ${condicao_atual_nome}, registrado em ${formatarData(condicao_registrada_em)}.`;
}

/**
 * Autoria (RN-08). Sem autor (conta excluída ou dado de exemplo da etapa 1),
 * fica só a data.
 */
export function textoAutoria(criadoPor, criadoEm) {
  const data = formatarData(criadoEm);
  return criadoPor ? `Cadastrado por ${criadoPor} em ${data}.` : `Cadastrado em ${data}.`;
}

/** "Rua 3. Araraquara (SP)." O endereço é opcional no cadastro. */
export function textoEndereco(endereco, municipio) {
  return endereco ? `${endereco}. ${municipio}.` : `Endereço não informado. ${municipio}.`;
}

/** "Sim", "Não" e "Não informado": null não é "não tem" (Docs/API.md, seção 1). */
export function rotuloComodidadeDetalhe(valor) {
  const rotulo = rotuloComodidade(valor);
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

/** "Movimentado: 2; Vazio: 1", na ordem das escolhas de /api/opcoes/, sem as que não tiveram voto. */
function contagens(porValor, escolhas) {
  return escolhas
    .filter((escolha) => porValor[escolha.valor])
    .map((escolha) => `${escolha.rotulo}: ${porValor[escolha.valor]}`)
    .join("; ");
}

/**
 * Linhas da tabela de segurança, uma por faixa de horário, com os rótulos de
 * /api/opcoes/: { faixa: "Noite", avaliacoes: "1", movimento: "Movimentado: 1",
 * iluminacao: "Boa: 1" }. Tudo em texto, nada só em cor (especificação, 2.4).
 * A iluminação só é obrigatória à noite; nas outras faixas pode faltar.
 */
export function linhasSeguranca(seguranca, { faixas_horario, movimento, iluminacao }) {
  return faixas_horario.map(function ({ valor, rotulo }) {
    const resumo = seguranca[valor];
    if (!resumo || resumo.avaliacoes === 0) {
      return {
        faixa: rotulo,
        avaliacoes: "0",
        movimento: SEM_AVALIACOES,
        iluminacao: SEM_AVALIACOES,
      };
    }
    return {
      faixa: rotulo,
      avaliacoes: String(resumo.avaliacoes),
      movimento: contagens(resumo.movimento, movimento),
      iluminacao: contagens(resumo.iluminacao, iluminacao) || "Não informada",
    };
  });
}

/**
 * Título e mensagem quando os detalhes não abrem. Um id que não existe (404) ou
 * que nem é um id ("invalido") recebe a mensagem própria, em português, e não o
 * texto em inglês da API (bug 2 do HANDOFF).
 */
export function erroDeDetalhes(status) {
  if (status === 404 || status === "invalido") {
    return {
      titulo: "Local não encontrado",
      mensagem:
        "Não encontramos este local. Ele pode ter sido removido, ou o link está incompleto. Escolha um local na lista ou no mapa.",
    };
  }
  return {
    titulo: "Detalhes indisponíveis",
    mensagem:
      "Não foi possível carregar os detalhes do local. Confira a conexão com a internet e escolha o local de novo.",
  };
}

// Rótulos de /api/opcoes/ (faixas de horário, movimento e iluminação).
let rotulos = null;

/**
 * Liga os botões da visão Detalhes. `aoVoltar` roda em "Voltar à lista" e no
 * Esc com o foco no painel; `aoMostrarNoMapa`, em "Mostrar no mapa".
 */
export function iniciarDetalhes({ opcoes, aoVoltar, aoMostrarNoMapa }) {
  rotulos = opcoes;
  $("#voltar-dos-detalhes").on("click", aoVoltar);
  $("#mostrar-no-mapa").on("click", aoMostrarNoMapa);
  $("#visao-detalhes").on("keydown", function (evento) {
    if (evento.key === "Escape") {
      aoVoltar();
    }
  });
}

/**
 * Preenche a visão com o LocalDetalhe. `distancia` é o texto da lista ("646 m
 * do centro do mapa"), ou null quando o local não está no resultado da busca;
 * aí também não há marcador para "Mostrar no mapa". Tudo com .text(): nomes,
 * endereço e textos alternativos vêm de quem cadastrou.
 */
export function mostrarDetalhes(local, { distancia }) {
  $("#titulo-detalhes").text(local.nome);
  $("#endereco-detalhes")
    .text(textoEndereco(local.endereco, local.municipio_nome))
    .prop("hidden", false);
  atualizarDistancia(distancia);

  const conteudo = $("#conteudo-detalhes").empty();
  if (local.foto) {
    $("<figure>", { class: "foto-local" })
      .append($("<img>", { src: local.foto.url, alt: local.foto.texto_alternativo }))
      .appendTo(conteudo);
  } else {
    $("<p>").text("Ainda não há foto deste local.").appendTo(conteudo);
  }

  conteudo.append(secaoEquipamentos(local.equipamentos));
  conteudo.append(secaoComodidades(local));
  conteudo.append(secaoSeguranca(local.seguranca));
  $("<p>", { class: "autoria" })
    .text(textoAutoria(local.criado_por, local.criado_em))
    .appendTo(conteudo);
}

/**
 * Atualiza a distância depois de uma busca nova (por exemplo, pela posição da
 * pessoa) com o painel aberto. Sem distância, a linha e "Mostrar no mapa" somem.
 */
export function atualizarDistancia(distancia) {
  $("#distancia-detalhes")
    .text(distancia ? `Distância: ${distancia}.` : "")
    .prop("hidden", !distancia);
  $("#mostrar-no-mapa").prop("hidden", !distancia);
}

/** O local não abriu: título e mensagem dizem o que aconteceu e o que fazer. */
export function mostrarErroDeDetalhes({ titulo, mensagem }) {
  $("#titulo-detalhes").text(titulo);
  $("#endereco-detalhes").text("").prop("hidden", true);
  atualizarDistancia(null);
  $("#conteudo-detalhes")
    .empty()
    .append($("<p>").text(mensagem));
}

function secaoEquipamentos(equipamentos) {
  const secao = $("<section>", { "aria-labelledby": "titulo-equipamentos" });
  $("<h3>", { id: "titulo-equipamentos" }).text("Equipamentos").appendTo(secao);
  if (equipamentos.length === 0) {
    $("<p>").text("Nenhum equipamento cadastrado.").appendTo(secao);
    return secao;
  }
  // role="list": o Safari tira a semântica de lista quando o CSS remove os marcadores.
  const lista = $("<ul>", { class: "equipamentos", role: "list" }).appendTo(secao);
  for (const equipamento of equipamentos) {
    const item = $("<li>").appendTo(lista);
    $("<p>", { class: "equipamento__nome" }).text(nomeEquipamento(equipamento)).appendTo(item);
    $("<p>").text(textoDimensoes(equipamento)).appendTo(item);
    $("<p>").text(textoCondicao(equipamento)).appendTo(item);
    if (equipamento.foto_condicao_url) {
      $("<img>", {
        src: equipamento.foto_condicao_url,
        alt: equipamento.foto_condicao_texto_alternativo,
        class: "foto-condicao",
      }).appendTo(item);
    }
  }
  return secao;
}

function secaoComodidades(local) {
  const secao = $("<section>", { "aria-labelledby": "titulo-comodidades" });
  $("<h3>", { id: "titulo-comodidades" }).text("Comodidades").appendTo(secao);
  const lista = $("<dl>", { class: "comodidades" }).appendTo(secao);
  for (const [campo, rotulo] of COMODIDADES) {
    $("<div>")
      .append($("<dt>").text(rotulo), $("<dd>").text(rotuloComodidadeDetalhe(local[campo])))
      .appendTo(lista);
  }
  return secao;
}

function secaoSeguranca(seguranca) {
  const secao = $("<section>", { "aria-labelledby": "titulo-seguranca" });
  $("<h3>", { id: "titulo-seguranca" }).text("Segurança").appendTo(secao);
  const tabela = $("<table>", { class: "seguranca" }).appendTo(secao);
  $("<caption>").text("Avaliações dos últimos 90 dias, por faixa de horário").appendTo(tabela);
  const cabecalho = $("<tr>").appendTo($("<thead>").appendTo(tabela));
  for (const coluna of ["Faixa", "Avaliações", "Movimento", "Iluminação"]) {
    $("<th>", { scope: "col" }).text(coluna).appendTo(cabecalho);
  }
  const corpo = $("<tbody>").appendTo(tabela);
  for (const linha of linhasSeguranca(seguranca, rotulos)) {
    $("<tr>")
      .append(
        $("<th>", { scope: "row" }).text(linha.faixa),
        $("<td>").text(linha.avaliacoes),
        $("<td>").text(linha.movimento),
        $("<td>").text(linha.iluminacao),
      )
      .appendTo(corpo);
  }
  return secao;
}
