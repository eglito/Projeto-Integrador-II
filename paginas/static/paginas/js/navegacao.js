/**
 * A URL guarda só o local aberto, ?local=id (README, decisão 33), pela History
 * API. Abrir e fechar os detalhes criam entradas no histórico sem recarregar a
 * página: o Voltar do navegador fecha o painel, e o link direto abre o local.
 *
 * pushState muda a URL sem ir ao servidor, ao contrário do Spring MVC, em que
 * cada URL é uma requisição; o evento popstate avisa do Voltar e do Avançar.
 * As funções puras do início são testadas no QUnit (decisão 35).
 */

const PARAMETRO = "local";

/**
 * Local da query: o id (inteiro maior que zero), null sem o parâmetro, ou
 * "invalido" para qualquer outro valor ("abc", "0", "-3", "7.5", vazio).
 * URLSearchParams lê a query como o UriComponentsBuilder do Spring.
 */
export function idDaUrl(query) {
  const valor = new URLSearchParams(query).get(PARAMETRO);
  if (valor === null) {
    return null;
  }
  return /^[1-9]\d*$/.test(valor) ? Number(valor) : "invalido";
}

/** A mesma URL com ?local=id, ou sem o parâmetro quando `id` é null. Relativa à origem. */
export function urlComLocal(href, id) {
  const url = new URL(href);
  if (id === null) {
    url.searchParams.delete(PARAMETRO);
  } else {
    url.searchParams.set(PARAMETRO, id);
  }
  return url.pathname + url.search + url.hash;
}

// O que a URL diz agora: o id, "invalido" ou null.
let localNaUrl = null;

/**
 * Liga o Voltar e o Avançar do navegador: `aoNavegar(id)` recebe o local da URL
 * nova (id, "invalido" ou null). Devolve o local da URL de abertura.
 */
export function iniciarNavegacao({ aoNavegar }) {
  localNaUrl = idDaUrl(window.location.search);
  $(window).on("popstate", function () {
    // O navegador já mudou a URL: só o estado acompanha, sem nova entrada.
    localNaUrl = idDaUrl(window.location.search);
    aoNavegar(localNaUrl);
  });
  return localNaUrl;
}

/**
 * A tela passou a mostrar o local `id` (ou nenhum, com null). Só cria uma
 * entrada no histórico quando a URL ainda não diz isso: assim, o que o popstate
 * abre ou fecha não entra no histórico de novo.
 */
export function registrarLocal(id) {
  if (id === localNaUrl) {
    return;
  }
  localNaUrl = id;
  window.history.pushState(null, "", urlComLocal(window.location.href, id));
}
