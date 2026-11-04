/**
 * Geolocalização (especificação, 2.2). A Permissions API decide o caminho na
 * abertura, sem perguntar nada; o navegador só pede a permissão no clique em
 * "Minha localização" ou "Usar minha localização". A posição só sai do
 * navegador como parâmetro de GET /api/locais/ e não é gravada.
 *
 * As funções puras do início são testadas no QUnit (decisão 35). As demais
 * pedem a posição ao navegador e cuidam do convite no painel.
 */

import { anunciar } from "./anuncio.js";

// Do plano (etapa 7): sem posição em 10 s, a página desiste e explica. O
// navegador só começa a contar depois de a pessoa responder ao pedido de permissão.
const TEMPO_MAXIMO_MS = 10000;

// Decisão de projeto: uma posição de até 1 minuto ainda serve para achar locais
// a 2 km, e um segundo clique em "Minha localização" responde na hora.
const IDADE_MAXIMA_MS = 60000;

// Decisão de projeto: sem alta precisão. A do Wi-Fi basta para um raio de 2 km,
// chega mais rápido e gasta menos bateria que o GPS.
const ALTA_PRECISAO = false;

// Códigos do GeolocationPositionError, definidos pelo W3C.
const MOTIVOS_POR_CODIGO = { 1: "negada", 2: "indisponivel", 3: "tempo" };

// O que aconteceu, como mudar e a alternativa, a busca por endereço (especificação, 2.2).
// "bloqueada" é a negada que a página já encontra na abertura, sem a pessoa ter pedido.
const MENSAGENS = {
  bloqueada:
    "A localização está bloqueada para este site. Para ver os locais perto de você, libere a localização no navegador, no ícone ao lado do endereço da página, e use Minha localização. Ou busque por endereço.",
  negada:
    "A localização não foi permitida, e o mapa continua onde estava. Para usá-la, libere a localização deste site no navegador, no ícone ao lado do endereço da página, e use Minha localização de novo. Ou busque por endereço.",
  indisponivel:
    "Não foi possível descobrir sua localização, e o mapa continua onde estava. Confira se a localização do aparelho está ligada e use Minha localização de novo. Ou busque por endereço.",
  tempo: `A localização demorou mais de ${TEMPO_MAXIMO_MS / 1000} segundos, e o mapa continua onde estava. Use Minha localização para tentar de novo. Ou busque por endereço.`,
  sem_suporte:
    "Este navegador não oferece a localização nesta página, que só funciona em conexão segura (https). Busque por endereço para ver os locais perto de um ponto.",
};

const CONVITE =
  "Para ver primeiro os locais perto de você, use sua localização. Ela só serve para a busca e não é gravada.";

/**
 * O que fazer na abertura, pelo estado da permissão: "localizar" sem perguntar,
 * "convidar" a pessoa ou "explicar" que foi negada. Navegador sem Permissions
 * API conta como "prompt": convida, e o pedido fica para o clique.
 */
export function caminhoPelaPermissao(estado) {
  if (estado === "granted") {
    return "localizar";
  }
  if (estado === "denied") {
    return "explicar";
  }
  return "convidar";
}

/** Motivo da falha pelo código do erro do navegador; um código desconhecido conta como indisponível. */
export function motivoDoErro(codigo) {
  return MOTIVOS_POR_CODIGO[codigo] ?? "indisponivel";
}

/** Mensagem que diz o que aconteceu e o que fazer (CLAUDE.md, Acessibilidade). */
export function mensagemDeFalha(motivo) {
  return MENSAGENS[motivo];
}

/** Sem suporte, tentar de novo não adianta; nos outros casos, pode adiantar. */
export function podeTentarDeNovo(motivo) {
  return motivo !== "sem_suporte";
}

// Um pedido de cada vez: cliques durante a espera não abrem outro.
let localizando = false;

/** Navegador com geolocalização e página em contexto seguro (https ou localhost). */
function suportada() {
  return window.isSecureContext && "geolocation" in navigator;
}

/**
 * Estado da permissão, sem perguntar nada à pessoa. A Permissions API devolve
 * uma Promise, como um CompletableFuture; o then equivale ao thenApply. Se ela
 * faltar ou recusar o nome "geolocation", vale "prompt".
 */
function consultarPermissao() {
  if (!navigator.permissions) {
    return Promise.resolve("prompt");
  }
  return navigator.permissions.query({ name: "geolocation" }).then(
    (status) => status.state,
    () => "prompt",
  );
}

/**
 * Pede a posição ao navegador. A Geolocation API responde por dois callbacks,
 * um de sucesso e um de erro; a Promise junta os dois num resultado só, como um
 * CompletableFuture completado pelo listener (complete e completeExceptionally).
 * Uma posição só, e não watchPosition: a página não acompanha a pessoa.
 */
function pedirPosicao() {
  return new Promise(function (resolver, rejeitar) {
    navigator.geolocation.getCurrentPosition(
      (posicao) =>
        resolver({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude }),
      (erro) => rejeitar(motivoDoErro(erro.code)),
      { timeout: TEMPO_MAXIMO_MS, maximumAge: IDADE_MAXIMA_MS, enableHighAccuracy: ALTA_PRECISAO },
    );
  });
}

/**
 * Liga os botões do convite. `aoPedir` roda em "Usar minha localização";
 * `aoIrParaEndereco(botao)`, em "Buscar por endereço".
 */
export function iniciarLocalizacao({ aoPedir, aoIrParaEndereco }) {
  $("#usar-localizacao").on("click", aoPedir);
  $("#ir-para-endereco").on("click", function () {
    aoIrParaEndereco(this);
  });
}

/**
 * Abertura da página: mostra o convite ou a explicação pelo estado da
 * permissão, sem nunca perguntar (o Lighthouse aponta o pedido no carregamento
 * como má prática). Devolve uma Promise com true quando a permissão já foi
 * dada: aí a página localiza a pessoa sozinha.
 */
export function verificarPermissao() {
  if (!suportada()) {
    mostrarFalha("sem_suporte", { anunciarFalha: false });
    return Promise.resolve(false);
  }
  return consultarPermissao().then(function (estado) {
    const caminho = caminhoPelaPermissao(estado);
    if (caminho === "convidar") {
      mostrarConvite();
    } else if (caminho === "explicar") {
      // Visível no painel, sem anúncio: a pessoa não pediu nada, e o anúncio
      // dos resultados continua na faixa.
      mostrarFalha("bloqueada", { anunciarFalha: false });
    }
    return caminho === "localizar";
  });
}

/**
 * Pede a posição. Devolve uma Promise que nunca falha: resolve com
 * { latitude, longitude }, ou com null quando não deu certo (a falha já foi
 * explicada no anúncio e no painel) ou quando já havia um pedido em curso.
 * `automatico`: a permissão já tinha sido dada e ninguém clicou, então não há
 * "Buscando…" a anunciar.
 */
export function localizar({ automatico = false } = {}) {
  if (!suportada()) {
    mostrarFalha("sem_suporte");
    return Promise.resolve(null);
  }
  if (localizando) {
    return Promise.resolve(null);
  }
  localizando = true;
  if (!automatico) {
    anunciar("Buscando sua localização…");
  }
  return pedirPosicao()
    .then(
      function (posicao) {
        esconderConvite();
        return posicao;
      },
      function (motivo) {
        mostrarFalha(motivo);
        return null;
      },
    )
    .finally(function () {
      localizando = false;
    });
}

function mostrarConvite() {
  $("#convite-localizacao-texto").text(CONVITE);
  $("#usar-localizacao").prop("hidden", false);
  $("#ir-para-endereco").prop("hidden", true);
  $("#convite-localizacao").prop("hidden", false);
}

/** A explicação fica no painel e, quando a pessoa pediu, também na faixa de anúncios. */
function mostrarFalha(motivo, { anunciarFalha = true } = {}) {
  const mensagem = mensagemDeFalha(motivo);
  $("#convite-localizacao-texto").text(mensagem);
  $("#usar-localizacao").prop("hidden", !podeTentarDeNovo(motivo));
  $("#ir-para-endereco").prop("hidden", false);
  $("#convite-localizacao").prop("hidden", false);
  if (anunciarFalha) {
    anunciar(mensagem);
  }
}

/** Com a posição em mãos, o convite some; se o foco estava nele, vai para o título da lista. */
function esconderConvite() {
  const convite = $("#convite-localizacao");
  if ($.contains(convite[0], document.activeElement)) {
    $("#titulo-lista").trigger("focus");
  }
  convite.prop("hidden", true);
}
