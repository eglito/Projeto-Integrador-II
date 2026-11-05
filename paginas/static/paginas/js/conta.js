/**
 * Configurações (especificação, 2.5; README, decisões 23 e 32): troca do nome
 * de usuário e da senha no painel. As duas trocas pedem a senha atual: quem
 * achar a sessão aberta num computador emprestado não muda a conta.
 *
 * As funções puras do início são testadas no QUnit (decisão 35). Os erros
 * aparecem como nos formulários da sessão (formularios.js).
 */

import { enviar } from "./api.js";
import { anunciar } from "./anuncio.js";
import {
  limparErros,
  mensagemDeFalha,
  mostrarErros,
  prepararFormulario,
  separarErros,
} from "./formularios.js";
import { fecharMenu, mostrarVisao } from "./layout.js";
import { atualizarUsuario, carregarSessao, logado, usuarioAtual } from "./sessao.js";

// Campos da API em cada formulário, com o id e o rótulo na tela, na ordem da tela.
const CAMPOS = {
  "conta-nome": {
    username: { id: "conta-nome-usuario", rotulo: "Novo nome de usuário" },
    senha_atual: { id: "conta-nome-senha", rotulo: "Senha atual" },
  },
  "conta-senha": {
    senha_atual: { id: "conta-senha-atual", rotulo: "Senha atual" },
    nova_senha: { id: "conta-senha-nova", rotulo: "Senha nova" },
  },
};

// A API responde "Este campo é obrigatório." à senha nova vazia, sem dizer qual
// campo: a conferência fica no front, como na sessão.
const VAZIOS = {
  username: "Informe o novo nome de usuário.",
  senha_atual: "Informe a sua senha atual para confirmar a troca.",
  nova_senha: "Informe a senha nova.",
};

// O que cada formulário tenta fazer, para a mensagem de falha (formularios.js).
const ACOES = { "conta-nome": "trocar o nome", "conta-senha": "trocar a senha" };

export const SENHA_TROCADA =
  "Senha trocada. Esta sessão continua aberta, e as outras sessões da sua conta foram encerradas.";

export const SESSAO_TERMINOU =
  "Sua sessão terminou. Entre de novo pelo menu para mudar as configurações.";

/**
 * O nome como a API o grava: sem espaços nas pontas e normalizado (Unicode
 * NFKC), então "ｍａｒｉａ" é "maria" (Docs/API.md, 5.1).
 */
export function normalizarNome(nome) {
  return nome.trim().normalize("NFKC");
}

/**
 * Erros conferidos antes de ir à API: campos vazios e, na troca de nome, o
 * nome que já é o seu. A API aceitaria o mesmo nome e diria que trocou.
 * Senhas não passam por trim: espaços podem fazer parte delas.
 */
export function errosAntesDeEnviar(formulario, dados, nomeAtual) {
  const erros = {};
  for (const campo of Object.keys(CAMPOS[formulario])) {
    const vazio = campo === "username" ? !dados[campo].trim() : dados[campo] === "";
    if (vazio) {
      erros[campo] = VAZIOS[campo];
    }
  }
  if (formulario === "conta-nome" && !erros.username && normalizarNome(dados.username) === nomeAtual) {
    erros.username = "Esse já é o seu nome de usuário. Digite um nome diferente.";
  }
  return erros;
}

/** Anúncio da troca de nome: o nome aparece no menu e na autoria (RN-08). */
export function mensagemNomeTrocado(nome) {
  return `Nome de usuário trocado para ${nome}. Ele aparece no menu e nos locais que você cadastrou.`;
}

/** "Nome atual: maria.", no topo do formulário do nome. */
export function textoNomeAtual(nome) {
  return `Nome atual: ${nome}.`;
}

// Um pedido de cada vez em cada formulário.
const enviando = { "conta-nome": false, "conta-senha": false };

/** Liga o item Configurações do menu e os dois formulários. */
export function iniciarConta() {
  for (const formulario of Object.keys(CAMPOS)) {
    prepararFormulario(formulario);
    $(`#form-${formulario}`).on("submit", function (evento) {
      evento.preventDefault();
      enviarFormulario(formulario);
    });
  }
  $("#menu-configuracoes").on("click", function () {
    fecharMenu({ devolverFoco: false });
    abrirConfiguracoes();
  });
  // "Voltar à lista" e Esc, como em Buscar: o foco vai para o título da lista.
  $("#voltar-das-configuracoes").on("click", () => mostrarVisao("lista"));
  $("#visao-configuracoes").on("keydown", function (evento) {
    if (evento.key === "Escape") {
      mostrarVisao("lista");
    }
  });
}

/** Abre Configurações com os campos vazios e o nome atual à vista. */
function abrirConfiguracoes() {
  for (const formulario of Object.keys(CAMPOS)) {
    limparErros(formulario);
    $(`#form-${formulario} input`).val("");
  }
  $("#conta-nome-atual").text(textoNomeAtual(usuarioAtual().username));
  mostrarVisao("configuracoes");
}

function enviarFormulario(formulario) {
  if (enviando[formulario]) {
    return; // o anúncio "Trocando…" já está no ar
  }
  const campos = CAMPOS[formulario];
  const dados = {};
  for (const [campo, { id }] of Object.entries(campos)) {
    dados[campo] = $(`#${id}`).val();
  }
  limparErros(formulario);
  const antes = errosAntesDeEnviar(formulario, dados, usuarioAtual()?.username);
  if (Object.keys(antes).length) {
    mostrarErros(formulario, campos, { porCampo: antes, geral: null });
    return;
  }

  enviando[formulario] = true;
  const trocaDeNome = formulario === "conta-nome";
  anunciar(trocaDeNome ? "Trocando o nome…" : "Trocando a senha…");
  const pedido = trocaDeNome
    ? enviar("PUT", "/api/auth/conta/", dados)
    : enviar("POST", "/api/auth/conta/senha/", dados);
  pedido
    .done(function (resposta) {
      // Senhas e nome saem dos campos; o foco fica no botão, e o resultado é anunciado.
      $(`#form-${formulario} input`).val("");
      if (trocaDeNome) {
        // A resposta traz o nome como a API o gravou, já normalizado.
        atualizarUsuario(resposta);
        $("#conta-nome-atual").text(textoNomeAtual(resposta.username));
        anunciar(mensagemNomeTrocado(resposta.username));
      } else {
        anunciar(SENHA_TROCADA);
      }
    })
    .fail(function (resposta) {
      if (resposta.status === 400) {
        mostrarErros(formulario, campos, separarErros(resposta.responseJSON, campos));
      } else if (resposta.status === 403) {
        conferirSessao(formulario);
      } else {
        const geral = mensagemDeFalha(ACOES[formulario], resposta.status);
        mostrarErros(formulario, campos, { porCampo: {}, geral });
      }
    })
    .always(function () {
      enviando[formulario] = false;
    });
}

/**
 * 403: a sessão caiu (a senha foi trocada em outro lugar, por exemplo) ou o
 * token CSRF ficou velho. A API diz qual; se a sessão caiu, o menu já volta a
 * mostrar Entrar, e a mensagem diz o que fazer.
 */
function conferirSessao(formulario) {
  const campos = CAMPOS[formulario];
  carregarSessao()
    .done(function () {
      const geral = logado() ? mensagemDeFalha(ACOES[formulario], 403) : SESSAO_TERMINOU;
      mostrarErros(formulario, campos, { porCampo: {}, geral });
    })
    .fail(function (resposta) {
      const geral = mensagemDeFalha(ACOES[formulario], resposta.status);
      mostrarErros(formulario, campos, { porCampo: {}, geral });
    });
}
