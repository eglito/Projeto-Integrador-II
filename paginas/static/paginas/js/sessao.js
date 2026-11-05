/**
 * Sessão no painel (especificação, 2.5 e 2.6; README, decisões 22 e 32):
 * entrar, criar conta e sair sem sair da página. Quem pediu o login para
 * contribuir volta ao local e à ação que pediu, como o SavedRequest do Spring
 * Security devolve a pessoa à URL que exigiu autenticação.
 *
 * O token CSRF muda no login (Docs/API.md, seção 2); o api.js lê o cookie a
 * cada requisição, então nada aqui guarda o token.
 *
 * As funções puras do início são testadas no QUnit (decisão 35).
 */

import { enviar, obter } from "./api.js";
import { anunciar } from "./anuncio.js";
import {
  limparErros,
  mensagemDeFalha,
  mostrarErros,
  prepararFormulario,
  separarErros,
} from "./formularios.js";
import { fecharMenu, mostrarVisao } from "./layout.js";

/** Campos da API em Entrar e Criar conta, com o id e o rótulo na tela. */
function camposDe(formulario) {
  return {
    username: { id: `${formulario}-usuario`, rotulo: "Nome de usuário" },
    password: { id: `${formulario}-senha`, rotulo: "Senha" },
  };
}

// O que cada operação tenta fazer, para a mensagem de falha (formularios.js).
const ACOES_DA_SESSAO = { entrar: "entrar", cadastro: "criar a conta", sair: "sair" };

// A API responde "Este campo é obrigatório.", sem dizer qual: a conferência
// do campo vazio fica no front, com mensagem que diz o que fazer.
const VAZIOS = {
  username: "Informe o nome de usuário.",
  password: "Informe a senha.",
};

// Ações de contribuição (especificação, 2.4). `alvo` completa o contexto do
// login ("Entre para avaliar Parque Infantil"); `indisponivel` é o anúncio até
// a função existir (plano, etapa 9).
const ACOES = {
  avaliar: {
    alvo: "avaliar",
    indisponivel: "Avaliar a segurança e a limpeza do local ainda não está disponível.",
  },
  condicao: {
    alvo: "registrar a condição de um equipamento de",
    indisponivel: "Registrar a condição de um equipamento ainda não está disponível.",
  },
  denunciar: {
    alvo: "denunciar",
    indisponivel: "Denunciar um local ainda não está disponível.",
  },
};

/** Campos vazios, conferidos antes de ir à API: { username: "Informe…" }, ou {} quando nada falta. */
export function camposVazios({ username, password }) {
  const erros = {};
  if (!username.trim()) {
    erros.username = VAZIOS.username;
  }
  // A senha não passa por trim: espaços podem fazer parte dela.
  if (password === "") {
    erros.password = VAZIOS.password;
  }
  return erros;
}

/**
 * Contexto no topo de Entrar e Criar conta quando uma ação pediu o login: uma
 * contribuição num local ou, sem local, adicionar um (plano, etapa 12).
 */
export function textoContexto({ acao, nome }) {
  if (acao === "adicionar") {
    return "Entre ou crie uma conta para adicionar um local. Depois, você volta para escolher o ponto.";
  }
  return `Entre ou crie uma conta para ${ACOES[acao].alvo} ${nome}. Depois, você volta para este local.`;
}

/** Botão do topo de Entrar e Criar conta: diz para onde volta. */
export function rotuloVoltar(pendente) {
  return pendente?.nome ? `Voltar a ${pendente.nome}` : "Voltar à lista";
}

/** Anúncio de uma ação de contribuição, com login, até ela ser implementada. */
export function mensagemDeContribuicao(acao) {
  return `${ACOES[acao].indisponivel} Essa função chega numa próxima versão.`;
}

/** "Conectado como maria", no topo do menu. */
export function textoUsuario(nome) {
  return `Conectado como ${nome}`;
}

// Usuário da sessão ({ id, username }) ou null para visitante.
let usuario = null;
// Ação que pediu o login: { local, nome, acao, origem }, ou null.
let pendente = null;
let enviando = false;

/**
 * Pergunta à API se há sessão. A mesma chamada grava o cookie csrftoken, sem
 * o qual login e cadastro respondem 403 (Docs/API.md, seção 2).
 */
export function carregarSessao() {
  return obter("/api/auth/sessao/").done(function (resposta) {
    definirUsuario(resposta.usuario);
  });
}

export function logado() {
  return usuario !== null;
}

/** Usuário da sessão, { id, username }, ou null para visitante. */
export function usuarioAtual() {
  return usuario;
}

/**
 * Menu e convite para contribuir acompanham a sessão. Exportada como
 * atualizarUsuario para a troca de nome (conta.js) mostrar o nome novo no menu.
 */
function definirUsuario(novo) {
  usuario = novo;
  $("#menu-usuario")
    .text(novo ? textoUsuario(novo.username) : "")
    .prop("hidden", !novo);
  $("#item-entrar").prop("hidden", Boolean(novo));
  $("#item-configuracoes, #item-sair").prop("hidden", !novo);
  $("#contribuir-ajuda").prop("hidden", Boolean(novo));
}

export { definirUsuario as atualizarUsuario };

/**
 * Liga menu e formulários. `aoEntrar(usuario, pendente, { novaConta, naTela })`
 * roda depois do login ou do cadastro; `naTela` diz se a pessoa ainda estava em
 * Entrar ou Criar conta quando a resposta chegou. `aoCancelar(pendente)` roda
 * no "Voltar…" e no Esc.
 */
export function iniciarSessao({ aoEntrar, aoCancelar }) {
  prepararFormulario("entrar");
  prepararFormulario("cadastro");

  $("#menu-entrar").on("click", function () {
    fecharMenu({ devolverFoco: false });
    pedirLogin(null);
  });
  $("#menu-sair").on("click", sair);
  $("#ir-para-cadastro").on("click", () => mostrarVisao("cadastro"));
  $("#ir-para-entrar").on("click", () => mostrarVisao("entrar"));

  for (const formulario of ["entrar", "cadastro"]) {
    $(`#form-${formulario}`).on("submit", function (evento) {
      evento.preventDefault();
      enviarFormulario(formulario, aoEntrar);
    });
  }

  function cancelar() {
    const acao = pendente;
    pendente = null;
    aoCancelar(acao);
  }
  $("[data-cancelar-login]").on("click", cancelar);
  $("#visao-entrar, #visao-cadastro").on("keydown", function (evento) {
    if (evento.key === "Escape") {
      cancelar();
    }
  });
}

/**
 * Abre Entrar. `novoPendente` é a ação que pediu o login, { local, nome, acao,
 * origem }, ou null quando a pessoa escolheu Entrar no menu.
 */
export function pedirLogin(novoPendente) {
  pendente = novoPendente;
  $(".contexto-login")
    .text(pendente ? textoContexto(pendente) : "")
    .prop("hidden", !pendente);
  $("[data-cancelar-login]").text(rotuloVoltar(pendente));
  limparErros("entrar");
  limparErros("cadastro");
  mostrarVisao("entrar");
}

function enviarFormulario(formulario, aoEntrar) {
  if (enviando) {
    return; // o anúncio "Entrando…" já está no ar
  }
  const dados = {
    username: $(`#${formulario}-usuario`).val(),
    password: $(`#${formulario}-senha`).val(),
  };
  limparErros(formulario);
  const vazios = camposVazios(dados);
  if (Object.keys(vazios).length) {
    mostrarErros(formulario, camposDe(formulario), { porCampo: vazios, geral: null });
    return;
  }

  enviando = true;
  anunciar(formulario === "entrar" ? "Entrando…" : "Criando a conta…");
  const rota = formulario === "entrar" ? "/api/auth/login/" : "/api/auth/cadastro/";
  enviar("POST", rota, dados)
    .done(function (novoUsuario) {
      definirUsuario(novoUsuario);
      // Num aparelho compartilhado, nada do que foi digitado fica nos campos.
      $("#form-entrar, #form-cadastro").find("input").val("");
      // Com a rede lenta, a pessoa pode ter saído de Entrar antes da resposta
      // (Esc, menu ou Voltar do navegador): aí a tela fica onde ela está.
      const naTela = $("#visao-entrar, #visao-cadastro").filter(":not([hidden])").length > 0;
      const acao = naTela ? pendente : null;
      pendente = null;
      aoEntrar(novoUsuario, acao, { novaConta: formulario === "cadastro", naTela });
    })
    .fail(function (resposta) {
      const campos = camposDe(formulario);
      if (resposta.status === 400) {
        mostrarErros(formulario, campos, separarErros(resposta.responseJSON, campos));
      } else {
        const geral = mensagemDeFalha(ACOES_DA_SESSAO[formulario], resposta.status);
        mostrarErros(formulario, campos, { porCampo: {}, geral });
      }
    })
    .always(function () {
      enviando = false;
    });
}

/**
 * Sair: a pessoa continua no mapa, como visitante (decisão 22), e o foco volta
 * ao botão Menu. Se a sessão já tinha terminado (403), a página confere com a
 * API e diz isso. Toda falha é anunciada, com o que fazer.
 */
function sair() {
  fecharMenu();
  enviar("POST", "/api/auth/logout/")
    .done(function () {
      definirUsuario(null);
      tirarConfiguracoesDaTela();
      anunciar("Você saiu da conta. O mapa continua aberto, e você pode entrar de novo pelo menu.");
    })
    .fail(function (resposta) {
      if (resposta.status !== 403) {
        anunciar(mensagemDeFalha(ACOES_DA_SESSAO.sair, resposta.status));
        return;
      }
      carregarSessao()
        .done(function () {
          if (logado()) {
            anunciar(mensagemDeFalha(ACOES_DA_SESSAO.sair, resposta.status));
            return;
          }
          // A sessão tinha caído (a senha foi trocada em outra janela, por
          // exemplo): a pessoa queria sair, e saiu.
          tirarConfiguracoesDaTela();
          anunciar("Sua sessão já tinha terminado. Você está como visitante.");
        })
        .fail(function (conferencia) {
          anunciar(mensagemDeFalha(ACOES_DA_SESSAO.sair, conferencia.status));
        });
    });
}

/**
 * Depois de Sair, Configurações não fica na tela de um visitante: o painel
 * volta para a lista, sem tirar o foco do botão Menu (plano, etapa 11).
 */
function tirarConfiguracoesDaTela() {
  if (!$("#visao-configuracoes").prop("hidden")) {
    mostrarVisao("lista", { focar: false, frente: false });
  }
}
