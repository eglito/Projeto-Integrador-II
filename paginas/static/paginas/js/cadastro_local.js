/**
 * Adicionar local (especificação, seção 3; plano, etapas 12 e 13), um passo
 * de cada vez, como prevê o formulário em etapas (README, seção 6):
 *
 * 1. O ponto, por três entradas equivalentes: a mira no centro do mapa com
 *    "Usar o centro do mapa" (o caminho pelo teclado e a alternativa a
 *    arrastar, WCAG 2.5.7), o clique no mapa e o endereço.
 * 2. Nome e comodidades, com o POST /api/locais/. Um 409 mostra os locais que
 *    podem ser o mesmo lugar (Docs/API.md, 6.2).
 * 3. Os equipamentos, um de cada vez, depois do 201.
 *
 * O modo vale enquanto a visão "Adicionar local" está no painel: sair dela por
 * qualquer caminho o encerra (principal.js, aoTrocarVisao).
 *
 * As funções puras do início são testadas no QUnit (decisão 35).
 */

import { enviar } from "./api.js";
import { anunciar } from "./anuncio.js";
import { esconderBuscaNaArea, oferecerBuscaNaArea } from "./busca.js";
import { nomeEquipamento, textoDimensoes } from "./detalhes.js";
import { esconderResultados, iniciarBuscaEndereco, limparFormulario } from "./endereco.js";
import { formatarDistancia } from "./formatacao.js";
import {
  limparErros,
  mensagemDeFalha,
  mostrarErros,
  prepararFormulario,
  separarErros,
} from "./formularios.js";
import { fecharMenu, mostrarVisao } from "./layout.js";
import {
  aoClicarNoMapa,
  centralizarEm,
  centroDoMapa,
  marcarNovoLocal,
  removerNovoLocal,
} from "./mapa.js";
import { carregarSessao, logado, pedirLogin } from "./sessao.js";

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

// Os passos do formulário em etapas; a possível duplicata faz parte do passo 2.
const PASSOS = { ponto: 1, dados: 2, duplicata: 2, equipamentos: 3 };
const NOMES_DOS_PASSOS = ["o ponto", "nome e comodidades", "equipamentos"];

// Campos da API em cada formulário, com o id e o rótulo na tela (formularios.js).
const CAMPOS_DO_LOCAL = {
  nome: { id: "local-nome", rotulo: "Nome do local" },
  municipio_ibge: { id: "local-municipio", rotulo: "Município" },
  endereco: { id: "local-endereco", rotulo: "Endereço" },
};
const CAMPOS_DO_EQUIPAMENTO = {
  tipo: { id: "equipamento-tipo", rotulo: "Tipo" },
  nome_outro: { id: "equipamento-nome-outro", rotulo: "Nome do equipamento" },
  altura_cm: { id: "equipamento-altura", rotulo: "Altura" },
  largura_cm: { id: "equipamento-largura", rotulo: "Largura" },
};

const COMODIDADES = ["tem_bebedouro", "tem_sanitario", "tem_bancos"];

export const SESSAO_TERMINOU =
  "Sua sessão terminou. Entre de novo pelo menu para continuar o cadastro.";

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

/** "Passo 2 de 3: nome e comodidades". */
export function textoPasso(etapa) {
  const numero = PASSOS[etapa];
  return `Passo ${numero} de 3: ${NOMES_DOS_PASSOS[numero - 1]}`;
}

/** Escolha de uma comodidade ("sim", "nao" ou "") para a API: true, false ou null ("não informado"). */
export function valorDaComodidade(escolha) {
  if (escolha === "sim") {
    return true;
  }
  return escolha === "nao" ? false : null;
}

/**
 * Corpo do POST /api/locais/ (Docs/API.md, 5.3). `confirmar_novo` só vai
 * depois de um 409, quando a pessoa diz que é outro lugar.
 */
export function corpoDoLocal(
  { nome, municipio, endereco, comodidades, ponto },
  { confirmarNovo = false } = {},
) {
  const corpo = {
    nome: nome.trim(),
    municipio_ibge: Number(municipio),
    endereco: endereco.trim(),
    latitude: ponto.latitude,
    longitude: ponto.longitude,
  };
  for (const campo of COMODIDADES) {
    corpo[campo] = valorDaComodidade(comodidades[campo]);
  }
  if (confirmarNovo) {
    corpo.confirmar_novo = true;
  }
  return corpo;
}

/** Antes de ir à API: o nome é o único campo obrigatório que a pessoa digita. */
export function errosDoLocal({ nome }) {
  return nome.trim() ? {} : { nome: "Informe o nome do local." };
}

/** Uma medida opcional: vazia, ou um inteiro maior que zero. */
function medidaValida(texto) {
  const limpo = texto.trim();
  return limpo === "" || (/^\d+$/.test(limpo) && Number(limpo) > 0);
}

function medida(texto) {
  return texto.trim() === "" ? null : Number(texto.trim());
}

/**
 * Corpo do POST /api/locais/{id}/equipamentos/. O nome só vai no tipo "outro",
 * e a largura só em barras paralelas, como pedem as restrições do banco.
 */
export function corpoDoEquipamento({ tipo, nomeOutro, altura, largura }) {
  const corpo = { tipo, altura_cm: medida(altura) };
  if (tipo === "outro") {
    corpo.nome_outro = nomeOutro.trim();
  }
  if (tipo === "barras_paralelas") {
    corpo.largura_cm = medida(largura);
  }
  return corpo;
}

/** Antes de ir à API, com mensagens que dizem como corrigir (CLAUDE.md). */
export function errosDoEquipamento({ tipo, nomeOutro, altura, largura }) {
  const erros = {};
  if (!tipo) {
    erros.tipo = "Escolha o tipo do equipamento.";
  }
  if (tipo === "outro" && !nomeOutro.trim()) {
    erros.nome_outro = "Informe o nome do equipamento, por exemplo: argolas.";
  }
  if (!medidaValida(altura)) {
    erros.altura_cm =
      "Informe a altura em centímetros, com um número inteiro maior que zero, ou deixe o campo vazio.";
  }
  if (tipo === "barras_paralelas" && !medidaValida(largura)) {
    erros.largura_cm =
      "Informe a largura em centímetros, com um número inteiro maior que zero, ou deixe o campo vazio.";
  }
  return erros;
}

/** "Praça Pedro de Toledo, a 80 m do ponto escolhido." */
export function textoCandidato({ nome, distancia_m }) {
  return `${nome}, a ${formatarDistancia(distancia_m)} do ponto escolhido.`;
}

// Para o local aparecer no mapa e na lista, a busca do fim tira os filtros de
// tipo e de altura, que poderiam escondê-lo (principal.js, irAoLocal).
const FILTROS_LIMPOS = " Os filtros de tipo e altura foram limpos para ele aparecer.";

/** Anúncio do fim do cadastro (especificação, seção 3). */
export function mensagemConclusao(nome, quantidade, { filtrosLimpos = false } = {}) {
  const equipamentos =
    quantidade === 0
      ? "ainda sem equipamentos"
      : `com ${quantidade} ${quantidade === 1 ? "equipamento" : "equipamentos"}`;
  const filtros = filtrosLimpos ? FILTROS_LIMPOS : "";
  return `Local cadastrado: ${nome}, ${equipamentos}. Ele já aparece no mapa e na lista.${filtros}`;
}

/** "É este lugar": nada novo foi cadastrado, e os detalhes do local existente estão abertos. */
export function mensagemLocalExistente(nome, { filtrosLimpos = false } = {}) {
  const filtros = filtrosLimpos ? FILTROS_LIMPOS : "";
  return `Nada novo foi cadastrado. Detalhes de ${nome}, no mapa e na lista.${filtros}`;
}

export const CONCLUSAO_FALHOU =
  "O local está cadastrado, mas não foi possível mostrá-lo no mapa agora. Confira a conexão com a internet e use Concluir de novo.";
export const ABRIR_FALHOU =
  "Não foi possível abrir o local agora. Confira a conexão com a internet e tente de novo.";
export const EQUIPAMENTO_PENDENTE =
  "O equipamento escolhido ainda não foi adicionado. Use Adicionar equipamento, ou volte o tipo para Escolha o tipo e use Concluir.";

// O modo está aberto, e em que passo.
let ativo = false;
let etapa = "ponto";
// O ponto escolhido: { latitude, longitude, origem, endereco }.
let ponto = null;
// O endereço que o passo 1 pôs no campo Endereço, para saber se a pessoa o mudou.
let enderecoSugerido = "";
// O local criado pelo POST (201): { id, nome, latitude, longitude }.
let localCriado = null;
let equipamentosAdicionados = 0;
// Um pedido de cada vez em cada formulário.
const enviando = { local: false, equipamento: false };
// Os locais do 409, para "É este lugar" achar o escolhido.
let candidatos = [];
// A busca que mostra o local (o novo, ou o escolhido no 409) está em curso:
// ela mesma leva o mapa até ele, e "Buscar nesta área" não deve voltar.
let mostrandoLocal = false;
// Para "Buscar nesta área" voltar ao fim do modo: se o mapa foi para outra área
// durante ele (a pessoa o moveu, ou ele foi até um endereço) e se o botão
// estava na tela na entrada (o modo o esconde).
let mapaMudouNoModo = false;
let buscarNaAreaNaEntrada = false;
// O que o principal.js faz no fim: os dois devolvem o jqXHR da busca que mostra o local.
let retornos = { aoConcluir: null, aoAbrirExistente: null };

export function modoCadastroAtivo() {
  return ativo;
}

/**
 * Liga o item do menu e o modo. `centroPadrao` é a referência do Nominatim,
 * como na visão Buscar (decisão 28). `opcoes` traz municípios e tipos de
 * equipamento (/api/opcoes/). `aoConcluir(local, quantidade)` mostra o local
 * novo no mapa, na lista e nos detalhes; `aoAbrirExistente(local)`, um dos
 * locais do 409. Os dois recebem { id, nome, latitude, longitude }.
 */
export function iniciarCadastroLocal({ centroPadrao, opcoes, aoConcluir, aoAbrirExistente }) {
  retornos = { aoConcluir, aoAbrirExistente };
  for (const municipio of opcoes.municipios) {
    $("<option>", { value: municipio.valor }).text(municipio.rotulo).appendTo("#local-municipio");
  }
  for (const tipo of opcoes.tipos_equipamento) {
    $("<option>", { value: tipo.valor }).text(tipo.rotulo).appendTo("#equipamento-tipo");
  }
  prepararFormulario("local");
  prepararFormulario("equipamento");

  $("#menu-adicionar").on("click", function () {
    fecharMenu({ devolverFoco: false });
    iniciarAdicao();
  });

  // Passo 1: o ponto.
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
    if (ativo && etapa === "ponto") {
      escolherPonto({ latitude, longitude, origem: "clique", endereco: null });
    }
  });
  $("#outro-ponto").on("click", escolherOutroPonto);
  $("#continuar-cadastro").on("click", irParaDados);

  // Passo 2: nome e comodidades, e a possível duplicata.
  $("#voltar-ao-ponto").on("click", () => seguirParaEtapa("ponto"));
  $("#form-local").on("submit", function (evento) {
    evento.preventDefault();
    enviarLocal({ confirmarNovo: false });
  });
  $("#cadastrar-mesmo-assim").on("click", () => enviarLocal({ confirmarNovo: true }));
  $("#voltar-aos-dados").on("click", () => seguirParaEtapa("dados"));
  $("#candidatos").on("click", "[data-candidato]", function () {
    abrirExistente(Number($(this).attr("data-candidato")));
  });

  // Passo 3: equipamentos.
  $("#equipamento-tipo").on("change", atualizarCamposDoTipo);
  $("#form-equipamento").on("submit", function (evento) {
    evento.preventDefault();
    enviarEquipamento();
  });
  $("#concluir-cadastro").on("click", concluir);

  $("#cancelar-cadastro").on("click", cancelar);
  // Esc cancela o modo com o foco na visão; no passo 1, também no botão do
  // mapa e no próprio mapa, que nos outros passos não fazem parte do cadastro.
  // Num marcador, o Esc continua só escondendo o nome sobre o local (mapa.js,
  // WCAG 1.4.13). Com o local já criado, o Esc conclui: nada se perde.
  $("#visao-adicionar, #usar-centro").on("keydown", function (evento) {
    if (evento.key === "Escape") {
      sairPeloEsc();
    }
  });
  $("#mapa").on("keydown", function (evento) {
    if (evento.key === "Escape" && ativo && etapa === "ponto" && evento.target === this) {
      sairPeloEsc();
    }
  });
}

/**
 * "Adicionar local", no menu ou na lista vazia: exige login (especificação,
 * 2.5). Sem sessão, Entrar, e depois a volta ao modo.
 */
export function iniciarAdicao() {
  if (logado()) {
    entrarNoModoCadastro();
  } else {
    pedirLogin({ acao: "adicionar" });
  }
}

/** Abre o modo no passo 1, com tudo limpo. */
export function entrarNoModoCadastro() {
  ativo = true;
  ponto = null;
  enderecoSugerido = "";
  localCriado = null;
  equipamentosAdicionados = 0;
  candidatos = [];
  removerNovoLocal();
  $("#ponto-escolhido").prop("hidden", true);
  // Sem os dados, os erros ou os endereços de uma vez anterior.
  limparFormulario("endereco-local");
  limparFormularioDoLocal();
  limparFormularioDoEquipamento();
  $("#equipamentos-adicionados, #candidatos").empty();
  $("#nenhum-equipamento").prop("hidden", false);
  // O lugar de "Buscar nesta área" é de "Usar o centro do mapa" enquanto o modo durar.
  mapaMudouNoModo = false;
  buscarNaAreaNaEntrada = !$("#buscar-na-area").prop("hidden");
  esconderBuscaNaArea();
  mostrarEtapa("ponto", { focar: false });
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
  localCriado = null;
  removerNovoLocal();
  esconderResultados("endereco-local");
  $("#ponto-escolhido, #mira, #usar-centro").prop("hidden", true);
  $("#mapa").attr("aria-describedby", "mapa-instrucoes");
  // O mapa foi para outra área (ou o botão já estava na tela): a lista mostra
  // a busca anterior, e "Buscar nesta área" volta a ser oferecido (especificação,
  // 2.3). Não enquanto a busca que mostra o local está em curso: ela é a nova.
  if (!mostrandoLocal && (mapaMudouNoModo || buscarNaAreaNaEntrada)) {
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

/**
 * Mostra um passo e esconde os outros. A mira, "Usar o centro do mapa" e as
 * instruções do mapa no modo só valem no passo 1. Com o local criado, o topo
 * não oferece mais "Cancelar": o passo 3 termina em Concluir.
 */
function mostrarEtapa(nova, { focar = true } = {}) {
  etapa = nova;
  $(".etapa-cadastro").prop("hidden", true);
  $(`#etapa-${nova}`).prop("hidden", false);
  $("#passo-cadastro").text(textoPasso(nova));
  const noPonto = nova === "ponto";
  $("#mira, #usar-centro").prop("hidden", !noPonto);
  $("#mapa").attr("aria-describedby", noPonto ? "mapa-instrucoes-cadastro" : "mapa-instrucoes");
  $("#cancelar-cadastro").prop("hidden", nova === "equipamentos");
  if (!focar) {
    return;
  }
  // De volta ao passo 1 com o ponto já escolhido, o foco vai para ele.
  if (!noPonto) {
    $(`#titulo-etapa-${nova}`).trigger("focus");
  } else {
    $(ponto ? "#titulo-ponto-escolhido" : "#titulo-adicionar").trigger("focus");
  }
}

/**
 * Passo trocado pela pessoa (Continuar, Voltar…): o foco vai ao título, e o
 * anúncio diz em que passo ela está, no lugar do aviso do passo anterior, que
 * ainda estaria na faixa ("Use Continuar para seguir…").
 */
function seguirParaEtapa(nova) {
  mostrarEtapa(nova);
  anunciar(textoPasso(nova));
}

/** Cancelar ou Esc antes do local existir: a lista volta, com o foco no título, e o modo termina. */
function cancelar() {
  mostrarVisao("lista");
  anunciar("Adicionar local cancelado.");
}

function sairPeloEsc() {
  if (etapa === "equipamentos") {
    concluir();
  } else {
    cancelar();
  }
}

/**
 * O ponto foi escolhido por uma das três entradas: ele ganha o marcador, e o
 * painel mostra como foi escolhido, com o foco no título "Ponto escolhido". Em
 * tela estreita, o painel vem para a frente. Pelo endereço, o mapa vai até ele.
 */
function escolherPonto(novo) {
  // Uma resposta que chega com o modo encerrado, ou fora do passo 1, não muda nada.
  if (!ativo || etapa !== "ponto") {
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

/**
 * "Continuar": passo 2. O endereço buscado no passo 1 já vem no campo
 * Endereço. Ele acompanha o ponto: se a pessoa voltar e escolher outro, o
 * campo muda junto, a não ser que ela tenha escrito nele.
 */
function irParaDados() {
  if (!ponto) {
    return;
  }
  const campo = $("#local-endereco");
  if (campo.val() === enderecoSugerido) {
    enderecoSugerido = ponto.origem === "endereco" ? ponto.endereco : "";
    campo.val(enderecoSugerido);
  }
  seguirParaEtapa("dados");
}

function lerDadosDoLocal() {
  const comodidades = {};
  for (const campo of COMODIDADES) {
    comodidades[campo] = $(`#form-local input[name="${campo}"]:checked`).val() ?? "";
  }
  return {
    nome: $("#local-nome").val(),
    municipio: $("#local-municipio").val(),
    endereco: $("#local-endereco").val(),
    comodidades,
  };
}

/**
 * POST /api/locais/. 201: passo 3. 409: os candidatos, com "É este lugar" e
 * "É outro lugar" (Docs/API.md, 6.2). 400: os erros no formulário do passo 2.
 */
function enviarLocal({ confirmarNovo }) {
  if (enviando.local) {
    return; // o anúncio "Cadastrando o local…" já está no ar
  }
  const dados = lerDadosDoLocal();
  limparErros("local");
  const antes = errosDoLocal(dados);
  if (Object.keys(antes).length) {
    mostrarEtapa("dados", { focar: false });
    mostrarErros("local", CAMPOS_DO_LOCAL, { porCampo: antes, geral: null });
    return;
  }

  enviando.local = true;
  anunciar("Cadastrando o local…");
  enviar("POST", "/api/locais/", corpoDoLocal({ ...dados, ponto }, { confirmarNovo }))
    .done(function (local) {
      // A pessoa saiu do modo antes da resposta: o local existe, mas a tela fica onde ela está.
      if (!ativo) {
        anunciar(`Local cadastrado: ${local.nome}, ainda sem equipamentos.`);
        return;
      }
      localCriado = {
        id: local.id,
        nome: local.nome,
        latitude: local.latitude,
        longitude: local.longitude,
      };
      $("#titulo-etapa-equipamentos").text(`Equipamentos de ${local.nome}`);
      mostrarEtapa("equipamentos");
      anunciar(`Local cadastrado: ${local.nome}. Agora acrescente os equipamentos, um de cada vez.`);
    })
    .fail(function (resposta) {
      if (!ativo) {
        return;
      }
      if (resposta.status === 409) {
        mostrarCandidatos(resposta.responseJSON.possiveis_duplicatas);
        return;
      }
      mostrarEtapa("dados", { focar: false });
      if (resposta.status === 400) {
        mostrarErros("local", CAMPOS_DO_LOCAL, separarErros(resposta.responseJSON, CAMPOS_DO_LOCAL));
      } else if (resposta.status === 403) {
        conferirSessao("local", CAMPOS_DO_LOCAL, "cadastrar o local");
      } else {
        const geral = mensagemDeFalha("cadastrar o local", resposta.status);
        mostrarErros("local", CAMPOS_DO_LOCAL, { porCampo: {}, geral });
      }
    })
    .always(function () {
      enviando.local = false;
    });
}

/**
 * 409: os locais perto do ponto, cada um com "É este lugar". O texto é nosso: o
 * detail da API fala em reenviar com confirmar_novo, que é coisa de API.
 */
function mostrarCandidatos(novos) {
  candidatos = novos;
  $("#duplicata-erro").text("").prop("hidden", true);
  const lista = $("#candidatos").empty();
  for (const candidato of candidatos) {
    const item = $("<li>").appendTo(lista);
    $("<p>").text(textoCandidato(candidato)).appendTo(item);
    if (candidato.endereco) {
      $("<p>").text(candidato.endereco).appendTo(item);
    }
    // O nome do local completa o nome acessível: vários botões "É este lugar"
    // seriam iguais para o leitor de tela (WCAG 2.4.6). O texto visível vem primeiro (2.5.3).
    $("<button>", { type: "button", "data-candidato": candidato.id })
      .text("É este lugar")
      .append($("<span>", { class: "visualmente-oculto" }).text(`: ${candidato.nome}`))
      .appendTo(item);
  }
  mostrarEtapa("duplicata");
  const quantos = candidatos.length === 1 ? "1 local" : `${candidatos.length} locais`;
  anunciar(
    `Este lugar pode já estar cadastrado: ${quantos} perto do ponto escolhido. Confira antes de continuar.`,
  );
}

/** No tipo "Outro", o nome; em barras paralelas, a largura. Os outros campos somem, vazios. */
function atualizarCamposDoTipo() {
  const tipo = $("#equipamento-tipo").val();
  const comNome = tipo === "outro";
  const comLargura = tipo === "barras_paralelas";
  $("#campo-equipamento-nome-outro").prop("hidden", !comNome);
  $("#campo-equipamento-largura").prop("hidden", !comLargura);
  if (!comNome) {
    $("#equipamento-nome-outro").val("");
  }
  if (!comLargura) {
    $("#equipamento-largura").val("");
  }
}

function lerDadosDoEquipamento() {
  return {
    tipo: $("#equipamento-tipo").val(),
    nomeOutro: $("#equipamento-nome-outro").val(),
    altura: $("#equipamento-altura").val(),
    largura: $("#equipamento-largura").val(),
  };
}

/** POST /api/locais/{id}/equipamentos/. Cada um entra na lista "Já adicionados". */
function enviarEquipamento() {
  if (enviando.equipamento || !localCriado) {
    return;
  }
  const dados = lerDadosDoEquipamento();
  limparErros("equipamento");
  const antes = errosDoEquipamento(dados);
  if (Object.keys(antes).length) {
    mostrarErros("equipamento", CAMPOS_DO_EQUIPAMENTO, { porCampo: antes, geral: null });
    return;
  }

  enviando.equipamento = true;
  anunciar("Adicionando o equipamento…");
  enviar("POST", `/api/locais/${localCriado.id}/equipamentos/`, corpoDoEquipamento(dados))
    .done(function (equipamento) {
      if (!ativo) {
        return;
      }
      equipamentosAdicionados += 1;
      const nome = nomeEquipamento(equipamento);
      $("<li>")
        .text(`${nome}. ${textoDimensoes(equipamento)}`)
        .appendTo("#equipamentos-adicionados");
      $("#nenhum-equipamento").prop("hidden", true);
      limparFormularioDoEquipamento();
      $("#equipamento-tipo").trigger("focus");
      anunciar(`Equipamento adicionado: ${nome}. Adicione outro ou use Concluir.`);
    })
    .fail(function (resposta) {
      if (!ativo) {
        return;
      }
      if (resposta.status === 400) {
        mostrarErros(
          "equipamento",
          CAMPOS_DO_EQUIPAMENTO,
          separarErros(resposta.responseJSON, CAMPOS_DO_EQUIPAMENTO),
        );
      } else if (resposta.status === 403) {
        conferirSessao("equipamento", CAMPOS_DO_EQUIPAMENTO, "adicionar o equipamento");
      } else {
        const geral = mensagemDeFalha("adicionar o equipamento", resposta.status);
        mostrarErros("equipamento", CAMPOS_DO_EQUIPAMENTO, { porCampo: {}, geral });
      }
    })
    .always(function () {
      enviando.equipamento = false;
    });
}

/**
 * "É este lugar": o local existente abre no mapa, na lista e nos detalhes
 * (principal.js), e nada novo é cadastrado.
 */
function abrirExistente(id) {
  const candidato = candidatos.find((local) => local.id === id);
  if (!candidato || mostrandoLocal) {
    return;
  }
  $("#duplicata-erro").text("").prop("hidden", true);
  mostrarLocal(retornos.aoAbrirExistente(candidato), function () {
    $("#duplicata-erro").text(ABRIR_FALHOU).prop("hidden", false).trigger("focus");
    anunciar(ABRIR_FALHOU);
  });
}

/**
 * "Concluir" (ou Esc no passo 3): o local novo aparece no mapa, na lista e
 * nos detalhes (principal.js). Um equipamento escolhido e não adicionado não
 * se perde calado: a pessoa decide o que fazer com ele.
 */
function concluir() {
  if (!localCriado || mostrandoLocal) {
    return;
  }
  limparErros("equipamento");
  if ($("#equipamento-tipo").val()) {
    mostrarErros("equipamento", CAMPOS_DO_EQUIPAMENTO, { porCampo: {}, geral: EQUIPAMENTO_PENDENTE });
    return;
  }
  anunciar("Concluindo o cadastro…");
  mostrarLocal(retornos.aoConcluir(localCriado, equipamentosAdicionados), function () {
    mostrarErros("equipamento", CAMPOS_DO_EQUIPAMENTO, { porCampo: {}, geral: CONCLUSAO_FALHOU });
  });
}

/**
 * Acompanha a busca que mostra o local. Se ela falhar, a pessoa continua no
 * passo em que estava, com o erro na tela, para tentar de novo.
 */
function mostrarLocal(busca, aoFalhar) {
  mostrandoLocal = true;
  busca
    .fail(function () {
      if (ativo) {
        aoFalhar();
      }
    })
    .always(function () {
      mostrandoLocal = false;
    });
}

/**
 * 403: a sessão caiu ou o token CSRF ficou velho. A API diz qual; se a sessão
 * caiu, o menu volta a mostrar Entrar, e a mensagem diz o que fazer.
 */
function conferirSessao(formulario, campos, acao) {
  carregarSessao()
    .done(function () {
      const geral = logado() ? mensagemDeFalha(acao, 403) : SESSAO_TERMINOU;
      mostrarErros(formulario, campos, { porCampo: {}, geral });
    })
    .fail(function (resposta) {
      const geral = mensagemDeFalha(acao, resposta.status);
      mostrarErros(formulario, campos, { porCampo: {}, geral });
    });
}

function limparFormularioDoLocal() {
  limparErros("local");
  $("#local-nome, #local-endereco").val("");
  $("#local-municipio").prop("selectedIndex", 0);
  // "Não sei" volta a ser a resposta de cada comodidade.
  $('#form-local input[type="radio"][value=""]').prop("checked", true);
}

function limparFormularioDoEquipamento() {
  limparErros("equipamento");
  $("#form-equipamento").find("input").val("");
  $("#equipamento-tipo").val("");
  atualizarCamposDoTipo();
}
