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
  acompanharResultado,
  erroDeDetalhes,
  focarContribuicao,
  iniciarDetalhes,
  mostrarCarregando,
  mostrarDetalhes,
  mostrarErroDeDetalhes,
} from "./detalhes.js";
import { esconderResultados as esconderEnderecos, iniciarBuscaEndereco } from "./endereco.js";
import {
  descricaoFiltros,
  resumoBusca,
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
  temMarcador,
} from "./mapa.js";
import { iniciarNavegacao, registrarLocal } from "./navegacao.js";
import {
  carregarSessao,
  iniciarSessao,
  logado,
  mensagemDeContribuicao,
  pedirLogin,
} from "./sessao.js";

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
 * escolher um endereço ou um local (na lista, no histórico ou pelo link). A
 * posição que chega depois de uma dessas escolhas não tira a vista do lugar
 * (plano, etapa 7). É a ideia do @Version do JPA: quem guardou um número
 * antigo sabe que alguém mexeu depois.
 */
let geracaoDaVista = 0;
/**
 * Visão Detalhes (especificação, 2.4). `localAberto` é o id do local nela,
 * "invalido" (link com um id que nem é número) ou null, com ela fechada.
 * `origemDosDetalhes` diz quem a abriu, { tipo: "lista" | "marcador", id },
 * para o foco voltar lá. `pedidoDeDetalhes` é o id do último pedido: a
 * resposta atrasada de um local escolhido antes não cobre a do último.
 */
let localAberto = null;
let origemDosDetalhes = null;
let pedidoDeDetalhes = null;
// Nome do local que a visão Detalhes mostra, para o contexto do login.
let nomeDoLocalAberto = null;

// Visitante ou logado (especificação, 2.6); a mesma chamada grava o cookie csrftoken.
carregarSessao();

obter("/api/opcoes/")
  .done(function (resposta) {
    opcoes = resposta;
    const centroPadrao = opcoes.busca.centro_padrao;
    const idDoLink = iniciarNavegacao({ aoNavegar: navegarPeloHistorico });
    if (typeof idDoLink !== "number") {
      // Sem link, ou com um id que nem é número: nada a buscar antes do mapa.
      iniciarPagina(centroPadrao, idDoLink === null ? null : { id: idDoLink, status: idDoLink });
      return;
    }
    // Link direto (?local=id): o mapa abre no local, e a busca parte dali, como
    // toda busca sem a posição da pessoa parte do centro do mapa (decisão 31).
    // Assim o local do link sempre tem marcador e item na lista.
    obter(`/api/locais/${idDoLink}/`)
      .done(function (local) {
        const centro = { latitude: local.latitude, longitude: local.longitude, zoom: centroPadrao.zoom };
        iniciarPagina(centro, { id: idDoLink, dados: local });
      })
      .fail(function (resposta) {
        iniciarPagina(centroPadrao, { id: idDoLink, status: resposta.status });
      });
  })
  .fail(function () {
    anunciar(
      "Não foi possível carregar o mapa. Confira a conexão com a internet e recarregue a página.",
    );
  });

/**
 * Monta a página em volta de `centro` e faz a primeira busca. `link` é o local
 * de ?local=id: { id, dados } com o LocalDetalhe, { id, status } quando ele não
 * abriu, ou null sem link.
 */
function iniciarPagina(centro, link) {
  criarMapa("mapa", centro);
  iniciarLayout({ aoMostrarMapa: ajustarTamanho, aoTrocarVisao: aoTrocarVisao });
  iniciarLista({ aoEscolher: escolherNaLista, aoAmpliar: ampliarRaio });
  iniciarFiltros({
    tiposEquipamento: opcoes.tipos_equipamento,
    raioPadrao: opcoes.busca.raio_padrao_m,
    raioMaximo: opcoes.busca.raio_maximo_m,
    aoAplicar: aplicarFiltros,
  });
  iniciarBuscaNaArea({ aoBuscar: buscarNaArea });
  // A referência do Nominatim é sempre o centro padrão, nunca a posição nem o
  // local do link (decisão 28).
  iniciarBuscaEndereco({ centroPadrao: opcoes.busca.centro_padrao, aoEscolher: escolherEndereco });
  iniciarLocalizacao({ aoPedir: () => pedirLocalizacao(), aoIrParaEndereco: irParaEndereco });
  iniciarDetalhes({
    opcoes,
    aoVoltar: fecharDetalhes,
    aoMostrarNoMapa: mostrarNoMapa,
    aoContribuir: contribuir,
  });
  iniciarSessao({ aoEntrar: voltarDoLogin, aoCancelar: cancelarLogin });
  aoMoverPelaPessoa(function () {
    geracaoDaVista += 1;
    oferecerBuscaNaArea();
  });
  // A localização automática vale a partir da abertura: se a pessoa mexer no
  // mapa durante a primeira busca, a vista dela também fica onde está.
  const geracaoNaAbertura = geracaoDaVista;
  if (link?.dados) {
    // O link já escolheu a vista: a localização automática não a tira do local.
    geracaoDaVista += 1;
  }
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
    if (link) {
      abrirDetalhes(link.id, {
        origem: { tipo: "lista", id: link.id },
        dados: link.dados,
        status: link.status,
      });
    }
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
}

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
      acompanharDetalhes();
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
    // Com os detalhes abertos, o painel volta para a lista, onde está o
    // resultado; em tela estreita, sem tirar o Mapa da frente.
    if (localAberto !== null) {
      mostrarVisao("lista", { focar: false, frente: false });
    }
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
      // Vale para quem mexeu no mapa e para quem abriu um local pelo link.
      anunciar(
        "Sua localização está marcada no mapa como Você está aqui. O mapa e a lista ficaram onde estavam, para não tirar você do que estava vendo. Para buscar perto de você, use Minha localização.",
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
 * Escolha feita na lista: o mapa vai até o local, que fica destacado, e o
 * painel vira o de detalhes (especificação, 2.1). Em tela estreita, a Lista
 * continua na frente; "Mostrar no mapa" leva ao marcador (README, decisão 41).
 */
function escolherNaLista(id) {
  geracaoDaVista += 1;
  abrirDetalhes(id, { origem: { tipo: "lista", id }, centralizar: true });
}

/** Escolha feita no marcador (clique, Enter ou Espaço): o painel vira o de detalhes, e o mapa fica onde está. */
function escolherNoMapa(id) {
  abrirDetalhes(id, { origem: { tipo: "marcador", id } });
}

/**
 * Abre a visão Detalhes do local `id` e cria a entrada ?local=id no histórico.
 * `origem`: quem a abriu, para o foco voltar lá. `centralizar`: leva o mapa
 * até o local. `dados` e `status`: a resposta já buscada na abertura por link,
 * o LocalDetalhe ou o código do erro. `depois`: roda quando os detalhes chegam,
 * por exemplo para a volta do login seguir com a ação pendente.
 */
function abrirDetalhes(
  id,
  { origem = null, centralizar = false, dados = null, status = null, depois = null } = {},
) {
  localAberto = id;
  origemDosDetalhes = origem;
  pedidoDeDetalhes = id;
  // A origem vai com a entrada do histórico: o Voltar e o Avançar a recuperam.
  registrarLocal(id, { origem });
  // Lista e mapa respondem na hora, com o que a busca já sabe do local. Fora
  // do resultado, as duas chamadas só tiram o destaque do local anterior.
  marcarNaLista(id);
  // Em tela estreita, o mapa está atrás do painel: sem animação.
  destacarNoMapa(id, { centralizar, semAnimacao: telaEstreita() });
  if (status !== null) {
    exibirErroDeDetalhes(status);
    mostrarVisao("detalhes");
    return;
  }
  if (dados) {
    exibirDetalhes(dados);
    mostrarVisao("detalhes");
    depois?.();
    return;
  }
  // O painel também: o foco vai para o nome, e o conteúdo chega depois, sem
  // mexer no foco nem na tela, porque a pessoa pode ter ido para outro lugar.
  mostrarCarregando(localPorId(id)?.nome ?? null);
  mostrarVisao("detalhes");
  obter(`/api/locais/${id}/`)
    .done(function (local) {
      if (pedidoDeDetalhes === id) {
        exibirDetalhes(local);
        depois?.();
      }
    })
    .fail(function (resposta) {
      if (pedidoDeDetalhes === id) {
        exibirErroDeDetalhes(resposta.status);
      }
    });
}

/** Preenche a visão Detalhes; a distância vem da busca atual, quando o local está nela. */
function exibirDetalhes(local) {
  nomeDoLocalAberto = local.nome;
  mostrarDetalhes(local, noResultado(localPorId(local.id)));
  anunciar(`Detalhes de ${local.nome}.`);
}

/**
 * Botão de contribuição nos detalhes (especificação, 2.4). Com login, avisa que
 * a função chega numa próxima versão (plano, etapa 9). Sem login, guarda a ação
 * e leva a Entrar; depois do login, a pessoa volta a este local e a esta ação.
 */
function contribuir(acao) {
  if (logado()) {
    anunciar(mensagemDeContribuicao(acao));
    return;
  }
  pedirLogin({ local: localAberto, nome: nomeDoLocalAberto, acao, origem: origemDosDetalhes });
}

/**
 * Login ou cadastro feito (sessao.js). Com uma ação pendente, os detalhes do
 * local reabrem e o foco vai para o botão da ação, que segue. Sem ela, a pessoa
 * volta à lista (especificação, 2.6).
 */
function voltarDoLogin(usuario, pendente, { novaConta }) {
  const saudacao = novaConta
    ? `Conta criada. Você entrou como ${usuario.username}.`
    : `Você entrou como ${usuario.username}.`;
  if (!pendente) {
    mostrarVisao("lista");
    anunciar(saudacao);
    return;
  }
  abrirDetalhes(pendente.local, {
    origem: pendente.origem,
    depois: function () {
      seguirNaContribuicao(pendente.acao);
      anunciar(`${saudacao} ${mensagemDeContribuicao(pendente.acao)}`);
    },
  });
}

/** "Voltar…" ou Esc em Entrar e Criar conta: de volta ao local, no botão que pediu o login, ou à lista. */
function cancelarLogin(pendente) {
  if (!pendente) {
    mostrarVisao("lista");
    return;
  }
  abrirDetalhes(pendente.local, {
    origem: pendente.origem,
    depois: () => seguirNaContribuicao(pendente.acao),
  });
}

/**
 * Leva o foco ao botão da ação quando os detalhes chegam, só se ele ainda está
 * nos detalhes: se a pessoa foi para outro lugar enquanto carregava, o foco fica lá.
 */
function seguirNaContribuicao(acao) {
  if ($.contains($("#visao-detalhes")[0], document.activeElement)) {
    focarContribuicao(acao);
  }
}

/**
 * O local não abriu: a visão Detalhes diz o que aconteceu e o que fazer (bug 2
 * do HANDOFF), e o anúncio também, para quem já saiu do painel.
 */
function exibirErroDeDetalhes(status) {
  const erro = erroDeDetalhes(status);
  mostrarErroDeDetalhes(erro);
  anunciar(`${erro.titulo}. ${erro.mensagem}`);
}

/**
 * O painel trocou de visão (layout.js). Saindo dos detalhes, por "Voltar à
 * lista", pelo Esc, pelo menu ou por uma busca, a URL deixa de citar o local, e
 * uma resposta que ainda não chegou não reabre o painel.
 */
function aoTrocarVisao(nome) {
  if (nome === "detalhes" || localAberto === null) {
    return;
  }
  localAberto = null;
  pedidoDeDetalhes = null;
  registrarLocal(null);
}

/**
 * "Voltar à lista", Esc com o foco no painel ou o Voltar do navegador: a lista
 * volta, e o foco vai para quem abriu os detalhes (especificação, 2.4).
 */
function fecharDetalhes() {
  const origem = origemDosDetalhes;
  origemDosDetalhes = null;
  mostrarVisao("lista", { focar: false });
  devolverFoco(origem);
}

/**
 * O foco volta ao marcador ou ao item da lista de origem. Se uma busca nova
 * os tirou da tela, vai para o título da lista e não se perde.
 */
function devolverFoco(origem) {
  if (origem?.tipo === "marcador" && temMarcador(origem.id)) {
    if (telaEstreita()) {
      mostrarTela("mapa");
    }
    focarMarcador(origem.id);
    return;
  }
  const item = origem ? $(`#lista-locais [data-local="${origem.id}"]`) : $();
  (item.length ? item : $("#titulo-lista")).trigger("focus");
}

/**
 * "Mostrar no mapa": o mapa vai até o local, e o foco, para o marcador. Em
 * tela estreita, o Mapa vem para a frente (README, decisão 41). Sem animação:
 * o foco precisa encontrar o marcador no lugar.
 */
function mostrarNoMapa() {
  geracaoDaVista += 1;
  if (telaEstreita()) {
    mostrarTela("mapa");
  }
  destacarNoMapa(localAberto, { centralizar: true, semAnimacao: true });
  focarMarcador(localAberto);
}

/**
 * Voltar ou Avançar do navegador (navegacao.js): a tela acompanha a URL, sem
 * criar entrada nova. Sem local na URL, fecha os detalhes; com um local, abre
 * como da primeira vez. Aberto pelo marcador, o mapa fica onde está e o Esc
 * volta ao marcador; pela lista, ou pelo link (sem estado), o mapa vai até ele.
 */
function navegarPeloHistorico(id, estado) {
  if (id === null) {
    if (localAberto !== null) {
      fecharDetalhes();
    }
    return;
  }
  const origem = estado?.origem ?? { tipo: "lista", id };
  const centralizar = origem.tipo === "lista";
  if (centralizar) {
    geracaoDaVista += 1;
  }
  abrirDetalhes(id, { origem, centralizar, status: id === "invalido" ? "invalido" : null });
}

/**
 * Depois de uma busca nova com os detalhes abertos (pela posição da pessoa,
 * por exemplo), a distância e o destaque acompanham o resultado novo.
 */
function acompanharDetalhes() {
  if (typeof localAberto !== "number") {
    return;
  }
  acompanharResultado(noResultado(localPorId(localAberto)));
  // Fora do resultado novo, as duas chamadas só limpam o destaque.
  marcarNaLista(localAberto);
  destacarNoMapa(localAberto);
}

/** O que o painel de detalhes precisa do local no resultado da busca: a distância e a origem dela. */
function noResultado(resultado) {
  return resultado ? { distancia_m: resultado.distancia_m, origem: busca.origem } : null;
}
