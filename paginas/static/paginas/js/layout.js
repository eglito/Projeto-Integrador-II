/**
 * Layout da etapa 4 (README, decisões 29, 39 e 40): a gaveta do menu, as
 * visões do painel e a alternância Mapa/Lista em tela estreita.
 */

// Mesmo limite do CSS. Em em, vale também com zoom de 400% (WCAG 1.4.10).
const TELA_ESTREITA = "(max-width: 48em)";

// Chamado quando o mapa volta para a frente: o Leaflet precisa medir de novo.
let aoMostrarMapa = function () {};
// Chamado a cada troca de visão do painel, com o nome da visão nova.
let aoTrocarVisao = function () {};
// Quem abriu a visão Buscar, para o foco voltar a ele (especificação, 2.4).
let origemDaBusca = null;

export function telaEstreita() {
  return window.matchMedia(TELA_ESTREITA).matches;
}

/** Em tela estreita, põe o Mapa ou a Lista na frente; a barra inferior marca qual. */
export function mostrarTela(tela) {
  $(".principal").attr("data-tela", tela);
  $(".alternancia button").each(function () {
    if ($(this).attr("data-tela") === tela) {
      $(this).attr("aria-current", "true");
    } else {
      $(this).removeAttr("aria-current");
    }
  });
  if (tela === "mapa") {
    aoMostrarMapa();
  }
}

/** A Lista está na frente, ou a tela é larga e ela está sempre visível. */
export function listaVisivel() {
  return !telaEstreita() || $(".principal").attr("data-tela") === "lista";
}

/**
 * Mostra uma visão do painel (lista, buscar, detalhes) e esconde as outras. Em
 * tela estreita, traz o painel para a frente, a não ser com `frente` falso. Com
 * `focar`, o foco vai para o título.
 */
export function mostrarVisao(nome, { focar = true, origem = null, frente = true } = {}) {
  $("#painel .visao").prop("hidden", true);
  $(`#visao-${nome}`).prop("hidden", false);
  if (frente && telaEstreita()) {
    mostrarTela("lista");
  }
  if (nome === "buscar") {
    origemDaBusca = origem;
  }
  aoTrocarVisao(nome);
  if (focar) {
    $(`#visao-${nome} h2`).trigger("focus");
  }
}

/** Sai da visão Buscar sem aplicar: o foco volta a quem a abriu, ou ao título da lista. */
function voltarALista() {
  mostrarVisao("lista", { focar: false });
  const origem = origemDaBusca && $(origemDaBusca).is(":visible") ? origemDaBusca : "#titulo-lista";
  $(origem).trigger("focus");
}

function menuAberto() {
  return !$("#menu").prop("hidden");
}

function abrirMenu() {
  $("#menu, #fundo-menu").prop("hidden", false);
  $("#botao-menu").attr("aria-expanded", "true");
  // O resto da página fica inerte (fora do Tab e do leitor de tela), menos a
  // faixa de anúncios, que continua sendo lida.
  $(".pagina > :not(#anuncio)").attr("inert", "");
  $("#menu [data-visao]").first().trigger("focus");
}

function fecharMenu({ devolverFoco = true } = {}) {
  $("#menu, #fundo-menu").prop("hidden", true);
  $("#botao-menu").attr("aria-expanded", "false");
  $(".pagina > [inert]").removeAttr("inert");
  if (devolverFoco) {
    $("#botao-menu").trigger("focus");
  }
}

/**
 * Liga menu, visões e barra inferior. `aoMostrarMapa` roda quando o mapa volta
 * à frente; `aoTrocarVisao(nome)`, a cada troca de visão do painel.
 */
export function iniciarLayout(opcoes) {
  aoMostrarMapa = opcoes.aoMostrarMapa;
  aoTrocarVisao = opcoes.aoTrocarVisao;

  $("#botao-menu").on("click", function () {
    if (menuAberto()) {
      fecharMenu();
    } else {
      abrirMenu();
    }
  });
  $("#fechar-menu, #fundo-menu").on("click", function () {
    fecharMenu();
  });
  // Escolher um item fecha o menu e leva o foco para a visão escolhida.
  $("#menu").on("click", "[data-visao]", function () {
    fecharMenu({ devolverFoco: false });
    mostrarVisao($(this).attr("data-visao"));
  });

  $("#alterar-filtros").on("click", function () {
    mostrarVisao("buscar", { origem: this });
  });
  $("#voltar-a-lista").on("click", voltarALista);

  $(".alternancia").on("click", "[data-tela]", function () {
    mostrarTela($(this).attr("data-tela"));
  });

  // Os links "Pular para" trazem o destino para a frente antes de o navegador
  // levar o foco até ele: escondido, o destino não teria como receber o foco.
  $('.pular[href="#titulo-lista"]').on("click", function () {
    mostrarVisao("lista", { focar: false });
  });
  $('.pular[href="#mapa"]').on("click", function () {
    if (telaEstreita()) {
      mostrarTela("mapa");
    }
  });

  // Esc fecha o menu; com o foco dentro da visão Buscar, sai dela (especificação,
  // 6, item 4). Com o foco em outro lugar, como num marcador, o Esc só esconde o
  // nome sobre o local (mapa.js) e não tira o foco do lugar (WCAG 1.4.13).
  $(document).on("keydown", function (evento) {
    if (evento.key !== "Escape") {
      return;
    }
    if (menuAberto()) {
      fecharMenu();
    } else if ($(evento.target).closest("#visao-buscar").length) {
      voltarALista();
    }
  });
}
