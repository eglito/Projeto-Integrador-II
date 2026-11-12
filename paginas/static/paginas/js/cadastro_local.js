/**
 * Adicionar local (especificação, seção 3; plano, etapas 12 e 13), em dois
 * passos dentro da mesma visão do painel:
 *
 * 1. O ponto, por três entradas equivalentes: a mira no centro do mapa com
 *    "Usar o centro do mapa" (o caminho pelo teclado e a alternativa a arrastar,
 *    WCAG 2.5.7), o clique no mapa e o endereço.
 * 2. O nome e as comodidades, com o fluxo do 409 quando o lugar pode já existir
 *    (Docs/API.md, 6.2). Com o 201, o principal.js leva a pessoa à visão dos
 *    equipamentos (contribuicoes.js).
 *
 * O modo vale enquanto a visão "Adicionar local" está no painel: sair dela por
 * qualquer caminho o encerra (principal.js, aoTrocarVisao).
 *
 * As funções puras do início são testadas no QUnit (decisão 35).
 */

import { anunciar } from "./anuncio.js";
import { enviar } from "./api.js";
import { esconderBuscaNaArea, oferecerBuscaNaArea } from "./busca.js";
import { esconderResultados, iniciarBuscaEndereco, limparFormulario } from "./endereco.js";
import { tratarFalha } from "./falhas.js";
import { formatarDistancia } from "./formatacao.js";
import { limparErros, mostrarErros, prepararFormulario } from "./formularios.js";
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

// Seis casas decimais no envio: cerca de 11 cm. Um clique do Leaflet traz 15
// casas, que não dizem nada a mais sobre o lugar.
const CASAS_DO_ENVIO = 6;

// Campos da API no formulário do local, com o id e o rótulo na tela, na ordem da tela.
const CAMPOS = {
  nome: { id: "novo-local-nome", rotulo: "Nome do local" },
  endereco: { id: "novo-local-endereco", rotulo: "Endereço" },
  municipio_ibge: { id: "novo-local-municipio", rotulo: "Município" },
  tem_bebedouro: { id: "novo-local-bebedouro", rotulo: "Bebedouro" },
  tem_sanitario: { id: "novo-local-sanitario", rotulo: "Sanitário" },
  tem_bancos: { id: "novo-local-bancos", rotulo: "Bancos" },
};

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

/** "sim", "nao" e "" do seletor viram true, false e null: sem resposta é "não informado", e não "não tem". */
export function valorDaComodidade(escolha) {
  if (escolha === "sim") {
    return true;
  }
  if (escolha === "nao") {
    return false;
  }
  return null;
}

/**
 * Erros conferidos antes de ir à API. Só o nome: a API diz o que está errado
 * nos outros campos, e a regra do nome repetido não se confere no front.
 */
export function errosDoLocal({ nome }) {
  return nome.trim() ? {} : { nome: "Informe o nome do local." };
}

/**
 * Corpo do POST /api/locais/. `dados` traz os textos do formulário, e `ponto`, a
 * escolha de { latitude, longitude }. O endereço em branco fica de fora, e as
 * comodidades sem resposta vão como null. `confirmarNovo` é a saída do 409:
 * "é outro lugar" (Docs/API.md, 6.2).
 */
export function corpoDoLocal(dados, { latitude, longitude }, confirmarNovo = false) {
  const corpo = {
    nome: dados.nome.trim(),
    municipio_ibge: Number(dados.municipio_ibge),
    latitude: Number(latitude.toFixed(CASAS_DO_ENVIO)),
    longitude: Number(longitude.toFixed(CASAS_DO_ENVIO)),
    tem_bebedouro: valorDaComodidade(dados.tem_bebedouro),
    tem_sanitario: valorDaComodidade(dados.tem_sanitario),
    tem_bancos: valorDaComodidade(dados.tem_bancos),
  };
  if (dados.endereco.trim()) {
    corpo.endereco = dados.endereco.trim();
  }
  if (confirmarNovo) {
    corpo.confirmar_novo = true;
  }
  return corpo;
}

/** "Rua 3. A 84 m do ponto escolhido.": o que ajuda a reconhecer o candidato do 409. */
export function textoDuplicata({ endereco, distancia_m }) {
  const partes = [];
  if (endereco) {
    partes.push(`${endereco}.`);
  }
  if (distancia_m !== null && distancia_m !== undefined) {
    partes.push(`A ${formatarDistancia(distancia_m)} do ponto escolhido.`);
  }
  return partes.join(" ");
}

/** Anúncio do 409: quantos locais parecidos e as duas saídas. */
export function textoAvisoDeDuplicata(quantidade) {
  const parecidos = quantidade === 1 ? "Há 1 local parecido" : `Há ${quantidade} locais parecidos`;
  return `Este lugar pode já estar cadastrado. ${parecidos}. Se o seu é um deles, abra o local e avalie; se é outro lugar, cadastre mesmo assim.`;
}

// O modo está aberto, e o ponto escolhido nele: { latitude, longitude, origem, endereco }.
let ativo = false;
let ponto = null;
// "ponto" ou "dados": o passo do formulário. No passo "dados" o ponto está
// confirmado, e clique no mapa ou endereço atrasado não o trocam sem a pessoa saber.
let etapa = "ponto";
// Para "Buscar nesta área" voltar ao fim do modo: se o mapa foi para outra área
// durante ele (a pessoa o moveu, ou ele foi até um endereço) e se o botão
// estava na tela na entrada (o modo o esconde).
let mapaMudouNoModo = false;
let buscarNaAreaNaEntrada = false;
let enviando = false;
// Candidatos do último 409, por id, e o endereço que o próprio formulário
// preencheu (para não apagar um que a pessoa digitou).
let candidatos = new Map();
let enderecoAutomatico = "";

export function modoCadastroAtivo() {
  return ativo;
}

/**
 * Liga o item do menu, os botões do modo e os formulários. `centroPadrao` é a
 * referência do Nominatim, como na visão Buscar (decisão 28); `municipios`, as
 * opções do formulário. `aoCadastrar(local)` roda com o 201, e
 * `aoEscolherExistente(local)`, no "É este lugar" do 409.
 */
export function iniciarCadastroLocal({ centroPadrao, municipios, aoCadastrar, aoEscolherExistente }) {
  $("#menu-adicionar").on("click", function () {
    fecharMenu({ devolverFoco: false });
    comecarCadastro();
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
  $("#continuar-cadastro").on("click", irParaDados);
  $("#cancelar-cadastro").on("click", cancelar);

  // Passo 2: o formulário do local e o fluxo do 409.
  prepararFormulario("novo-local");
  preencherMunicipios(municipios);
  $("#mudar-ponto").on("click", voltarAoPonto);
  $("#form-novo-local").on("submit", function (evento) {
    evento.preventDefault();
    enviarLocal({ confirmarNovo: false, aoCadastrar });
  });
  $("#outro-lugar").on("click", () => enviarLocal({ confirmarNovo: true, aoCadastrar }));
  $("#corrigir-dados").on("click", voltarAoFormulario);
  $("#lista-duplicatas").on("click", "[data-local]", function () {
    aoEscolherExistente(candidatos.get(Number($(this).attr("data-local"))));
  });

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

/**
 * Município do formulário, das opções da API. Com um só, o seletor fica
 * escondido (escolher entre uma opção não ajuda ninguém) e o texto diz qual é.
 */
function preencherMunicipios(municipios) {
  const seletor = $("#novo-local-municipio").empty();
  for (const { valor, rotulo } of municipios) {
    $("<option>", { value: valor }).text(rotulo).appendTo(seletor);
  }
  const unico = municipios.length === 1;
  $("#novo-local-municipio-campo").prop("hidden", unico);
  $("#novo-local-municipio-fixo")
    .text(unico ? `Município: ${municipios[0].rotulo}.` : "")
    .prop("hidden", !unico);
}

/**
 * "Adicionar local", do menu e da lista vazia. Exige login (especificação, 2.5):
 * sem sessão, vai a Entrar, e depois do login a pessoa volta ao modo.
 */
export function comecarCadastro() {
  if (logado()) {
    entrarNoModoCadastro();
  } else {
    pedirLogin({ acao: "adicionar" });
  }
}

/** Abre o modo: a mira e "Usar o centro do mapa" aparecem, e o mapa troca de instruções. */
export function entrarNoModoCadastro() {
  ativo = true;
  ponto = null;
  etapa = "ponto";
  removerNovoLocal();
  $("#ponto-escolhido").prop("hidden", true);
  $("#passo-ponto").prop("hidden", false);
  $("#passo-dados").prop("hidden", true);
  // Sem o erro ou os endereços de uma vez anterior.
  limparFormulario("endereco-local");
  reiniciarFormulario();
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
  // Uma resposta que chega com o modo já encerrado, ou com o ponto já confirmado
  // no passo 2, não muda nada.
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
 * "Continuar": o ponto está confirmado, e o formulário do local toma o lugar da
 * escolha. A mira e o botão do centro saem, o marcador do ponto continua no
 * mapa. Pelo endereço, o campo Endereço já vem com ele (a pessoa pode mudar).
 */
function irParaDados() {
  if (!ponto) {
    return;
  }
  etapa = "dados";
  $("#passo-ponto").prop("hidden", true);
  $("#passo-dados").prop("hidden", false);
  $("#mira, #usar-centro").prop("hidden", true);
  // As instruções da mira não valem mais.
  $("#mapa").attr("aria-describedby", "mapa-instrucoes");
  $("#dados-ponto").text(`${textoPontoEscolhido(ponto)} ${textoCoordenadas(ponto.latitude, ponto.longitude)}`);

  // Só troca o endereço se está vazio ou ainda é o que o formulário preencheu antes.
  const campo = $("#novo-local-endereco");
  if (campo.val() === "" || campo.val() === enderecoAutomatico) {
    enderecoAutomatico = ponto.origem === "endereco" ? ponto.endereco : "";
    campo.val(enderecoAutomatico);
  }
  mostrarFormulario();
  $("#titulo-dados").trigger("focus");
  anunciar("Passo 2: nome e comodidades do local.");
}

/** "Mudar o ponto": de volta ao passo 1, com o ponto ainda marcado e a mira de novo no mapa. */
function voltarAoPonto() {
  etapa = "ponto";
  $("#passo-dados").prop("hidden", true);
  $("#passo-ponto").prop("hidden", false);
  $("#mira, #usar-centro").prop("hidden", false);
  $("#mapa").attr("aria-describedby", "mapa-instrucoes-cadastro");
  $("#titulo-ponto-escolhido").trigger("focus");
  anunciar("Voltou à escolha do ponto. O ponto escolhido continua marcado: escolha outro ou use Continuar.");
}

/** Formulário zerado, para o modo abrir sem o que sobrou de uma vez anterior. */
function reiniciarFormulario() {
  limparErros("novo-local");
  $("#form-novo-local").find("input[type=text]").val("");
  $("#novo-local-bebedouro, #novo-local-sanitario, #novo-local-bancos").val("");
  $("#novo-local-municipio").prop("selectedIndex", 0);
  enderecoAutomatico = "";
  candidatos = new Map();
  mostrarFormulario();
}

/** O formulário à vista, sem o aviso de duplicata. */
function mostrarFormulario() {
  $("#form-novo-local").prop("hidden", false);
  $("#duplicatas").prop("hidden", true);
}

/** "Voltar e corrigir os dados", no aviso de duplicata: o formulário volta como estava. */
function voltarAoFormulario() {
  mostrarFormulario();
  $("#novo-local-nome").trigger("focus");
}

/**
 * Envia o cadastro. Com 201, o principal.js segue (`aoCadastrar`). Com 409, o
 * aviso de duplicata toma o lugar do formulário, e "É outro lugar" chama de
 * novo com `confirmarNovo`. O 400 vai para o campo certo.
 */
function enviarLocal({ confirmarNovo, aoCadastrar }) {
  if (enviando) {
    return; // o anúncio "Cadastrando…" já está no ar
  }
  const dados = {};
  for (const [campo, { id }] of Object.entries(CAMPOS)) {
    dados[campo] = $(`#${id}`).val() ?? "";
  }
  limparErros("novo-local");
  const antes = errosDoLocal(dados);
  if (Object.keys(antes).length) {
    mostrarFormulario();
    mostrarErros("novo-local", CAMPOS, { porCampo: antes, geral: null });
    return;
  }

  enviando = true;
  anunciar("Cadastrando o local…");
  enviar("POST", "/api/locais/", corpoDoLocal(dados, ponto, confirmarNovo))
    .done(function (local) {
      // Com a pessoa já fora do modo (rede lenta), o local existe, mas a tela fica onde ela está.
      if (!ativo) {
        anunciar(`Local ${local.nome} cadastrado.`);
        return;
      }
      aoCadastrar(local);
    })
    .fail(function (resposta) {
      if (resposta.status === 409) {
        mostrarDuplicatas(resposta.responseJSON?.possiveis_duplicatas ?? []);
        return;
      }
      // Um erro no "É outro lugar" aparece no formulário, e não no aviso que está na tela.
      mostrarFormulario();
      tratarFalha("novo-local", CAMPOS, "cadastrar o local", resposta);
    })
    .always(function () {
      enviando = false;
    });
}

/**
 * O 409: lista os locais parecidos no lugar do formulário. A API traz um texto
 * (`detail`), mas ele cita o campo `confirmar_novo`, que é do contrato e não de
 * quem usa a página: o aviso é nosso e diz as duas saídas.
 */
function mostrarDuplicatas(possiveis) {
  if (!ativo) {
    return;
  }
  candidatos = new Map(possiveis.map((local) => [local.id, local]));
  const lista = $("#lista-duplicatas").empty();
  for (const local of possiveis) {
    const item = $("<li>").appendTo(lista);
    $("<p>").append($("<strong>").text(local.nome)).appendTo(item);
    $("<p>").text(textoDuplicata(local)).appendTo(item);
    // O nome acessível começa pelo texto visível (WCAG 2.5.3) e acrescenta o local.
    $("<button>", { type: "button", "data-local": local.id })
      .text("É este lugar")
      .append($("<span>", { class: "visualmente-oculto" }).text(`: ${local.nome}`))
      .appendTo(item);
  }
  $("#form-novo-local").prop("hidden", true);
  $("#duplicatas").prop("hidden", false);
  $("#titulo-duplicatas").trigger("focus");
  anunciar(textoAvisoDeDuplicata(possiveis.length));
}
