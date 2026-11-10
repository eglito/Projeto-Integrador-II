/**
 * Lista textual dos locais (RN-10): o mesmo resultado do mapa, em texto, para
 * quem usa teclado ou leitor de tela, ou só prefere ler.
 */

import {
  formatarDistancia,
  textoComodidades,
  textoDistancia,
  textoEquipamentos,
} from "./formatacao.js";

/**
 * Liga os cliques da visão Lista uma vez só. Um listener nela atende todos os
 * botões, inclusive os que a lista ainda vai criar (delegação de eventos).
 */
export function iniciarLista({ aoEscolher, aoAmpliar, aoCadastrar }) {
  const visao = $("#visao-lista");
  visao.on("click", "[data-local]", function () {
    aoEscolher(Number($(this).attr("data-local")));
  });
  visao.on("click", "[data-ampliar]", aoAmpliar);
  visao.on("click", "[data-cadastrar]", aoCadastrar);
}

/**
 * Mostra `locais`, na ordem em que chegam (por distância). Sem resultados, as
 * duas ações da especificação (2.3): buscar mais longe, se o raio ainda pode
 * aumentar, e cadastrar um local.
 */
export function mostrarLista(locais, { tiposEquipamento, origem, raio, raioMaximo }) {
  const lista = $("#lista-locais").empty();
  const acoes = $("#acoes-lista").empty();

  if (locais.length === 0) {
    if (raio < raioMaximo) {
      $("<button>", { type: "button", "data-ampliar": "" })
        .text(`Buscar até ${formatarDistancia(raioMaximo)}`)
        .appendTo(acoes);
    }
    $("<button>", { type: "button", "data-cadastrar": "" }).text("Cadastrar um local").appendTo(acoes);
    return;
  }

  // .text() escapa o conteúdo: nome e equipamentos vêm de quem cadastrou.
  for (const local of locais) {
    const item = $("<li>", { class: "local" });
    $("<button>", { type: "button", class: "local__nome", "data-local": local.id })
      .text(local.nome)
      .appendTo(item);
    $("<p>").text(textoDistancia(local.distancia_m, origem)).appendTo(item);
    $("<p>").text(textoEquipamentos(local.equipamentos, tiposEquipamento)).appendTo(item);
    $("<p>").text(textoComodidades(local)).appendTo(item);
    lista.append(item);
  }
}

/** Marca o local `id` como escolhido; com `rolar`, traz o item para a vista. */
export function marcarNaLista(id, { rolar = false } = {}) {
  const botoes = $("#lista-locais [data-local]");
  botoes.removeAttr("aria-current").closest("li").removeClass("local--escolhido");

  const botao = botoes.filter(`[data-local="${id}"]`);
  botao.attr("aria-current", "true").closest("li").addClass("local--escolhido");
  if (rolar && botao.length) {
    // Sem rolagem suave: nada de animação para quem pede movimento reduzido.
    botao.closest("li")[0].scrollIntoView({ block: "nearest" });
  }
}
