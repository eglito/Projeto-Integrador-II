/**
 * Mapa Leaflet com tiles do OpenStreetMap (README, decisão 03) e os marcadores
 * dos locais. A página tem um mapa só, e o estado dele fica neste módulo.
 */

const URL_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// A política de uso dos tiles exige a atribuição; o texto pode ser traduzido.
const ATRIBUICAO_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">Colaboradores do OpenStreetMap</a>';

let mapa = null;
let animar = true;
let camadaLocais = null;
// O endereço buscado, quando ele é o ponto de onde as distâncias são medidas.
let camadaReferencia = null;
// A posição da pessoa ("Você está aqui"). Camada própria, e não a do endereço:
// quando a posição chega depois de a pessoa escolher um endereço, os dois
// aparecem juntos (plano, etapa 7).
let camadaPosicao = null;
// O ponto escolhido para um local novo (plano, etapa 12), "Novo local".
let camadaNovoLocal = null;
// Zoom mínimo ao ir para um endereço ou para a pessoa: o de um bairro, como o do centro padrão.
const ZOOM_MINIMO_PONTO = 14;
// id do local -> marcador, para destacar o escolhido.
const marcadores = new Map();
let idDestacado = null;
// Quantos movimentos do próprio código (centralizar no local escolhido) ainda
// vão terminar: esses não oferecem "Buscar nesta área". É um contador, e não um
// sim ou não, porque cada setView termina num moveend, mesmo quando interrompe
// a animação do anterior; duas escolhas rápidas geram dois.
let movimentosDoCodigo = 0;
let ajustandoTamanho = false;
// O mapa está entre o movestart e o moveend (animação, arrasto, inércia). Medir
// nesse meio-tempo não adianta: a animação do Leaflet reposiciona o mapa a cada
// quadro a partir da posição que calculou no início e desfaz a correção. A
// medida fica para o moveend.
let emMovimento = false;
let medirAoParar = false;

// Espera depois da última mudança de tamanho do mapa antes de medi-lo de novo:
// girar o celular ou arrastar a borda da janela dispara dezenas de eventos.
// Precisa ser maior que a pausa do anuncio.js (PAUSA_MS, 100 ms): cada anúncio
// esvazia a faixa, o que estica o mapa, e a preenche de novo. Dentro da espera
// as duas mudanças se anulam, e a medida encontra o tamanho de antes.
const ESPERA_RESIZE_MS = 150;

/** Lido na criação do mapa: com movimento reduzido, nada de animação (CLAUDE.md). */
export function reduzirMovimento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cria o mapa no elemento `idElemento`, no centro vindo de /api/opcoes/
 * (busca.centro_padrao, README, decisão 25). Devolve o mapa do Leaflet.
 */
export function criarMapa(idElemento, centro) {
  animar = !reduzirMovimento();
  mapa = L.map(idElemento, {
    zoomControl: false, // recriado abaixo, com os títulos em português
    zoomAnimation: animar,
    fadeAnimation: animar,
    markerZoomAnimation: animar,
    inertia: animar,
    // O Leaflet mediria o mapa sozinho a cada resize da janela, com um moveend
    // atrasado que ofereceria "Buscar nesta área" sem a pessoa mover o mapa.
    // Quem mede é ajustarTamanho(), abaixo.
    trackResize: false,
  });

  if (!animar) {
    // As setas do teclado chamam panBy sem opções, e o Leaflet anima por padrão;
    // não há opção do mapa que desligue isso. Este mapa passa a deslocar sempre
    // sem animação, como uma subclasse que sobrescreve um método em Java.
    const panByOriginal = mapa.panBy;
    mapa.panBy = function (deslocamento, opcoes) {
      return panByOriginal.call(this, deslocamento, { ...opcoes, animate: false });
    };
  }

  mapa.setView([centro.latitude, centro.longitude], centro.zoom);

  // Canto superior direito, longe do painel e do menu (decisão 40). O Leaflet usa
  // o título como nome acessível; o texto visível o repete, e o sinal fica
  // escondido do leitor de tela ("Todo ícone tem rótulo textual visível").
  L.control
    .zoom({
      position: "topright",
      zoomInTitle: "Aproximar",
      zoomInText: '<span aria-hidden="true">+</span> Aproximar',
      zoomOutTitle: "Afastar",
      zoomOutText: '<span aria-hidden="true">−</span> Afastar',
    })
    .addTo(mapa);
  // O prefixo padrão traz um título em inglês; fica só o link.
  mapa.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  L.tileLayer(URL_TILES, { maxZoom: 19, attribution: ATRIBUICAO_OSM }).addTo(mapa);

  camadaLocais = L.layerGroup().addTo(mapa);
  camadaReferencia = L.layerGroup().addTo(mapa);
  camadaPosicao = L.layerGroup().addTo(mapa);
  camadaNovoLocal = L.layerGroup().addTo(mapa);
  permitirDispensarNomes($(mapa.getContainer()));

  // O tamanho do mapa muda sem ser movimento da pessoa: girar o celular, cruzar
  // 48em, mudar o zoom do navegador e a faixa de anúncios, que aparece, some e
  // muda de altura com o texto (em 320 px, de uma a quatro linhas). O resize da
  // janela só avisaria dos três primeiros; o ResizeObserver avisa qualquer
  // mudança no próprio contêiner, como um ComponentListener do AWT em Java.
  let esperaDoResize = null;
  new ResizeObserver(function () {
    clearTimeout(esperaDoResize);
    esperaDoResize = setTimeout(ajustarTamanho, ESPERA_RESIZE_MS);
  }).observe(mapa.getContainer());
  mapa.on("movestart", function () {
    emMovimento = true;
  });
  mapa.on("moveend", function () {
    emMovimento = false;
    if (medirAoParar) {
      medirAoParar = false;
      ajustarTamanho();
    }
  });
  return mapa;
}

/**
 * WCAG 1.4.13: o nome que aparece no hover ou no foco cobre parte do mapa, então
 * o Esc o esconde sem tirar o ponteiro nem o foco do lugar. Ele volta quando a
 * pessoa chega a outro marcador. O nome do marcador escolhido não é afetado: é
 * estado da seleção, e não conteúdo de hover.
 */
function permitirDispensarNomes(container) {
  $(document).on("keydown", function (evento) {
    if (evento.key === "Escape") {
      container.addClass("mapa--nomes-dispensados");
    }
  });
  container.on("focusin mouseenter", ".marcador", function () {
    container.removeClass("mapa--nomes-dispensados");
  });
}

/**
 * Conteúdo do marcador: a forma (círculo ou pino, pelo CSS) e o nome visível.
 * Montado com textContent, nunca com HTML: o nome vem de quem cadastrou o local.
 * Fica escondido do leitor de tela, que lê o nome no aria-label do marcador.
 */
function conteudoDoMarcador(nome) {
  const conteudo = document.createElement("span");
  conteudo.setAttribute("aria-hidden", "true");
  const forma = document.createElement("span");
  forma.className = "marcador__forma";
  const rotulo = document.createElement("span");
  rotulo.className = "marcador__nome";
  rotulo.textContent = nome;
  conteudo.append(forma, rotulo);
  return conteudo;
}

/**
 * Troca os marcadores pelos de `locais`, que chegam ordenados por distância.
 * O Tab percorre os marcadores na ordem em que entram no mapa, que é a mesma
 * da lista (README, decisão 30). `aoEscolher(id)` roda no clique, no Enter e
 * no Espaço.
 */
export function desenharLocais(locais, aoEscolher) {
  camadaLocais.clearLayers();
  marcadores.clear();
  idDestacado = null;

  for (const local of locais) {
    const marcador = L.marker([local.latitude, local.longitude], {
      // iconSize nulo: o tamanho de cada estado fica no CSS.
      icon: L.divIcon({ className: "marcador", html: conteudoDoMarcador(local.nome), iconSize: null }),
      keyboard: true,
      riseOnHover: true,
    });
    marcador.on("click", () => aoEscolher(local.id));
    // O Leaflet dá role="button" ao marcador, mas não o ativa pelo teclado.
    marcador.on("keydown", function (evento) {
      const tecla = evento.originalEvent.key;
      if (tecla === "Enter" || tecla === " ") {
        evento.originalEvent.preventDefault(); // o Espaço rolaria a página
        aoEscolher(local.id);
      }
    });
    marcador.addTo(camadaLocais);
    marcador.getElement().setAttribute("aria-label", local.nome);
    marcadores.set(local.id, marcador);
  }
}

/**
 * Destaque por classe no mesmo elemento. Trocar o ícone (setIcon) criaria um
 * elemento novo e tiraria o foco de quem escolheu o marcador pelo teclado.
 */
function alternarDestaque(marcador, ligado) {
  const elemento = marcador.getElement();
  elemento.classList.toggle("marcador--escolhido", ligado);
  if (ligado) {
    elemento.setAttribute("aria-current", "true");
  } else {
    elemento.removeAttribute("aria-current");
  }
  marcador.setZIndexOffset(ligado ? 1000 : 0);
}

/** Destaca o marcador do local `id`; com `centralizar`, leva o mapa até ele. */
export function destacarNoMapa(id, { centralizar = false, semAnimacao = false } = {}) {
  const anterior = marcadores.get(idDestacado);
  if (anterior) {
    alternarDestaque(anterior, false);
  }
  const marcador = marcadores.get(id);
  if (!marcador) {
    return;
  }
  alternarDestaque(marcador, true);
  idDestacado = id;

  if (centralizar) {
    movimentosDoCodigo += 1;
    // Com movimento reduzido, troca de posição sem animação (especificação, 6,
    // item 7). `semAnimacao` vale para o mapa que acaba de voltar à frente.
    mapa.setView(marcador.getLatLng(), mapa.getZoom(), { animate: animar && !semAnimacao });
  }
}

/** O local `id` tem marcador no mapa, isto é, está no resultado da busca atual. */
export function temMarcador(id) {
  return marcadores.has(id);
}

/** Leva o foco ao marcador do local `id`, por exemplo depois de escolhê-lo na lista. */
export function focarMarcador(id) {
  marcadores.get(id)?.getElement()?.focus();
}

/**
 * Leva o mapa até um ponto, como o endereço buscado ou a pessoa, sem oferecer
 * "Buscar nesta área": é movimento do código. Aproxima até o zoom de um bairro,
 * se preciso.
 */
export function centralizarEm(latitude, longitude) {
  movimentosDoCodigo += 1;
  const zoom = Math.max(mapa.getZoom(), ZOOM_MINIMO_PONTO);
  mapa.setView([latitude, longitude], zoom, { animate: animar });
}

/**
 * Marcador de um ponto que não é local, com o rótulo sempre visível. A forma
 * vem do CSS de `classe`. Não recebe foco nem clique: não há o que fazer nele,
 * e o anúncio já diz o que ele marca.
 */
function pontoFixo(latitude, longitude, classe, rotulo) {
  const conteudo = document.createElement("span");
  const forma = document.createElement("span");
  forma.className = `${classe}__forma`;
  const nome = document.createElement("span");
  nome.className = `${classe}__nome`;
  nome.textContent = rotulo;
  conteudo.append(forma, nome);
  return L.marker([latitude, longitude], {
    icon: L.divIcon({ className: classe, html: conteudo, iconSize: null }),
    interactive: false,
    keyboard: false,
    // Atrás dos locais: um local no mesmo ponto continua visível e clicável.
    zIndexOffset: -1000,
  });
}

/**
 * Marca o ponto de onde as distâncias são medidas ("Endereço buscado"): um
 * losango, diferente dos locais.
 */
export function marcarPontoDeReferencia(latitude, longitude, rotulo) {
  camadaReferencia.clearLayers();
  pontoFixo(latitude, longitude, "referencia", rotulo).addTo(camadaReferencia);
}

export function removerPontoDeReferencia() {
  camadaReferencia.clearLayers();
}

/**
 * Marca a posição da pessoa, "Você está aqui": um alvo, diferente do círculo
 * dos locais e do losango do endereço (especificação, 2.2). Fica no mapa depois
 * de "Buscar nesta área", porque marca onde a pessoa está, e não a origem da busca.
 */
export function marcarPosicao(latitude, longitude) {
  camadaPosicao.clearLayers();
  pontoFixo(latitude, longitude, "posicao", "Você está aqui").addTo(camadaPosicao);
}

/**
 * Marca o ponto escolhido para um local novo, "Novo local": um quadrado,
 * diferente do círculo e do pino dos locais, do losango do endereço e do alvo
 * de "Você está aqui" (plano, etapa 12).
 */
export function marcarNovoLocal(latitude, longitude) {
  camadaNovoLocal.clearLayers();
  pontoFixo(latitude, longitude, "novo-local", "Novo local").addTo(camadaNovoLocal);
}

export function removerNovoLocal() {
  camadaNovoLocal.clearLayers();
}

/**
 * `callback({ latitude, longitude })` roda num clique no mapa, fora dos
 * marcadores (o clique num marcador fica com ele) e dos controles (zoom e
 * Minha localização param o clique). A longitude passa por wrap(), como em
 * centroDoMapa.
 */
export function aoClicarNoMapa(callback) {
  mapa.on("click", function (evento) {
    const ponto = evento.latlng.wrap();
    callback({ latitude: ponto.lat, longitude: ponto.lng });
  });
}

/**
 * Botão "Minha localização", abaixo do zoom (especificação, 2.1). Como o zoom,
 * vem depois dos marcadores no Tab; o convite do painel vem antes deles.
 * `aoClicar` roda no clique, no Enter e no Espaço, que o <button> já atende.
 */
export function adicionarBotaoLocalizacao(aoClicar) {
  // L.Control.extend cria uma subclasse de L.Control, como um "extends" em Java;
  // onAdd é o método sobrescrito, que devolve o elemento posto no canto do mapa.
  const ControleLocalizacao = L.Control.extend({
    options: { position: "topright" },
    onAdd: function () {
      const container = $("<div>", { class: "leaflet-bar controle-localizacao" });
      $("<button>", { type: "button" })
        .append($("<span>", { "aria-hidden": "true" }).text("◎"), " Minha localização")
        .on("click", aoClicar)
        .appendTo(container);
      // Sem isso, o clique no botão também chegaria ao mapa (arrastar, duplo clique).
      L.DomEvent.disableClickPropagation(container[0]);
      return container[0];
    },
  });
  new ControleLocalizacao().addTo(mapa);
}

/**
 * Faz o Leaflet medir de novo o mapa, que mudou de tamanho (criarMapa) ou
 * esteve escondido (tela estreita, Lista na frente; layout.js, mostrarTela).
 * O moveend que isso dispara não é movimento da pessoa.
 */
export function ajustarTamanho() {
  // Escondido (tela estreita, Lista na frente), o mapa mediria zero e perderia o
  // centro. Ele é medido quando volta para a frente (layout.js, mostrarTela).
  if (!mapa.getContainer().offsetWidth) {
    return;
  }
  // Em movimento, a medida fica para o moveend (criarMapa). O invalidateSize
  // põe no centro do mapa medido o ponto que o Leaflet tinha como centro, então
  // o destino do movimento termina no centro do que se vê.
  if (emMovimento) {
    medirAoParar = true;
    return;
  }
  ajustandoTamanho = true;
  mapa.invalidateSize();
  ajustandoTamanho = false;
}

/**
 * `callback` roda quando a pessoa termina de mover ou de aproximar o mapa
 * (evento moveend do Leaflet). Os movimentos do próprio código não contam.
 */
export function aoMoverPelaPessoa(callback) {
  mapa.on("moveend", function () {
    // O invalidateSize dispara o moveend na hora, durante ajustarTamanho().
    if (ajustandoTamanho) {
      return;
    }
    if (movimentosDoCodigo > 0) {
      movimentosDoCodigo -= 1;
      return;
    }
    callback();
  });
}

/**
 * Centro da área visível, nos nomes que a API usa. O wrap() traz a longitude
 * de volta para -180 a 180 quando a pessoa arrasta o mapa além do meridiano
 * 180; a API recusaria o valor fora dessa faixa (Docs/API.md, 5.3).
 */
export function centroDoMapa() {
  const centro = mapa.getCenter().wrap();
  return { latitude: centro.lat, longitude: centro.lng };
}

/** Distância, em metros, do centro ao canto da área visível. */
export function distanciaAoCanto() {
  return mapa.getCenter().distanceTo(mapa.getBounds().getNorthEast());
}
