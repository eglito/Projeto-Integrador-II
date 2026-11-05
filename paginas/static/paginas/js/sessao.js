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
import { fecharMenu, mostrarVisao } from "./layout.js";

// Campos da API e o fim do id do campo na página ("entrar-usuario", "cadastro-senha").
const CAMPOS = { username: "usuario", password: "senha" };

const ROTULOS = { username: "Nome de usuário", password: "Senha" };

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
 * Separa o corpo de um 400 (Docs/API.md, seção 3) em erros por campo, com as
 * mensagens de cada um juntas, e o erro geral: non_field_errors, ou o de um
 * campo que o formulário não tem.
 */
export function separarErros(corpo) {
  const porCampo = {};
  const gerais = [];
  for (const [campo, mensagens] of Object.entries(corpo ?? {})) {
    const lista = [].concat(mensagens);
    if (campo in CAMPOS) {
      porCampo[campo] = lista.join(" ");
    } else {
      gerais.push(...lista);
    }
  }
  return { porCampo, geral: gerais.length ? gerais.join(" ") : null };
}

// O que a pessoa tentava fazer, para a mensagem de falha.
const ACOES_DA_SESSAO = { entrar: "entrar", cadastro: "criar a conta", sair: "sair" };

/**
 * Falha que não é erro de campo, ao entrar, criar a conta ou sair: sem conexão
 * (status 0), 403 com o token CSRF antigo ou 500. O texto da API, em inglês no
 * caso do CSRF, não chega à tela.
 */
export function mensagemDeFalha(operacao, status) {
  const acao = ACOES_DA_SESSAO[operacao];
  if (status === 0) {
    return `Não foi possível ${acao}. Confira a conexão com a internet e tente de novo.`;
  }
  return `Não foi possível ${acao} agora. Recarregue a página e tente de novo.`;
}

/** Contexto no topo de Entrar e Criar conta quando uma ação pediu o login. */
export function textoContexto({ acao, nome }) {
  return `Entre ou crie uma conta para ${ACOES[acao].alvo} ${nome}. Depois, você volta para este local.`;
}

/** Botão do topo de Entrar e Criar conta: diz para onde volta. */
export function rotuloVoltar(pendente) {
  return pendente ? `Voltar a ${pendente.nome}` : "Voltar à lista";
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

/** Menu e convite para contribuir acompanham a sessão. */
function definirUsuario(novo) {
  usuario = novo;
  $("#menu-usuario")
    .text(novo ? textoUsuario(novo.username) : "")
    .prop("hidden", !novo);
  $("#item-entrar").prop("hidden", Boolean(novo));
  $("#item-sair").prop("hidden", !novo);
  $("#contribuir-ajuda").prop("hidden", Boolean(novo));
}

/**
 * Liga menu e formulários. `aoEntrar(usuario, pendente, { novaConta, naTela })`
 * roda depois do login ou do cadastro; `naTela` diz se a pessoa ainda estava em
 * Entrar ou Criar conta quando a resposta chegou. `aoCancelar(pendente)` roda
 * no "Voltar…" e no Esc.
 */
export function iniciarSessao({ aoEntrar, aoCancelar }) {
  // O aria-describedby de cada campo, sem erro: a ajuda, quando há.
  $("#form-entrar input, #form-cadastro input").each(function () {
    $(this).data("descricao", $(this).attr("aria-describedby") || "");
  });

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
    mostrarErros(formulario, { porCampo: vazios, geral: null });
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
      if (resposta.status === 400) {
        mostrarErros(formulario, separarErros(resposta.responseJSON));
      } else {
        mostrarErros(formulario, { porCampo: {}, geral: mensagemDeFalha(formulario, resposta.status) });
      }
    })
    .always(function () {
      enviando = false;
    });
}

/**
 * Erros junto dos campos, ligados a eles por aria-describedby, e o geral no
 * topo do formulário (Docs/API.md, seção 3). O foco vai para o erro geral ou
 * para o primeiro campo com erro, e o anúncio repete tudo.
 */
function mostrarErros(formulario, { porCampo, geral }) {
  const mensagens = [];
  if (geral) {
    $(`#${formulario}-erro-geral`).text(geral).prop("hidden", false);
    mensagens.push(geral);
  }
  let primeiroCampo = null;
  for (const [campo, sufixo] of Object.entries(CAMPOS)) {
    if (!porCampo[campo]) {
      continue;
    }
    const id = `${formulario}-${sufixo}`;
    $(`#${id}-erro`).text(porCampo[campo]).prop("hidden", false);
    const entrada = $(`#${id}`);
    entrada.attr({
      "aria-invalid": "true",
      "aria-describedby": `${entrada.data("descricao")} ${id}-erro`.trim(),
    });
    mensagens.push(`${ROTULOS[campo]}: ${porCampo[campo]}`);
    primeiroCampo ??= entrada;
  }
  (geral ? $(`#${formulario}-erro-geral`) : primeiroCampo).trigger("focus");
  anunciar(mensagens.join(" "));
}

function limparErros(formulario) {
  $(`#${formulario}-erro-geral`).text("").prop("hidden", true);
  $(`#form-${formulario} .erro`).not(".erro-geral").text("").prop("hidden", true);
  $(`#form-${formulario} input`).each(function () {
    const entrada = $(this).removeAttr("aria-invalid");
    if (entrada.data("descricao")) {
      entrada.attr("aria-describedby", entrada.data("descricao"));
    } else {
      entrada.removeAttr("aria-describedby");
    }
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
      anunciar("Você saiu da conta. O mapa continua aberto, e você pode entrar de novo pelo menu.");
    })
    .fail(function (resposta) {
      if (resposta.status !== 403) {
        anunciar(mensagemDeFalha("sair", resposta.status));
        return;
      }
      carregarSessao()
        .done(function () {
          anunciar(
            logado()
              ? mensagemDeFalha("sair", resposta.status)
              : "Sua sessão já tinha terminado. Você está como visitante.",
          );
        })
        .fail(function (conferencia) {
          anunciar(mensagemDeFalha("sair", conferencia.status));
        });
    });
}
