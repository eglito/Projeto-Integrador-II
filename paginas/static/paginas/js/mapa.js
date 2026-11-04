/**
 * Mapa Leaflet com tiles do OpenStreetMap (README, decisão 03).
 */

const URL_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// A política de uso dos tiles exige a atribuição; o texto pode ser traduzido.
const ATRIBUICAO_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">Colaboradores do OpenStreetMap</a>';

/** Lido na criação do mapa: com movimento reduzido, nada de animação (CLAUDE.md). */
export function reduzirMovimento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cria o mapa no elemento `idElemento`, no centro vindo de /api/opcoes/
 * (busca.centro_padrao, README, decisão 25). Devolve o mapa do Leaflet.
 */
export function criarMapa(idElemento, centro) {
  const animar = !reduzirMovimento();
  const mapa = L.map(idElemento, {
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

  return mapa;
}
