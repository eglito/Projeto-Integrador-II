/**
 * Painel de detalhes do local (especificação, 2.4), com os dados de
 * GET /api/locais/{id}/ (LocalDetalhe).
 *
 * As funções puras do início montam os textos e são testadas no QUnit
 * (decisão 35). As demais montam a visão Detalhes do painel. Buscar os dados,
 * abrir, fechar e devolver o foco ficam com o principal.js, que liga o painel
 * ao mapa, à lista e à URL.
 */

import { COMODIDADES, formatarData, rotuloComodidade, textoDistancia } from "./formatacao.js";

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

/**
 * "Distância: 646 m do centro do mapa.", como na lista. Aberto pelo link, o
 * local é o próprio centro do mapa, e "0 m" não diria nada.
 */
export function textoDistanciaDetalhe(metros, origem) {
  if (origem === "centro" && Math.round(metros) === 0) {
    return "No centro do mapa.";
  }
  return `Distância: ${textoDistancia(metros, origem)}.`;
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

/** "1 avaliação", "3 avaliações" ou "Nenhuma avaliação". */
export function textoAvaliacoes(quantidade) {
  if (quantidade === 0) {
    return "Nenhuma avaliação";
  }
  return quantidade === 1 ? "1 avaliação" : `${quantidade} avaliações`;
}

/**
 * Linhas da tabela de segurança, uma por faixa de horário, com os rótulos de
 * /api/opcoes/: { faixa: "Noite", avaliacoes: "1 avaliação", movimento:
 * "Movimentado: 1", iluminacao: "Boa: 1" }. Tudo em texto, nada só em cor
 * (especificação, 2.4). A iluminação só é obrigatória à noite; nas outras
 * faixas pode faltar. As avaliações vão junto da faixa, e não numa coluna
 * própria: com três colunas, a tabela cabe em 320 px sem partir palavras.
 */
export function linhasSeguranca(seguranca, { faixas_horario, movimento, iluminacao }) {
  return faixas_horario.map(function ({ valor, rotulo }) {
    const resumo = seguranca[valor];
    const quantidade = resumo ? resumo.avaliacoes : 0;
    if (quantidade === 0) {
      return {
        faixa: rotulo,
        avaliacoes: textoAvaliacoes(0),
        movimento: SEM_AVALIACOES,
        iluminacao: SEM_AVALIACOES,
      };
    }
    return {
      faixa: rotulo,
      avaliacoes: textoAvaliacoes(quantidade),
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
 * Esc com o foco no painel; `aoMostrarNoMapa`, em "Mostrar no mapa";
 * `aoContribuir(acao)`, nos botões de contribuição ("avaliar", "condicao",
 * "denunciar").
 */
export function iniciarDetalhes({ opcoes, aoVoltar, aoMostrarNoMapa, aoContribuir }) {
  rotulos = opcoes;
  $("#voltar-dos-detalhes").on("click", aoVoltar);
  $("#mostrar-no-mapa").on("click", aoMostrarNoMapa);
  $("#contribuir").on("click", "[data-acao]", function () {
    aoContribuir($(this).attr("data-acao"));
  });
  $("#visao-detalhes").on("keydown", function (evento) {
    if (evento.key === "Escape") {
      aoVoltar();
    }
  });
}

/**
 * Preenche a visão com o LocalDetalhe. `resultado` é o mesmo local no
 * resultado da busca atual, { distancia_m, origem }, ou null quando ele não
 * está nela. Tudo com .text(): nomes, endereço e textos alternativos vêm de
 * quem cadastrou.
 */
export function mostrarDetalhes(local, resultado) {
  $("#titulo-detalhes").text(local.nome);
  $("#endereco-detalhes")
    .text(textoEndereco(local.endereco, local.municipio_nome))
    .prop("hidden", false);
  acompanharResultado(resultado);

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
  // A contribuição só aparece com um local carregado: num erro, não há onde contribuir.
  $("#contribuir").prop("hidden", false);
}

/** Leva o foco ao botão de uma ação de contribuição, na volta do login. */
export function focarContribuicao(acao) {
  $(`#contribuir [data-acao="${acao}"]`).trigger("focus");
}

/**
 * A visão abre na hora do clique, antes da resposta da API: o nome, quando a
 * lista já o tem, e o aviso de que os detalhes estão chegando. Sem isso, numa
 * rede lenta, a pessoa clicaria sem ver nada acontecer.
 */
export function mostrarCarregando(nome) {
  $("#titulo-detalhes").text(nome ?? "Carregando o local");
  $("#endereco-detalhes").text("").prop("hidden", true);
  $("#contribuir").prop("hidden", true);
  acompanharResultado(null);
  $("#conteudo-detalhes")
    .empty()
    .append($("<p>").text("Carregando os detalhes…"));
}

/**
 * Distância e "Mostrar no mapa" seguem a busca atual, também depois de uma
 * busca nova com o painel aberto (pela posição da pessoa, por exemplo). Fora do
 * resultado, o local não tem distância nem marcador, e os dois somem.
 */
export function acompanharResultado(resultado) {
  $("#distancia-detalhes")
    .text(resultado ? textoDistanciaDetalhe(resultado.distancia_m, resultado.origem) : "")
    .prop("hidden", !resultado);
  $("#mostrar-no-mapa").prop("hidden", !resultado);
}

/** O local não abriu: título e mensagem dizem o que aconteceu e o que fazer. */
export function mostrarErroDeDetalhes({ titulo, mensagem }) {
  $("#titulo-detalhes").text(titulo);
  $("#endereco-detalhes").text("").prop("hidden", true);
  $("#contribuir").prop("hidden", true);
  acompanharResultado(null);
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
  for (const coluna of ["Faixa", "Movimento", "Iluminação"]) {
    $("<th>", { scope: "col" }).text(coluna).appendTo(cabecalho);
  }
  const corpo = $("<tbody>").appendTo(tabela);
  for (const linha of linhasSeguranca(seguranca, rotulos)) {
    // O cabeçalho da linha leva a faixa e, abaixo, quantas avaliações a sustentam.
    // O espaço separa os dois no nome lido pelo leitor de tela ("Manhã 2 avaliações").
    const faixa = $("<th>", { scope: "row" })
      .text(`${linha.faixa} `)
      .append($("<span>", { class: "seguranca__avaliacoes" }).text(linha.avaliacoes));
    $("<tr>")
      .append(faixa, $("<td>").text(linha.movimento), $("<td>").text(linha.iluminacao))
      .appendTo(corpo);
  }
  return secao;
}
