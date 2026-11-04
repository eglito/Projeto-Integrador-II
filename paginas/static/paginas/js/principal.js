/**
 * Abertura da página (Docs/API.md, 6.1) e a ligação entre mapa, lista e busca.
 *
 * Como módulo, este arquivo roda depois de o HTML ser lido (como um script
 * com defer): o DOM já existe, sem precisar de $(document).ready.
 */

import { obter } from "./api.js";
import { anunciar } from "./anuncio.js";
import {
  esconderBuscaNaArea,
  iniciarBuscaNaArea,
  iniciarFiltros,
  marcarRaio,
  oferecerBuscaNaArea,
  parametrosDaBusca,
  raioDaArea,
} from "./busca.js";
import {
  descricaoFiltros,
  resumoBusca,
  textoDistancia,
  textoFiltrosAtivos,
} from "./formatacao.js";
import { iniciarLayout, listaVisivel, mostrarTela, mostrarVisao, telaEstreita } from "./layout.js";
import { iniciarLista, marcarNaLista, mostrarLista } from "./lista.js";
import {
  ajustarTamanho,
  aoMoverPelaPessoa,
  centroDoMapa,
  criarMapa,
  desenharLocais,
  destacarNoMapa,
  distanciaAoCanto,
  focarMarcador,
} from "./mapa.js";

let opcoes = null;
/**
 * Estado da busca: ponto, origem da distância, raio e filtros. Cada ação muda
 * uma parte dele e repete a mesma chamada, que alimenta mapa e lista juntos.
 * O ponto só muda com "Buscar nesta área": escolher um local na lista move o
 * mapa, mas não muda de onde as distâncias são medidas.
 */
let busca = null;
let locaisAtuais = [];

// Grava o cookie csrftoken. O estado da sessão ganha interface na etapa 9.
obter("/api/auth/sessao/");

obter("/api/opcoes/")
  .done(function (resposta) {
    opcoes = resposta;
    const centro = opcoes.busca.centro_padrao;
    criarMapa("mapa", centro);
    iniciarLayout({ aoMostrarMapa: ajustarTamanho });
    iniciarLista({ aoEscolher: escolherNaLista, aoAmpliar: ampliarRaio });
    iniciarFiltros({
      tiposEquipamento: opcoes.tipos_equipamento,
      raioPadrao: opcoes.busca.raio_padrao_m,
      raioMaximo: opcoes.busca.raio_maximo_m,
      aoAplicar: aplicarFiltros,
    });
    iniciarBuscaNaArea({ aoBuscar: buscarNaArea });
    aoMoverPelaPessoa(oferecerBuscaNaArea);
    // Sem a posição da pessoa, a busca parte do centro do mapa (decisão 31).
    buscar({
      latitude: centro.latitude,
      longitude: centro.longitude,
      origem: "centro",
      raio: opcoes.busca.raio_padrao_m,
      raioDaArea: false,
      tipo: "",
      alturaMaxima: null,
      limitado: false,
    });
  })
  .fail(function () {
    anunciar(
      "Não foi possível carregar o mapa. Confira a conexão com a internet e recarregue a página.",
    );
  });

/**
 * Uma chamada alimenta o mapa e a lista (especificação, 2.3). Devolve o jqXHR.
 * O estado só muda se a busca der certo: numa falha, mapa, lista e estado
 * continuam descrevendo a mesma busca anterior.
 */
function buscar(novaBusca) {
  return obter("/api/locais/", parametrosDaBusca(novaBusca))
    .done(function (locais) {
      busca = novaBusca;
      locaisAtuais = locais;
      desenharLocais(locais, escolherNoMapa);
      mostrarLista(locais, {
        tiposEquipamento: opcoes.tipos_equipamento,
        origem: busca.origem,
        raio: busca.raio,
        raioMaximo: opcoes.busca.raio_maximo_m,
      });
      // No topo da lista, quais filtros estão valendo.
      $("#resumo-filtros").text(
        textoFiltrosAtivos(rotuloDoTipo(busca.tipo), busca.alturaMaxima, busca.raio, busca.raioDaArea),
      );
      anunciar(
        resumoBusca(locais.length, {
          raio: busca.raio,
          raioMaximo: opcoes.busca.raio_maximo_m,
          origem: busca.origem,
          filtros: descricaoFiltros(rotuloDoTipo(busca.tipo), busca.alturaMaxima),
          limitado: busca.limitado,
        }),
      );
    })
    .fail(function (resposta) {
      if (resposta.status === 400) {
        // A API diz como corrigir (Docs/API.md, seção 3); a primeira mensagem basta.
        const mensagens = Object.values(resposta.responseJSON).flat();
        anunciar(`Não foi possível buscar: ${mensagens[0]}`);
        return;
      }
      anunciar(
        "Não foi possível buscar os locais. Confira a conexão com a internet e recarregue a página.",
      );
    });
}

function rotuloDoTipo(valor) {
  return opcoes.tipos_equipamento.find((tipo) => tipo.valor === valor)?.rotulo ?? null;
}

/**
 * Filtros aplicados na visão Buscar: mesmo ponto, novos filtros e raio. Com a
 * busca feita, o painel volta para a lista, com o foco no título (decisão 40).
 */
function aplicarFiltros({ tipo, alturaMaxima, raio }) {
  // O raio da área visível e o aviso de corte continuam valendo enquanto ele não mudar.
  const mesmoRaio = raio === busca.raio;
  const raioDaAreaAtual = mesmoRaio && busca.raioDaArea;
  const limitado = mesmoRaio && busca.limitado;
  buscar({ ...busca, tipo, alturaMaxima, raio, raioDaArea: raioDaAreaAtual, limitado }).done(
    function () {
      mostrarVisao("lista");
    },
  );
}

/** Depois de uma busca, o foco vai ao resultado: o título da lista, ou o mapa se ele está na frente. */
function focarResultado() {
  $(listaVisivel() ? "#titulo-lista" : "#mapa").trigger("focus");
}

/** "Buscar nesta área": o ponto vira o centro do mapa, e o raio cobre a área visível. */
function buscarNaArea() {
  const { raio, limitado } = raioDaArea(distanciaAoCanto(), opcoes.busca.raio_maximo_m);
  const novaBusca = { ...busca, ...centroDoMapa(), origem: "centro", raio, raioDaArea: true, limitado };
  buscar(novaBusca).done(function () {
    marcarRaio(raio, { daArea: true });
    // O botão some, e o foco vai para o resultado, sem se perder. Se a busca
    // falhar, nada disso acontece: botão e foco ficam para nova tentativa.
    esconderBuscaNaArea();
    focarResultado();
  });
}

/** "Buscar até 10 km", oferecido quando a busca não acha nada. */
function ampliarRaio() {
  const raioMaximo = opcoes.busca.raio_maximo_m;
  // O botão some com a lista nova; o foco vai para o título da lista, e não se perde.
  buscar({ ...busca, raio: raioMaximo, raioDaArea: false, limitado: false }).done(function () {
    marcarRaio(raioMaximo);
    focarResultado();
  });
}

function localPorId(id) {
  return locaisAtuais.find((local) => local.id === id);
}

/**
 * Escolha feita na lista: o mapa vai até o local. Em tela larga, o foco fica
 * na lista. Em tela estreita, o Mapa vem para a frente e o foco vai para o
 * marcador, porque centralizar um mapa escondido não teria efeito (decisão 40).
 */
function escolherNaLista(id) {
  marcarNaLista(id);
  if (telaEstreita()) {
    mostrarTela("mapa");
    // O mapa acabou de aparecer: sem animação, e o foco já encontra o marcador no lugar.
    destacarNoMapa(id, { centralizar: true, semAnimacao: true });
    focarMarcador(id);
  } else {
    destacarNoMapa(id, { centralizar: true });
  }
  anunciar(`${localPorId(id).nome} destacado no mapa.`);
}

/** Escolha feita no marcador: a lista mostra o item, e o foco fica no marcador. */
function escolherNoMapa(id) {
  const local = localPorId(id);
  destacarNoMapa(id);
  marcarNaLista(id, { rolar: true });
  anunciar(`${local.nome}, ${textoDistancia(local.distancia_m, busca.origem)}. Destacado na lista.`);
}
