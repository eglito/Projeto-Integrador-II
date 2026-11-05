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
import { esconderResultados as esconderEnderecos, iniciarBuscaEndereco } from "./endereco.js";
import {
  descricaoFiltros,
  resumoBusca,
  textoDistancia,
  textoFiltrosAtivos,
} from "./formatacao.js";
import { iniciarLayout, listaVisivel, mostrarTela, mostrarVisao, telaEstreita } from "./layout.js";
import { iniciarLista, marcarNaLista, mostrarLista } from "./lista.js";
import { iniciarLocalizacao, localizar, verificarPermissao } from "./localizacao.js";
import {
  adicionarBotaoLocalizacao,
  ajustarTamanho,
  aoMoverPelaPessoa,
  centralizarEm,
  centroDoMapa,
  criarMapa,
  desenharLocais,
  destacarNoMapa,
  distanciaAoCanto,
  focarMarcador,
  marcarPontoDeReferencia,
  marcarPosicao,
  removerPontoDeReferencia,
} from "./mapa.js";

let opcoes = null;
/**
 * Estado da busca: ponto, origem da distância, raio e filtros. Cada ação muda
 * uma parte dele e repete a mesma chamada, que alimenta mapa e lista juntos.
 * O ponto só muda com "Buscar nesta área", com a escolha de um endereço e com
 * a posição da pessoa: escolher um local na lista move o mapa, mas não muda de
 * onde as distâncias são medidas.
 */
let busca = null;
let locaisAtuais = [];
/**
 * Sobe a cada escolha da pessoa sobre o que o mapa mostra: mover o mapa,
 * escolher um endereço ou um local da lista. A posição que chega depois de uma
 * dessas escolhas não tira a vista do lugar (plano, etapa 7). É a ideia do
 * @Version do JPA: quem guardou um número antigo sabe que alguém mexeu depois.
 */
let geracaoDaVista = 0;

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
    iniciarBuscaEndereco({ centroPadrao: centro, aoEscolher: escolherEndereco });
    iniciarLocalizacao({ aoPedir: () => pedirLocalizacao(), aoIrParaEndereco: irParaEndereco });
    aoMoverPelaPessoa(function () {
      geracaoDaVista += 1;
      oferecerBuscaNaArea();
    });
    // A localização automática vale a partir da abertura: se a pessoa mexer no
    // mapa durante a primeira busca, a vista dela também fica onde está.
    const geracaoNaAbertura = geracaoDaVista;
    // Sem a posição da pessoa, a busca parte do centro do mapa (decisão 31).
    buscar({
      latitude: centro.latitude,
      longitude: centro.longitude,
      origem: "centro",
      endereco: null,
      raio: opcoes.busca.raio_padrao_m,
      raioDaArea: false,
      tipo: "",
      alturaMaxima: null,
      limitado: false,
    }).done(function () {
      // A localização só entra depois da primeira busca: as duas juntas poderiam
      // terminar fora de ordem, e a do centro apagaria a de "você". Se a primeira
      // busca falhar, a API está fora do ar, a posição não ajudaria, e o botão
      // "Minha localização" nem aparece.
      adicionarBotaoLocalizacao(() => pedirLocalizacao());
      verificarPermissao().then(function (concedida) {
        if (concedida) {
          pedirLocalizacao({ automatico: true, geracao: geracaoNaAbertura });
        }
      });
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
      // O endereço só aparece enquanto ele é o ponto de onde as distâncias são medidas.
      const endereco = busca.origem === "endereco" ? busca.endereco : null;
      // No topo da lista, quais filtros estão valendo.
      $("#resumo-filtros").text(
        textoFiltrosAtivos(
          rotuloDoTipo(busca.tipo),
          busca.alturaMaxima,
          busca.raio,
          busca.raioDaArea,
          endereco,
        ),
      );
      const resumo = resumoBusca(locais.length, {
        raio: busca.raio,
        raioMaximo: opcoes.busca.raio_maximo_m,
        origem: busca.origem,
        filtros: descricaoFiltros(rotuloDoTipo(busca.tipo), busca.alturaMaxima),
        limitado: busca.limitado,
      });
      anunciar(endereco ? `Endereço: ${endereco}. ${resumo}` : resumo);
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
  const novaBusca = {
    ...busca,
    ...centroDoMapa(),
    origem: "centro",
    endereco: null,
    raio,
    raioDaArea: true,
    limitado,
  };
  buscar(novaBusca).done(function () {
    marcarRaio(raio, { daArea: true });
    // As distâncias voltam a sair do centro do mapa, e não do endereço buscado.
    removerPontoDeReferencia();
    // O botão some, e o foco vai para o resultado, sem se perder. Se a busca
    // falhar, nada disso acontece: botão e foco ficam para nova tentativa.
    esconderBuscaNaArea();
    focarResultado();
  });
}

/**
 * Novo ponto de partida, o endereço escolhido ou a posição da pessoa: as
 * distâncias passam a sair dele (decisão 31). Raio e filtros continuam; o raio
 * da área visível, que valia para outra área, volta ao padrão. Com a busca
 * feita, o mapa vai até o ponto, a não ser que a pessoa o tenha movido durante
 * a busca. Devolve o jqXHR, para quem chama completar.
 */
function buscarAPartirDe({ latitude, longitude, origem, endereco }) {
  const geracao = geracaoDaVista;
  const raio = busca.raioDaArea ? opcoes.busca.raio_padrao_m : busca.raio;
  const novaBusca = {
    ...busca,
    latitude,
    longitude,
    origem,
    endereco,
    raio,
    raioDaArea: false,
    limitado: false,
  };
  return buscar(novaBusca).done(function () {
    marcarRaio(raio);
    // A pessoa moveu o mapa enquanto a busca não voltava: a vista fica onde ela
    // deixou, com o "Buscar nesta área" que o movimento ofereceu (plano, etapa 7).
    if (geracao !== geracaoDaVista) {
      return;
    }
    // O mapa sai de onde a pessoa o deixou: "Buscar nesta área" ofereceria a área
    // antiga e trocaria o ponto pelo centro do mapa sem ela ter mexido nele.
    esconderBuscaNaArea();
    centralizarEm(latitude, longitude);
  });
}

/**
 * Endereço escolhido na visão Buscar: ele vira o ponto da busca, com a
 * distância "do endereço buscado", e ganha o marcador. O painel volta para a
 * lista, como nos filtros (decisão 40).
 */
function escolherEndereco({ latitude, longitude, rotulo }) {
  geracaoDaVista += 1;
  buscarAPartirDe({ latitude, longitude, origem: "endereco", endereco: rotulo }).done(function () {
    esconderEnderecos();
    marcarPontoDeReferencia(latitude, longitude, "Endereço buscado");
    mostrarVisao("lista");
  });
}

/**
 * Pede a posição da pessoa, pelo clique ou, com a permissão já dada, na
 * abertura (`automatico`). Com ela, o mapa vai até a pessoa e a busca mede
 * "de você". Se a pessoa mudou o mapa enquanto a posição não chegava, a vista
 * dela fica onde está: só o marcador "Você está aqui" aparece (plano, etapa 7).
 * `geracao` é o contador de quando o pedido começou: no clique, agora; na
 * abertura, antes da primeira busca.
 */
function pedirLocalizacao({ automatico = false, geracao = geracaoDaVista } = {}) {
  localizar({ automatico }).then(function (posicao) {
    // null: a falha já foi explicada, ou já havia um pedido em curso.
    if (!posicao) {
      return;
    }
    marcarPosicao(posicao.latitude, posicao.longitude);
    if (geracao !== geracaoDaVista) {
      anunciar(
        "Sua localização está marcada no mapa como Você está aqui. Como você mudou o mapa enquanto ela chegava, mapa e lista ficaram onde estavam. Para buscar perto de você, use Minha localização.",
      );
      return;
    }
    buscarAPartirDe({ ...posicao, origem: "voce", endereco: null }).done(function () {
      // As distâncias passam a sair da pessoa, e não do endereço buscado.
      removerPontoDeReferencia();
    });
  });
}

/** "Buscar por endereço", oferecido quando a localização não deu certo: o foco vai para o campo. */
function irParaEndereco(botao) {
  mostrarVisao("buscar", { focar: false, origem: botao });
  $("#campo-endereco").trigger("focus");
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
  geracaoDaVista += 1;
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
