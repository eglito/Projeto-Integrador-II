/**
 * Busca por endereço no Nominatim, o serviço de endereços do OpenStreetMap,
 * chamado direto do navegador (README, decisão 28).
 *
 * As funções puras do início são testadas no QUnit (decisão 35). As demais
 * ligam o formulário da visão Buscar.
 */

import { obter } from "./api.js";
import { anunciar } from "./anuncio.js";

const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Política de uso do Nominatim: no máximo 1 requisição por segundo.
const INTERVALO_MINIMO_MS = 1000;

// Decisão de projeto: a busca prefere a região em volta do centro padrão (±0,2°,
// uns 22 km), sem se limitar a ela. Nunca em volta da posição da pessoa, que
// assim não sai do navegador (decisão 28; especificação, 2.2).
const MARGEM_VIEWBOX_GRAUS = 0.2;

const MAXIMO_RESULTADOS = 5;

// Partes do nome que não ajudam a escolher entre endereços do Brasil.
const PARTE_DISPENSAVEL = /^(Região |Brasil$)/;

const TEXTO_VAZIO =
  "Digite um endereço ou o nome de um lugar, por exemplo: Praça da Matriz, Araraquara.";

/** Parâmetros da busca no Nominatim, com o viewbox em volta do centro padrão. */
export function parametrosNominatim(texto, centroPadrao) {
  const { latitude, longitude } = centroPadrao;
  const margem = MARGEM_VIEWBOX_GRAUS;
  const cantos = [longitude - margem, latitude + margem, longitude + margem, latitude - margem];
  return {
    q: texto.trim(),
    format: "jsonv2",
    limit: MAXIMO_RESULTADOS,
    countrycodes: "br",
    "accept-language": "pt-BR",
    viewbox: cantos.map((grau) => grau.toFixed(4)).join(","),
    // 0: o viewbox só dá preferência; "Avenida Paulista, São Paulo" continua achável.
    bounded: 0,
  };
}

/** Quanto falta, em milissegundos, para a próxima busca respeitar o intervalo mínimo. */
export function esperaParaNovaBusca(ultimaBuscaEm, agora) {
  if (ultimaBuscaEm === null) {
    return 0;
  }
  return Math.max(0, ultimaBuscaEm + INTERVALO_MINIMO_MS - agora);
}

/** "Rua São Bento, Vila Ferroviária, Araraquara, São Paulo, 14801-210", sem região e país. */
export function rotuloEndereco(nomeCompleto) {
  return nomeCompleto
    .split(", ")
    .filter((parte) => !PARTE_DISPENSAVEL.test(parte))
    .join(", ");
}

/** A mesma busca, com outras maiúsculas ou espaços, usa o resultado guardado. */
export function chaveDeCache(texto) {
  return texto.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

/** Texto vazio não vai ao Nominatim; a mensagem diz o que digitar. */
export function validarTextoEndereco(texto) {
  return texto.trim() === "" ? { erro: TEXTO_VAZIO } : { texto: texto.trim() };
}

// Estado da busca de endereços nesta página. A trava de 1 s e o cache valem
// para todos os formulários: a política do Nominatim é por quem pede.
let ultimaBuscaEm = null;
let buscando = false;
// Política de uso do Nominatim: guardar os resultados, em vez de repetir a busca.
const cache = new Map();
// Resultados mostrados agora em cada formulário, pelo prefixo dos ids.
const resultadosAtuais = new Map();

/**
 * Ids de um formulário de endereço com o prefixo `p` ("endereco" na visão
 * Buscar): #form-p, o campo #campo-p, com a ajuda em #campo-p-ajuda e o erro
 * em #campo-p-erro, e os resultados em #resultados-p, com a lista em #lista-p.
 */
function ids(prefixo) {
  return {
    formulario: `#form-${prefixo}`,
    campo: `#campo-${prefixo}`,
    ajuda: `campo-${prefixo}-ajuda`,
    erro: `campo-${prefixo}-erro`,
    resultados: `#resultados-${prefixo}`,
    lista: `#lista-${prefixo}`,
  };
}

/**
 * Liga um formulário de endereço. `aoEscolher` recebe { latitude, longitude,
 * rotulo } do endereço escolhido, direto (um resultado) ou pela lista (de 2 a 5).
 */
export function iniciarBuscaEndereco({ prefixo, centroPadrao, aoEscolher }) {
  const id = ids(prefixo);
  // Só no Enter ou no botão, sem autocompletar (especificação, 2.5).
  $(id.formulario).on("submit", function (evento) {
    evento.preventDefault();
    const validacao = validarTextoEndereco($(id.campo).val());
    if (validacao.erro) {
      mostrarErro(prefixo, validacao.erro);
      return;
    }
    if (buscando) {
      return; // o anúncio "Buscando o endereço…" já está no ar
    }
    limparErro(prefixo);
    esconderResultados(prefixo);

    const chave = chaveDeCache(validacao.texto);
    if (cache.has(chave)) {
      tratarResultados(prefixo, cache.get(chave), validacao.texto, aoEscolher);
      return;
    }

    buscando = true;
    anunciar("Buscando o endereço…");
    // Dentro do intervalo mínimo, o pedido espera o que falta em vez de ser recusado.
    setTimeout(function () {
      ultimaBuscaEm = Date.now();
      obter(URL_NOMINATIM, parametrosNominatim(validacao.texto, centroPadrao))
        .done(function (resultados) {
          cache.set(chave, resultados);
          tratarResultados(prefixo, resultados, validacao.texto, aoEscolher);
        })
        .fail(function () {
          anunciar(
            "Não foi possível buscar o endereço. Confira a conexão com a internet e tente de novo.",
          );
        })
        .always(function () {
          buscando = false;
        });
    }, esperaParaNovaBusca(ultimaBuscaEm, Date.now()));
  });

  $(id.lista).on("click", "[data-indice]", function () {
    const resultados = resultadosAtuais.get(prefixo);
    aoEscolher(converter(resultados[Number($(this).attr("data-indice"))]));
  });
}

function converter(resultado) {
  return {
    latitude: Number(resultado.lat),
    longitude: Number(resultado.lon),
    rotulo: rotuloEndereco(resultado.display_name),
  };
}

function tratarResultados(prefixo, resultados, texto, aoEscolher) {
  if (resultados.length === 0) {
    mostrarErro(
      prefixo,
      `Nenhum endereço encontrado para "${texto}". Confira a grafia ou inclua o bairro e a cidade.`,
    );
    return;
  }
  if (resultados.length === 1) {
    aoEscolher(converter(resultados[0]));
    return;
  }
  // Ambíguo: a pessoa escolhe. .text() escapa o nome, que vem de fora.
  const id = ids(prefixo);
  resultadosAtuais.set(prefixo, resultados);
  const lista = $(id.lista).empty();
  resultados.forEach(function (resultado, indice) {
    const botao = $("<button>", { type: "button", "data-indice": indice }).text(
      rotuloEndereco(resultado.display_name),
    );
    $("<li>").append(botao).appendTo(lista);
  });
  $(id.resultados).prop("hidden", false);
  anunciar(`${resultados.length} endereços encontrados. Escolha um.`);
  lista.find("button").first().trigger("focus");
}

/** Erro junto do campo, ligado a ele, anunciado e com o foco no campo (CLAUDE.md). */
function mostrarErro(prefixo, mensagem) {
  const id = ids(prefixo);
  $(`#${id.erro}`).text(mensagem).prop("hidden", false);
  $(id.campo)
    .attr({ "aria-invalid": "true", "aria-describedby": `${id.ajuda} ${id.erro}` })
    .trigger("focus");
  anunciar(mensagem);
}

function limparErro(prefixo) {
  const id = ids(prefixo);
  $(`#${id.erro}`).text("").prop("hidden", true);
  $(id.campo).removeAttr("aria-invalid").attr("aria-describedby", id.ajuda);
}

/** Esconde os endereços oferecidos no formulário `prefixo`, por exemplo depois da escolha. */
export function esconderResultados(prefixo) {
  const id = ids(prefixo);
  $(id.resultados).prop("hidden", true);
  $(id.lista).empty();
  resultadosAtuais.delete(prefixo);
}
