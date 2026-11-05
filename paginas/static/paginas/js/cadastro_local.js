/**
 * Adicionar local, escolha do ponto (especificação, seção 3; plano, etapa 12).
 * Três entradas equivalentes: a mira no centro do mapa com "Usar o centro do
 * mapa" (o caminho pelo teclado e a alternativa a arrastar, WCAG 2.5.7), o
 * clique no mapa e o endereço. O formulário do local vem na etapa 13.
 *
 * O modo vale enquanto a visão "Adicionar local" está no painel: sair dela por
 * qualquer caminho o encerra (principal.js, aoTrocarVisao).
 *
 * As funções puras do início são testadas no QUnit (decisão 35).
 */

import { anunciar } from "./anuncio.js";
import { esconderBuscaNaArea, oferecerBuscaNaArea } from "./busca.js";
import { esconderResultados, iniciarBuscaEndereco, limparFormulario } from "./endereco.js";
import { fecharMenu, mostrarVisao } from "./layout.js";
import {
  aoClicarNoMapa,
  centralizarEm,
  centroDoMapa,
  marcarNovoLocal,
  removerNovoLocal,
} from "./mapa.js";
import { logado, pedirLogin } from "./sessao.js";

// Como o ponto foi escolhido, para o texto do ponto escolhido.
const ORIGENS = {
  centro: "pelo centro do mapa",
  clique: "por um clique no mapa",
};

// Cinco casas decimais: cerca de 1 m, mais que a precisão de quem escolhe no mapa.
const COORDENADA = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 5,
  maximumFractionDigits: 5,
});

export const PROXIMO_PASSO =
  "Nome e comodidades do novo local chegam numa próxima versão. O ponto escolhido continua marcado no mapa.";

/** "Ponto escolhido pelo centro do mapa.", ou pelo endereço, com o rótulo dele. */
export function textoPontoEscolhido({ origem, endereco }) {
  if (origem === "endereco") {
    return `Ponto escolhido pelo endereço ${endereco}.`;
  }
  return `Ponto escolhido ${ORIGENS[origem]}.`;
}

/** "Latitude -21,78271, longitude -48,17935.", em pt-BR. */
export function textoCoordenadas(latitude, longitude) {
  return `Latitude ${COORDENADA.format(latitude)}, longitude ${COORDENADA.format(longitude)}.`;
}

// O modo está aberto, e o ponto escolhido nele: { latitude, longitude, origem, endereco }.
let ativo = false;
let ponto = null;
// Para "Buscar nesta área" voltar ao fim do modo: se o mapa foi para outra área
// durante ele (a pessoa o moveu, ou ele foi até um endereço) e se o botão
// estava na tela na entrada (o modo o esconde).
let mapaMudouNoModo = false;
let buscarNaAreaNaEntrada = false;

export function modoCadastroAtivo() {
  return ativo;
}

/**
 * Liga o item do menu, os botões do modo e o formulário de endereço.
 * `centroPadrao` é a referência do Nominatim, como na visão Buscar (decisão 28).
 */
export function iniciarCadastroLocal({ centroPadrao }) {
  // Exige login (especificação, 2.5): sem sessão, Entrar, e depois a volta ao modo.
  $("#menu-adicionar").on("click", function () {
    fecharMenu({ devolverFoco: false });
    if (logado()) {
      entrarNoModoCadastro();
    } else {
      pedirLogin({ acao: "adicionar" });
    }
  });

  iniciarBuscaEndereco({
    prefixo: "endereco-local",
    centroPadrao,
    aoEscolher: ({ latitude, longitude, rotulo }) =>
      escolherPonto({ latitude, longitude, origem: "endereco", endereco: rotulo }),
  });
  $("#usar-centro").on("click", function () {
    escolherPonto({ ...centroDoMapa(), origem: "centro", endereco: null });
  });
  aoClicarNoMapa(function ({ latitude, longitude }) {
    if (ativo) {
      escolherPonto({ latitude, longitude, origem: "clique", endereco: null });
    }
  });
  $("#outro-ponto").on("click", escolherOutroPonto);
  $("#continuar-cadastro").on("click", () => anunciar(PROXIMO_PASSO));
  $("#cancelar-cadastro").on("click", cancelar);

  // Esc cancela o modo (plano, etapa 12) com o foco na visão, no botão do mapa
  // ou no próprio mapa. Num marcador, o Esc continua só escondendo o nome sobre
  // o local (mapa.js, WCAG 1.4.13).
  $("#visao-adicionar, #usar-centro").on("keydown", function (evento) {
    if (evento.key === "Escape") {
      cancelar();
    }
  });
  $("#mapa").on("keydown", function (evento) {
    if (evento.key === "Escape" && ativo && evento.target === this) {
      cancelar();
    }
  });
}

/** Abre o modo: a mira e "Usar o centro do mapa" aparecem, e o mapa troca de instruções. */
export function entrarNoModoCadastro() {
  ativo = true;
  ponto = null;
  removerNovoLocal();
  $("#ponto-escolhido").prop("hidden", true);
  // Sem o erro ou os endereços de uma vez anterior.
  limparFormulario("endereco-local");
  // O lugar de "Buscar nesta área" é de "Usar o centro do mapa" enquanto o modo durar.
  mapaMudouNoModo = false;
  buscarNaAreaNaEntrada = !$("#buscar-na-area").prop("hidden");
  esconderBuscaNaArea();
  $("#mira, #usar-centro").prop("hidden", false);
  $("#mapa").attr("aria-describedby", "mapa-instrucoes-cadastro");
  mostrarVisao("adicionar");
}

/**
 * Encerra o modo, por qualquer caminho: tira a mira, o botão e o marcador do
 * ponto, e o mapa volta às instruções de sempre.
 */
export function sairDoModoCadastro() {
  if (!ativo) {
    return;
  }
  ativo = false;
  ponto = null;
  removerNovoLocal();
  esconderResultados("endereco-local");
  $("#ponto-escolhido, #mira, #usar-centro").prop("hidden", true);
  $("#mapa").attr("aria-describedby", "mapa-instrucoes");
  // O mapa foi para outra área (ou o botão já estava na tela): a lista mostra
  // a busca anterior, e "Buscar nesta área" volta a ser oferecido (especificação, 2.3).
  if (mapaMudouNoModo || buscarNaAreaNaEntrada) {
    oferecerBuscaNaArea();
  }
}

/**
 * A pessoa moveu o mapa durante o modo (principal.js, aoMoverPelaPessoa, que
 * ignora os movimentos do código e as mudanças de tamanho): no modo, mover o
 * mapa é mirar, e "Buscar nesta área" só volta quando o modo terminar.
 */
export function registrarMovimentoNoModo() {
  mapaMudouNoModo = true;
}

/** Cancelar ou Esc: a lista volta, com o foco no título, e o modo termina. */
function cancelar() {
  mostrarVisao("lista");
  anunciar("Adicionar local cancelado.");
}

/**
 * O ponto foi escolhido por uma das três entradas: ele ganha o marcador, e o
 * painel mostra como foi escolhido, com o foco no título "Ponto escolhido". Em
 * tela estreita, o painel vem para a frente. Pelo endereço, o mapa vai até ele.
 */
function escolherPonto(novo) {
  // Uma resposta que chega com o modo já encerrado não reabre nada.
  if (!ativo) {
    return;
  }
  ponto = novo;
  marcarNovoLocal(ponto.latitude, ponto.longitude);
  if (ponto.origem === "endereco") {
    esconderResultados("endereco-local");
    centralizarEm(ponto.latitude, ponto.longitude);
    mapaMudouNoModo = true;
  }
  const texto = textoPontoEscolhido(ponto);
  $("#ponto-escolhido-texto").text(texto);
  $("#ponto-escolhido-coordenadas").text(textoCoordenadas(ponto.latitude, ponto.longitude));
  $("#ponto-escolhido").prop("hidden", false);
  mostrarVisao("adicionar", { focar: false });
  $("#titulo-ponto-escolhido").trigger("focus");
  anunciar(`${texto} Use Continuar para seguir, ou Escolher outro ponto.`);
}

/** "Escolher outro ponto": o marcador sai, e o foco volta ao começo do modo. */
function escolherOutroPonto() {
  ponto = null;
  removerNovoLocal();
  $("#ponto-escolhido").prop("hidden", true);
  $("#titulo-adicionar").trigger("focus");
  anunciar("Escolha outro ponto: mova o mapa até a mira, clique no mapa ou busque o endereço.");
}
