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
// id do local -> marcador, para destacar o escolhido.
const marcadores = new Map();
let idDestacado = null;

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

  // O Leaflet usa o título também como nome acessível (aria-label) do botão.
  L.control.zoom({ zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" }).addTo(mapa);
  // O prefixo padrão traz um título em inglês; fica só o link.
  mapa.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  L.tileLayer(URL_TILES, { maxZoom: 19, attribution: ATRIBUICAO_OSM }).addTo(mapa);

  camadaLocais = L.layerGroup().addTo(mapa);
  permitirDispensarNomes($(mapa.getContainer()));
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
export function destacarNoMapa(id, { centralizar = false } = {}) {
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
    // Com movimento reduzido, troca de posição sem animação (especificação, 6, item 7).
    mapa.setView(marcador.getLatLng(), mapa.getZoom(), { animate: animar });
  }
}
