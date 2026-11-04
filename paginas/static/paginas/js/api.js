/**
 * Acesso à API REST (Docs/API.md), sempre por jQuery.ajax.
 *
 * Sessão + CSRF (README, decisão 11): o cookie csrftoken muda no login e no
 * cadastro, então é lido a cada requisição, nunca guardado numa variável.
 */

const METODOS_SEGUROS = ["GET", "HEAD", "OPTIONS", "TRACE"];

/**
 * Valor de um cookie, ou null se ele não existir.
 * `cookies` é o texto de document.cookie; vira parâmetro para o teste.
 */
export function lerCookie(nome, cookies = document.cookie) {
  for (const par of cookies.split(";")) {
    const [chave, ...valor] = par.trim().split("=");
    if (chave === nome) {
      return decodeURIComponent(valor.join("="));
    }
  }
  return null;
}

/**
 * O cabeçalho X-CSRFToken só vai para a nossa API, e só em métodos que alteram
 * dados. A URL assinada do envio de foto se autoriza pela assinatura e não
 * recebe o token (Docs/API.md, 6.3).
 */
export function precisaCsrf(metodo, url) {
  return !METODOS_SEGUROS.includes(metodo.toUpperCase()) && url.startsWith("/api/");
}

/**
 * Nas rotas do Django, sem a barra final o POST responde 500 (HANDOFF, bug 1).
 * Falha já no desenvolvimento, dizendo como corrigir. URLs de outros servidores
 * (Cloud Storage na Fase 5, Nominatim) seguem as regras deles e passam direto.
 * Devolve a própria URL.
 */
export function exigirBarraFinal(url) {
  if (!url.startsWith("/")) {
    return url;
  }
  const caminho = url.split("?")[0];
  if (!caminho.endsWith("/")) {
    throw new Error(`URL sem a barra final: ${url}. Use ${caminho}/`);
  }
  return url;
}

function requisitar(metodo, url, opcoes) {
  const cabecalhos = {};
  const token = lerCookie("csrftoken");
  if (precisaCsrf(metodo, url) && token) {
    cabecalhos["X-CSRFToken"] = token;
  }
  return $.ajax({
    url: exigirBarraFinal(url),
    method: metodo,
    headers: cabecalhos,
    dataType: "json",
    ...opcoes,
  });
}

/** GET, com `parametros` na query string. Devolve o jqXHR, a promessa do jQuery. */
export function obter(url, parametros) {
  return requisitar("GET", url, { data: parametros });
}

/** POST, PUT ou PATCH, com `dados` em JSON no corpo. */
export function enviar(metodo, url, dados) {
  return requisitar(metodo, url, {
    contentType: "application/json",
    data: JSON.stringify(dados),
  });
}
