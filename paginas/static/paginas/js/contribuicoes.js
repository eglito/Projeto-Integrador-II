/**
 * Contribuições num local que já existe (especificação, 2.4; plano, etapa 14):
 * avaliar a segurança e a limpeza, registrar a condição de um equipamento,
 * denunciar o local e acrescentar um equipamento. Cada uma é uma visão do painel
 * com um formulário e uma rota da API, e todas terminam do mesmo jeito: a
 * pessoa volta aos detalhes do local, já atualizados.
 *
 * O que muda de um formulário para o outro (campos, regras, rota e mensagem) é
 * dado, numa tabela (FORMULARIOS), e um código só os envia. É como um
 * Map<String, Estratégia> em Java, no lugar de quatro métodos quase iguais.
 *
 * As funções puras do início são testadas no QUnit (decisão 35).
 */

import { anunciar } from "./anuncio.js";
import { enviar } from "./api.js";
import { validarMedida } from "./busca.js";
import { nomeEquipamento } from "./detalhes.js";
import { tratarFalha } from "./falhas.js";
import { limparErros, mostrarErros, prepararFormulario } from "./formularios.js";
import { mostrarVisao } from "./layout.js";

// Regras do banco que o formulário repete para o erro 400 não ser a primeira
// notícia delas (Docs/API.md, 6.4; locais/models.py, restrições).
const FAIXA_COM_ILUMINACAO_OBRIGATORIA = "noite"; // RN-05
const TIPO_COM_NOME = "outro";
const TIPO_COM_LARGURA = "barras_paralelas";

// Primeira opção de cada seletor: sem resposta pré-escolhida, ninguém envia por engano.
const ESCOLHA = "Escolha uma opção";
const NAO_INFORMAR = "Não informar";

// A API responde "Este campo é obrigatório." sem dizer qual: a conferência do
// campo vazio fica no front, com a mensagem que diz o que fazer.
const MENSAGENS = {
  faixa_horario: "Escolha a faixa de horário da sua visita.",
  movimento: "Escolha como estava o movimento de pessoas.",
  iluminacao: "Escolha como estava a iluminação: nas visitas à noite, ela é obrigatória.",
  limpeza: "Escolha como estava a limpeza do local.",
  equipamento: "Escolha o equipamento.",
  condicao: "Escolha a condição em que o equipamento está.",
  motivo: "Escolha o motivo da denúncia.",
  tipo: "Escolha o tipo do equipamento.",
  nome_outro: "Informe o nome do equipamento, porque o tipo é “Outro”.",
};

/** À noite a iluminação é obrigatória (RN-05); nas outras faixas, é opcional. */
export function iluminacaoObrigatoria(faixa) {
  return faixa === FAIXA_COM_ILUMINACAO_OBRIGATORIA;
}

/** Campos vazios da avaliação: { campo: "Escolha…" }, ou {} quando nada falta. */
export function errosDaAvaliacao({ faixa_horario, movimento, iluminacao, limpeza }) {
  const erros = {};
  if (!faixa_horario) {
    erros.faixa_horario = MENSAGENS.faixa_horario;
  }
  if (!movimento) {
    erros.movimento = MENSAGENS.movimento;
  }
  if (iluminacaoObrigatoria(faixa_horario) && !iluminacao) {
    erros.iluminacao = MENSAGENS.iluminacao;
  }
  if (!limpeza) {
    erros.limpeza = MENSAGENS.limpeza;
  }
  return erros;
}

/** Corpo do POST da avaliação. A iluminação em branco fica de fora: só à noite ela é obrigatória. */
export function corpoDaAvaliacao({ faixa_horario, movimento, iluminacao, limpeza }) {
  const corpo = { faixa_horario, movimento, limpeza };
  if (iluminacao) {
    corpo.iluminacao = iluminacao;
  }
  return corpo;
}

/** Campos vazios do registro de condição. */
export function errosDoRegistro({ equipamento, condicao }) {
  const erros = {};
  if (!equipamento) {
    erros.equipamento = MENSAGENS.equipamento;
  }
  if (!condicao) {
    erros.condicao = MENSAGENS.condicao;
  }
  return erros;
}

/** Motivo vazio da denúncia. */
export function errosDaDenuncia({ motivo }) {
  return motivo ? {} : { motivo: MENSAGENS.motivo };
}

/**
 * Erros do equipamento: tipo vazio, nome faltando no tipo "Outro" e medidas que
 * não são inteiros maiores que zero. A largura só vale para barras paralelas, e
 * um campo que não se aplica ao tipo escolhido não é conferido.
 */
export function errosDoEquipamento({ tipo, nome_outro, altura_cm, largura_cm }) {
  const erros = {};
  if (!tipo) {
    erros.tipo = MENSAGENS.tipo;
  }
  if (tipo === TIPO_COM_NOME && !nome_outro.trim()) {
    erros.nome_outro = MENSAGENS.nome_outro;
  }
  const altura = validarMedida(altura_cm, "altura");
  if (altura.erro) {
    erros.altura_cm = altura.erro;
  }
  if (tipo === TIPO_COM_LARGURA) {
    const largura = validarMedida(largura_cm, "largura");
    if (largura.erro) {
      erros.largura_cm = largura.erro;
    }
  }
  return erros;
}

/**
 * Corpo do POST do equipamento, com os campos já conferidos. O nome só vai no
 * tipo "Outro" e a largura só nas barras paralelas (restrições do banco), e as
 * medidas em branco ficam de fora.
 */
export function corpoDoEquipamento({ tipo, nome_outro, altura_cm, largura_cm }) {
  const corpo = { tipo };
  if (tipo === TIPO_COM_NOME) {
    corpo.nome_outro = nome_outro.trim();
  }
  const altura = validarMedida(altura_cm, "altura").valor ?? null;
  if (altura !== null) {
    corpo.altura_cm = altura;
  }
  const largura = tipo === TIPO_COM_LARGURA ? (validarMedida(largura_cm, "largura").valor ?? null) : null;
  if (largura !== null) {
    corpo.largura_cm = largura;
  }
  return corpo;
}

/** "altura 220 cm, largura 50 cm", só com o que foi informado, ou "" sem medidas. */
function textoMedidas({ altura_cm, largura_cm }) {
  const partes = [];
  if (altura_cm) {
    partes.push(`altura ${altura_cm} cm`);
  }
  if (largura_cm) {
    partes.push(`largura ${largura_cm} cm`);
  }
  return partes.join(", ");
}

/**
 * Opções do seletor de equipamentos, [{ valor: id, rotulo }]. O rótulo é o nome
 * (o do tipo "Outro" ou o do tipo) com as medidas entre parênteses; duas barras
 * fixas iguais ganham "nº 1" e "nº 2", senão ninguém as distinguiria.
 */
export function rotulosDosEquipamentos(equipamentos) {
  const bases = equipamentos.map(function (equipamento) {
    const medidas = textoMedidas(equipamento);
    return medidas ? `${nomeEquipamento(equipamento)} (${medidas})` : nomeEquipamento(equipamento);
  });
  const repeticoes = new Map();
  for (const base of bases) {
    repeticoes.set(base, (repeticoes.get(base) ?? 0) + 1);
  }
  const vistos = new Map();
  return equipamentos.map(function (equipamento, indice) {
    const base = bases[indice];
    if (repeticoes.get(base) === 1) {
      return { valor: equipamento.id, rotulo: base };
    }
    const numero = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, numero);
    return { valor: equipamento.id, rotulo: `${base}, nº ${numero}` };
  });
}

/** Anúncio do registro de condição: qual equipamento, qual condição e onde ela aparece. */
export function mensagemDaCondicao({ nome, equipamentos }, { condicao_nome }, idDoEquipamento) {
  const escolhido = rotulosDosEquipamentos(equipamentos).find(
    (opcao) => opcao.valor === Number(idDoEquipamento),
  );
  const rotulo = escolhido ? escolhido.rotulo : "equipamento";
  return `Condição registrada: ${condicao_nome} em ${rotulo}. Ela aparece nos detalhes de ${nome}, com a data de hoje.`;
}

/**
 * Anúncio ao concluir a visão de equipamentos, ou null quando não há o que
 * dizer (nenhum equipamento acrescentado, num local que já existia). Depois do
 * cadastro de um local, diz que ele já está no mapa e na lista.
 */
export function mensagemDeConclusao({ nome, aposCadastro }, acrescentados) {
  const total = acrescentados.length;
  if (aposCadastro) {
    const equipamentos = total === 1 ? "1 equipamento" : `${total} equipamentos`;
    const com = total ? ` com ${equipamentos}` : "";
    const depois = total
      ? ""
      : " Para acrescentar equipamentos, use Adicionar equipamento nos detalhes.";
    return `Local ${nome} cadastrado${com}. Ele já aparece no mapa e na lista.${depois}`;
  }
  if (total === 0) {
    return null;
  }
  const resumo = total === 1 ? "1 equipamento acrescentado" : `${total} equipamentos acrescentados`;
  return `${resumo} a ${nome}.`;
}

// Campos da API em cada formulário, com o id e o rótulo na tela, na ordem da tela.
const CAMPOS = {
  avaliar: {
    faixa_horario: { id: "avaliar-faixa", rotulo: "Faixa de horário" },
    movimento: { id: "avaliar-movimento", rotulo: "Movimento" },
    iluminacao: { id: "avaliar-iluminacao", rotulo: "Iluminação" },
    limpeza: { id: "avaliar-limpeza", rotulo: "Limpeza" },
  },
  condicao: {
    // O equipamento vai na rota, e não no corpo: a API nunca devolve erro dele.
    equipamento: { id: "condicao-equipamento", rotulo: "Equipamento" },
    condicao: { id: "condicao-condicao", rotulo: "Condição" },
  },
  equipamento: {
    tipo: { id: "equipamento-tipo", rotulo: "Tipo de equipamento" },
    nome_outro: { id: "equipamento-nome-outro", rotulo: "Nome do equipamento" },
    altura_cm: { id: "equipamento-altura", rotulo: "Altura" },
    largura_cm: { id: "equipamento-largura", rotulo: "Largura" },
  },
  denunciar: {
    motivo: { id: "denunciar-motivo", rotulo: "Motivo da denúncia" },
  },
};

/**
 * O que cada formulário faz. `rota(contexto, dados)` e `corpo(dados)` montam o
 * POST; `verbo` completa as mensagens de falha ("Não foi possível avaliar o
 * local"); `pronto(contexto, resposta, dados)` é o anúncio do sucesso.
 */
const FORMULARIOS = {
  avaliar: {
    erros: errosDaAvaliacao,
    corpo: corpoDaAvaliacao,
    rota: ({ local }) => `/api/locais/${local}/avaliacoes/`,
    verbo: "avaliar o local",
    enviando: "Enviando a avaliação…",
    pronto: ({ nome }) => `Avaliação registrada. Ela entra na tabela de segurança de ${nome}.`,
  },
  condicao: {
    erros: errosDoRegistro,
    corpo: ({ condicao }) => ({ condicao }),
    rota: (contexto, { equipamento }) => `/api/equipamentos/${equipamento}/registros-condicao/`,
    verbo: "registrar a condição",
    enviando: "Registrando a condição…",
    pronto: (contexto, resposta, { equipamento }) => mensagemDaCondicao(contexto, resposta, equipamento),
  },
  equipamento: {
    erros: errosDoEquipamento,
    corpo: corpoDoEquipamento,
    rota: ({ local }) => `/api/locais/${local}/equipamentos/`,
    verbo: "adicionar o equipamento",
    enviando: "Adicionando o equipamento…",
    pronto: ({ nome }, resposta) =>
      `Equipamento acrescentado a ${nome}: ${nomeEquipamento(resposta)}.`,
  },
  denunciar: {
    erros: errosDaDenuncia,
    corpo: ({ motivo }) => ({ motivo }),
    rota: ({ local }) => `/api/locais/${local}/denuncias/`,
    verbo: "denunciar o local",
    enviando: "Enviando a denúncia…",
    pronto: ({ nome }) =>
      `Denúncia enviada. A moderação vai analisar o que você relatou sobre ${nome}.`,
  },
};

// A contribuição aberta: { acao, local, nome, equipamentos, origem, aposCadastro }, ou null.
// `origem` diz quem abriu os detalhes (para o foco voltar lá); `aposCadastro`, que a
// visão de equipamentos veio do cadastro de um local novo.
let contexto = null;
// Nomes dos equipamentos acrescentados nesta visita à visão, para o resumo.
let acrescentados = [];
let enviando = false;
// Chamados pelo principal.js: concluir com uma mensagem, cancelar, e avisar que
// a busca ficou desatualizada (a lista mostra os tipos de equipamento).
let aoConcluir = function () {};
let aoCancelar = function () {};
let aoAcrescentar = function () {};

/** Troca as opções de um seletor: a primeira, sem valor, é o convite a escolher. */
function preencher(seletor, escolhas, vazio) {
  const campo = $(seletor).empty();
  $("<option>", { value: "" }).text(vazio).appendTo(campo);
  for (const { valor, rotulo } of escolhas) {
    $("<option>", { value: valor }).text(rotulo).appendTo(campo);
  }
}

/**
 * Monta os seletores com as opções de /api/opcoes/ (as listas não se repetem em
 * JavaScript, CLAUDE.md) e liga os formulários. `aoConcluir(contexto, mensagem)`
 * roda no sucesso, `aoCancelar(contexto)` em "Voltar…" e no Esc, e
 * `aoAcrescentar(contexto)` a cada equipamento acrescentado.
 */
export function iniciarContribuicoes({ opcoes, aoConcluir: concluir, aoCancelar: cancelar, aoAcrescentar: acrescentou }) {
  aoConcluir = concluir;
  aoCancelar = cancelar;
  aoAcrescentar = acrescentou;

  preencher("#avaliar-faixa", opcoes.faixas_horario, ESCOLHA);
  preencher("#avaliar-movimento", opcoes.movimento, ESCOLHA);
  preencher("#avaliar-iluminacao", opcoes.iluminacao, NAO_INFORMAR);
  preencher("#avaliar-limpeza", opcoes.limpeza, ESCOLHA);
  preencher("#condicao-condicao", opcoes.condicoes, ESCOLHA);
  preencher("#equipamento-tipo", opcoes.tipos_equipamento, ESCOLHA);
  preencher("#denunciar-motivo", opcoes.motivos_denuncia, ESCOLHA);

  for (const acao of Object.keys(FORMULARIOS)) {
    prepararFormulario(acao);
    $(`#form-${acao}`).on("submit", function (evento) {
      evento.preventDefault();
      enviarFormulario(acao);
    });
    // Esc sai da visão, como em Buscar e Configurações.
    $(`#visao-${acao}`).on("keydown", function (evento) {
      if (evento.key === "Escape") {
        sair();
      }
    });
  }
  $("[data-voltar-contribuicao]").on("click", sair);
  $("#concluir-equipamento").on("click", sair);
  $("#condicao-adicionar-equipamento").on("click", function () {
    abrirContribuicao("equipamento", contexto);
  });
  $("#avaliar-faixa").on("change", ajustarIluminacao);
  $("#equipamento-tipo").on("change", ajustarCamposDoEquipamento);
}

// Anúncio de cada formulário ao abrir, como "Detalhes de {nome}." nos detalhes: sem
// ele, a faixa de anúncios continuaria com o texto da tela anterior.
const ABERTURA = {
  avaliar: "Avaliar",
  condicao: "Registrar condição em",
  equipamento: "Adicionar equipamento a",
  denunciar: "Denunciar",
};

/**
 * Abre o formulário de `acao` ("avaliar", "condicao", "equipamento" ou
 * "denunciar") para o local de `novoContexto`: { local, nome, equipamentos,
 * origem, aposCadastro }. O foco vai para o título da visão. `mensagem` é o
 * anúncio, quando quem chama tem o que dizer ("Você entrou como…"); sem ela,
 * o anúncio diz qual formulário abriu.
 */
export function abrirContribuicao(acao, novoContexto, mensagem = null) {
  contexto = { ...novoContexto, acao };
  acrescentados = [];
  const visao = $(`#visao-${acao}`);
  visao.find(".local-da-contribuicao").text(`Local: ${contexto.nome}.`);
  visao.find("[data-voltar-contribuicao]").text(`Voltar a ${contexto.nome}`);
  // Formulário limpo, sem o que sobrou de uma vez anterior.
  limparErros(acao);
  visao.find("input, select").val("");
  if (acao === "avaliar") {
    ajustarIluminacao();
  } else if (acao === "condicao") {
    prepararRegistro();
  } else if (acao === "equipamento") {
    ajustarCamposDoEquipamento();
    $("#equipamentos-acrescentados").prop("hidden", true);
    $("#lista-acrescentados").empty();
  }
  mostrarVisao(acao);
  anunciar(mensagem ?? `${ABERTURA[acao]} ${contexto.nome}.`);
}

/** Voltar…, Esc e Concluir: de volta aos detalhes, com o resumo quando algo foi acrescentado. */
function sair() {
  if (!contexto) {
    return;
  }
  const mensagem = contexto.acao === "equipamento" ? mensagemDeConclusao(contexto, acrescentados) : null;
  if (mensagem) {
    aoConcluir(contexto, mensagem);
  } else {
    aoCancelar(contexto);
  }
}

/** À noite a iluminação é obrigatória: o campo avisa o leitor de tela, e a primeira opção muda de texto. */
function ajustarIluminacao() {
  const campo = $("#avaliar-iluminacao");
  const noite = iluminacaoObrigatoria($("#avaliar-faixa").val());
  if (noite) {
    campo.attr("aria-required", "true");
  } else {
    campo.removeAttr("aria-required");
  }
  campo.find('option[value=""]').text(noite ? ESCOLHA : NAO_INFORMAR);
}

/**
 * O seletor de equipamentos do local. Com um só, ele já vem escolhido. Sem
 * nenhum, o formulário dá lugar ao caminho para cadastrar o equipamento.
 */
function prepararRegistro() {
  const { equipamentos } = contexto;
  preencher("#condicao-equipamento", rotulosDosEquipamentos(equipamentos), ESCOLHA);
  if (equipamentos.length === 1) {
    $("#condicao-equipamento").val(String(equipamentos[0].id));
  }
  const semEquipamento = equipamentos.length === 0;
  $("#condicao-sem-equipamento").prop("hidden", !semEquipamento);
  $("#form-condicao").prop("hidden", semEquipamento);
}

/**
 * O nome só aparece no tipo "Outro", e a largura só nas barras paralelas. O
 * campo que sai de cena é esvaziado: o que sobrou de outro tipo não vai para a API.
 */
function ajustarCamposDoEquipamento() {
  const tipo = $("#equipamento-tipo").val();
  const comNome = tipo === TIPO_COM_NOME;
  const comLargura = tipo === TIPO_COM_LARGURA;
  $("#equipamento-nome-outro-campo").prop("hidden", !comNome);
  $("#equipamento-largura-campo").prop("hidden", !comLargura);
  if (!comNome) {
    $("#equipamento-nome-outro").val("");
  }
  if (!comLargura) {
    $("#equipamento-largura").val("");
  }
}

function enviarFormulario(acao) {
  if (enviando) {
    return; // o anúncio "Enviando…" já está no ar
  }
  const formulario = FORMULARIOS[acao];
  const campos = CAMPOS[acao];
  // Guardado agora: se a pessoa abrir outra contribuição enquanto a resposta
  // não chega, ela ainda diz respeito a este local.
  const alvo = contexto;
  const dados = {};
  for (const [campo, { id }] of Object.entries(campos)) {
    dados[campo] = $(`#${id}`).val() ?? "";
  }
  limparErros(acao);
  const antes = formulario.erros(dados);
  if (Object.keys(antes).length) {
    mostrarErros(acao, campos, { porCampo: antes, geral: null });
    return;
  }

  enviando = true;
  anunciar(formulario.enviando);
  enviar("POST", formulario.rota(alvo, dados), formulario.corpo(dados))
    .done(function (resposta) {
      depoisDoEnvio(acao, alvo, dados, resposta);
    })
    .fail(function (resposta) {
      tratarFalha(acao, campos, formulario.verbo, resposta);
    })
    .always(function () {
      enviando = false;
    });
}

/**
 * O envio deu certo. Se a pessoa já saiu da visão (a rede estava lenta), só o
 * anúncio acontece, e a tela fica onde ela está. Equipamento: o formulário
 * volta limpo para o próximo; as outras contribuições voltam aos detalhes.
 */
function depoisDoEnvio(acao, alvo, dados, resposta) {
  const mensagem = FORMULARIOS[acao].pronto(alvo, resposta, dados);
  const naTela = !$(`#visao-${acao}`).prop("hidden");
  if (acao === "equipamento") {
    // A lista de locais mostra os tipos de equipamento: ela precisa se atualizar.
    aoAcrescentar(alvo);
  }
  if (!naTela) {
    anunciar(mensagem);
    return;
  }
  if (acao !== "equipamento") {
    aoConcluir(alvo, mensagem);
    return;
  }
  acrescentados.push(nomeEquipamento(resposta));
  mostrarAcrescentados();
  limparErros("equipamento");
  $("#form-equipamento").find("input, select").val("");
  ajustarCamposDoEquipamento();
  // O foco volta ao primeiro campo, para o próximo equipamento.
  $("#equipamento-tipo").trigger("focus");
  anunciar(`${mensagem} Acrescente outro equipamento ou use Concluir.`);
}

/** Lista o que já foi acrescentado nesta visita, para quem lê saber o que falta. */
function mostrarAcrescentados() {
  const lista = $("#lista-acrescentados").empty();
  for (const nome of acrescentados) {
    $("<li>").text(nome).appendTo(lista);
  }
  $("#equipamentos-acrescentados").prop("hidden", acrescentados.length === 0);
}
