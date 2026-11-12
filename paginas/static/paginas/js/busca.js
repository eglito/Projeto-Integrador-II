/**
 * Filtros e "Buscar nesta área" (especificação, 2.3 e 2.5).
 *
 * As funções puras do início são testadas no QUnit (decisão 35). As demais
 * ligam o formulário e o botão. Interface provisória: a etapa 4 move o
 * formulário para o item Buscar do menu (Docs/plano_front.md).
 */

import { anunciar } from "./anuncio.js";
import { formatarDistancia } from "./formatacao.js";

// Decisão de projeto: degraus do seletor de raio, de uns 6 a uns 125 minutos a
// pé. O padrão (2 km, decisão 14) e o máximo vêm de /api/opcoes/; o que passa
// do máximo fica de fora.
const RAIOS_M = [500, 1000, 2000, 5000, 10000];

// O raio da área visível é arredondado para cima até 100 m: texto limpo ("3,4 km").
const PASSO_RAIO_M = 100;

/** Raios do seletor: os degraus até o máximo, sempre com o padrão e o máximo. */
export function opcoesDeRaio(padrao, maximo) {
  const raios = new Set(RAIOS_M.filter((raio) => raio <= maximo));
  raios.add(padrao);
  raios.add(maximo);
  return [...raios].sort((a, b) => a - b);
}

/**
 * Raio que cobre a área visível: a distância do centro ao canto, arredondada
 * para cima e limitada ao máximo da API. `limitado` diz se o limite cortou a área.
 */
export function raioDaArea(distanciaAoCantoM, raioMaximoM) {
  const arredondado = Math.max(
    PASSO_RAIO_M,
    Math.ceil(distanciaAoCantoM / PASSO_RAIO_M) * PASSO_RAIO_M,
  );
  return { raio: Math.min(arredondado, raioMaximoM), limitado: arredondado > raioMaximoM };
}

/**
 * Medida digitada, em centímetros: vazia vale null; senão, um inteiro maior que
 * zero, ou o erro. `rotulo` completa a mensagem ("altura", "largura"). O
 * cadastro de equipamento (contribuicoes.js) usa a mesma regra da altura do filtro.
 */
export function validarMedida(texto, rotulo) {
  const limpo = texto.trim();
  if (limpo === "") {
    return { valor: null };
  }
  if (!/^\d+$/.test(limpo) || Number(limpo) === 0) {
    return {
      erro: `Informe a ${rotulo} em centímetros, com um número inteiro maior que zero, ou deixe o campo vazio.`,
    };
  }
  return { valor: Number(limpo) };
}

/** Altura do filtro: vazia vale null; senão, um inteiro maior que zero, ou o erro. */
export function validarAltura(texto) {
  return validarMedida(texto, "altura");
}

/**
 * Parâmetros de GET /api/locais/ para o estado da busca. Filtros vazios ficam
 * de fora: sem `tipo`, a API não filtra por tipo.
 */
export function parametrosDaBusca({ latitude, longitude, raio, tipo, alturaMaxima }) {
  const parametros = { latitude, longitude, raio };
  if (tipo) {
    parametros.tipo = tipo;
  }
  if (alturaMaxima) {
    parametros.altura_maxima = alturaMaxima;
  }
  return parametros;
}

/**
 * Monta o formulário com as opções de /api/opcoes/ e liga o envio. `aoAplicar`
 * recebe { tipo, alturaMaxima, raio } já validados.
 */
export function iniciarFiltros({ tiposEquipamento, raioPadrao, raioMaximo, aoAplicar }) {
  const tipo = $("#filtro-tipo");
  for (const opcao of tiposEquipamento) {
    $("<option>", { value: opcao.valor }).text(opcao.rotulo).appendTo(tipo);
  }
  const raio = $("#filtro-raio");
  for (const metros of opcoesDeRaio(raioPadrao, raioMaximo)) {
    const rotulo = formatarDistancia(metros) + (metros === raioPadrao ? " (padrão)" : "");
    $("<option>", { value: metros }).text(rotulo).appendTo(raio);
  }
  raio.val(String(raioPadrao));

  // Enter em qualquer campo também envia o formulário.
  $("#filtros").on("submit", function (evento) {
    evento.preventDefault();
    const altura = validarAltura($("#filtro-altura").val());
    if (altura.erro) {
      mostrarErroDaAltura(altura.erro);
      return;
    }
    limparErroDaAltura();
    aoAplicar({ tipo: tipo.val(), alturaMaxima: altura.valor, raio: Number(raio.val()) });
  });

  $("#limpar-filtros").on("click", function () {
    tipo.val("");
    $("#filtro-altura").val("");
    raio.find("[data-area]").remove();
    raio.val(String(raioPadrao));
    limparErroDaAltura();
    aoAplicar({ tipo: "", alturaMaxima: null, raio: raioPadrao });
  });
}

/** Erro junto do campo, ligado a ele, anunciado e com o foco no campo (CLAUDE.md). */
function mostrarErroDaAltura(mensagem) {
  $("#filtro-altura-erro").text(mensagem).prop("hidden", false);
  $("#filtro-altura")
    .attr({ "aria-invalid": "true", "aria-describedby": "filtro-altura-ajuda filtro-altura-erro" })
    .trigger("focus");
  anunciar(`Altura máxima: ${mensagem}`);
}

function limparErroDaAltura() {
  $("#filtro-altura-erro").text("").prop("hidden", true);
  $("#filtro-altura").removeAttr("aria-invalid").attr("aria-describedby", "filtro-altura-ajuda");
}

/**
 * Mostra no seletor o raio em uso. Um raio dos degraus é só selecionado; o da
 * área visível entra como opção própria, para o formulário dizer a verdade.
 */
export function marcarRaio(metros, { daArea = false } = {}) {
  const raio = $("#filtro-raio");
  raio.find("[data-area]").remove();
  if (daArea) {
    $("<option>", { value: metros, "data-area": "" })
      .text(`Área visível do mapa (${formatarDistancia(metros)})`)
      .prependTo(raio);
  }
  raio.val(String(metros));
}

/**
 * Mostra no formulário os filtros em uso, depois de uma busca que os trocou por
 * conta própria: o cadastro de um local limpa os filtros, e "Alterar filtros"
 * não pode mostrar os antigos.
 */
export function marcarFiltros({ tipo, alturaMaxima }) {
  $("#filtro-tipo").val(tipo);
  $("#filtro-altura").val(alturaMaxima ?? "");
  limparErroDaAltura();
}

/**
 * Liga o botão "Buscar nesta área". Ele só some depois de a busca dar certo
 * (esconderBuscaNaArea): se ela falhar, o botão e o foco continuam no lugar,
 * para tentar de novo.
 */
export function iniciarBuscaNaArea({ aoBuscar }) {
  $("#buscar-na-area").on("click", aoBuscar);
}

export function esconderBuscaNaArea() {
  $("#buscar-na-area").prop("hidden", true);
}

/** Mostra o botão depois de a pessoa mover o mapa, anunciando só na primeira vez. */
export function oferecerBuscaNaArea() {
  const botao = $("#buscar-na-area");
  if (botao.prop("hidden")) {
    botao.prop("hidden", false);
    anunciar("O mapa mudou de lugar. Use Buscar nesta área para ver os locais da área visível.");
  }
}
