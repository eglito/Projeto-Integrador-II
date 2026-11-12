/**
 * O que fazer quando um envio de formulário falha (Docs/API.md, seção 3), igual
 * para os formulários de contribuição e o de adicionar local: o 400 vai para o
 * campo certo, o 403 confere a sessão e o resto diz o que fazer.
 *
 * Entrar, Criar conta e Configurações tratam as próprias falhas (sessao.js e
 * conta.js), com regras que só valem para eles.
 */

import { mensagemDeFalha, mostrarErros, separarErros } from "./formularios.js";
import { carregarSessao, logado } from "./sessao.js";

/** Sessão que caiu no meio do formulário: diz o que fazer. `acao` é um infinitivo ("avaliar o local"). */
export function mensagemDeSessaoCaida(acao) {
  return `Sua sessão terminou. Entre de novo pelo menu para ${acao}.`;
}

/**
 * Mostra no formulário `nome` a falha de um envio. `campos` liga cada campo da
 * API ao id e ao rótulo na tela (formularios.js); `acao` completa as frases
 * ("avaliar o local").
 */
export function tratarFalha(nome, campos, acao, resposta) {
  if (resposta.status === 400) {
    const erros = separarErros(resposta.responseJSON, campos);
    // Um 400 sem corpo legível não deixaria nada a mostrar nem onde pôr o foco.
    if (!Object.keys(erros.porCampo).length && !erros.geral) {
      erros.geral = mensagemDeFalha(acao, resposta.status);
    }
    mostrarErros(nome, campos, erros);
  } else if (resposta.status === 403) {
    conferirSessao(nome, campos, acao);
  } else {
    mostrarErros(nome, campos, { porCampo: {}, geral: mensagemDeFalha(acao, resposta.status) });
  }
}

/**
 * 403: a sessão caiu (a senha foi trocada em outra janela, por exemplo) ou o
 * token CSRF ficou velho. A API não diz qual em texto que dê para mostrar: a
 * página pergunta à API se ainda há sessão, e o menu já volta a mostrar Entrar
 * se ela caiu.
 */
function conferirSessao(nome, campos, acao) {
  carregarSessao()
    .done(function () {
      const geral = logado() ? mensagemDeFalha(acao, 403) : mensagemDeSessaoCaida(acao);
      mostrarErros(nome, campos, { porCampo: {}, geral });
    })
    .fail(function (resposta) {
      mostrarErros(nome, campos, { porCampo: {}, geral: mensagemDeFalha(acao, resposta.status) });
    });
}
