/**
 * Abertura da página (Docs/API.md, 6.1) e a ligação entre mapa e lista.
 *
 * Como módulo, este arquivo roda depois de o HTML ser lido (como um script
 * com defer): o DOM já existe, sem precisar de $(document).ready.
 */

import { obter } from "./api.js";
import { anunciar } from "./anuncio.js";
import { resumoBusca, textoDistancia } from "./formatacao.js";
import { iniciarLista, marcarNaLista, mostrarLista } from "./lista.js";
import { criarMapa, desenharLocais, destacarNoMapa } from "./mapa.js";

let opcoes = null;
// Última busca e seu resultado: o raio pode ser ampliado e o local escolhido é
// procurado pelo id.
let buscaAtual = null;
let locaisAtuais = [];

// Grava o cookie csrftoken. O estado da sessão ganha interface na etapa 9.
obter("/api/auth/sessao/");

obter("/api/opcoes/")
  .done(function (resposta) {
    opcoes = resposta;
    const centro = opcoes.busca.centro_padrao;
    criarMapa("mapa", centro);
    iniciarLista({ aoEscolher: escolherNaLista, aoAmpliar: ampliarRaio });
    // Sem a posição da pessoa, a busca parte do centro do mapa (decisão 31).
    buscar(
      { latitude: centro.latitude, longitude: centro.longitude, raio: opcoes.busca.raio_padrao_m },
      "centro",
    );
  })
  .fail(function () {
    anunciar(
      "Não foi possível carregar o mapa. Confira a conexão com a internet e recarregue a página.",
    );
  });

/** Uma chamada alimenta o mapa e a lista (especificação, 2.3). Devolve o jqXHR. */
function buscar(parametros, origem) {
  buscaAtual = { parametros, origem };
  return obter("/api/locais/", parametros)
    .done(function (locais) {
      locaisAtuais = locais;
      desenharLocais(locais, escolherNoMapa);
      mostrarLista(locais, {
        tiposEquipamento: opcoes.tipos_equipamento,
        origem,
        raio: parametros.raio,
        raioMaximo: opcoes.busca.raio_maximo_m,
      });
      anunciar(resumoBusca(locais.length, parametros.raio, origem, opcoes.busca.raio_maximo_m));
    })
    .fail(function () {
      anunciar(
        "Não foi possível buscar os locais. Confira a conexão com a internet e recarregue a página.",
      );
    });
}

/** "Buscar até 10 km", oferecido quando a busca não acha nada. */
function ampliarRaio() {
  const parametros = { ...buscaAtual.parametros, raio: opcoes.busca.raio_maximo_m };
  // O botão some com a lista nova; o foco vai para o título da lista, e não se perde.
  buscar(parametros, buscaAtual.origem).done(function () {
    $("#titulo-lista").trigger("focus");
  });
}

function localPorId(id) {
  return locaisAtuais.find((local) => local.id === id);
}

/** Escolha feita na lista: o mapa vai até o local, e o foco fica na lista. */
function escolherNaLista(id) {
  destacarNoMapa(id, { centralizar: true });
  marcarNaLista(id);
  anunciar(`${localPorId(id).nome} destacado no mapa.`);
}

/** Escolha feita no marcador: a lista mostra o item, e o foco fica no marcador. */
function escolherNoMapa(id) {
  const local = localPorId(id);
  destacarNoMapa(id);
  marcarNaLista(id, { rolar: true });
  anunciar(`${local.nome}, ${textoDistancia(local.distancia_m, buscaAtual.origem)}. Destacado na lista.`);
}
