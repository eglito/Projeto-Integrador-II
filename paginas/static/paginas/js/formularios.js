/**
 * Erros dos formulários do painel (Entrar, Criar conta e Configurações), todos
 * do mesmo jeito (Docs/API.md, seção 3; CLAUDE.md, Acessibilidade): o erro de
 * um campo fica junto dele, ligado por aria-describedby; o geral fica no topo;
 * o foco vai para o primeiro erro; e tudo é anunciado.
 *
 * Ids de um formulário `nome`: #form-{nome}, com o erro geral em
 * #{nome}-erro-geral; cada campo #{id}, com o erro em #{id}-erro.
 *
 * As funções puras do início são testadas no QUnit (decisão 35).
 */

import { anunciar } from "./anuncio.js";

/**
 * Separa o corpo de um 400 em erros por campo, com as mensagens de cada um
 * juntas, e o erro geral: non_field_errors, ou o de um campo que não está em
 * `campos` (o formulário não tem onde mostrá-lo).
 */
export function separarErros(corpo, campos) {
  const porCampo = {};
  const gerais = [];
  for (const [campo, mensagens] of Object.entries(corpo ?? {})) {
    const lista = [].concat(mensagens);
    if (campo in campos) {
      porCampo[campo] = lista.join(" ");
    } else {
      gerais.push(...lista);
    }
  }
  return { porCampo, geral: gerais.length ? gerais.join(" ") : null };
}

/**
 * Falha que não é erro de campo: sem conexão (status 0), 403 com o token CSRF
 * antigo ou 500. `acao` completa a frase ("entrar", "trocar a senha"). O texto
 * da API, em inglês no caso do CSRF, não chega à tela.
 */
export function mensagemDeFalha(acao, status) {
  if (status === 0) {
    return `Não foi possível ${acao}. Confira a conexão com a internet e tente de novo.`;
  }
  return `Não foi possível ${acao} agora. Recarregue a página e tente de novo.`;
}

/**
 * Guarda o aria-describedby de cada campo sem erro, isto é, a ajuda, quando há:
 * limparErros volta a ele, e mostrarErros soma o erro a ele.
 */
export function prepararFormulario(nome) {
  $(`#form-${nome} input`).each(function () {
    $(this).data("descricao", $(this).attr("aria-describedby") || "");
  });
}

/**
 * Mostra { porCampo, geral } no formulário `nome`. `campos` liga cada campo da
 * API ao id e ao rótulo na tela, na ordem da tela:
 * { username: { id: "entrar-usuario", rotulo: "Nome de usuário" } }.
 * O foco vai para o erro geral ou para o primeiro campo com erro, e o anúncio
 * repete tudo, com o rótulo de cada campo.
 */
export function mostrarErros(nome, campos, { porCampo, geral }) {
  const mensagens = [];
  if (geral) {
    $(`#${nome}-erro-geral`).text(geral).prop("hidden", false);
    mensagens.push(geral);
  }
  let primeiroCampo = null;
  for (const [campo, { id, rotulo }] of Object.entries(campos)) {
    if (!porCampo[campo]) {
      continue;
    }
    $(`#${id}-erro`).text(porCampo[campo]).prop("hidden", false);
    const entrada = $(`#${id}`);
    entrada.attr({
      "aria-invalid": "true",
      "aria-describedby": `${entrada.data("descricao")} ${id}-erro`.trim(),
    });
    mensagens.push(`${rotulo}: ${porCampo[campo]}`);
    primeiroCampo ??= entrada;
  }
  (geral ? $(`#${nome}-erro-geral`) : primeiroCampo).trigger("focus");
  anunciar(mensagens.join(" "));
}

/** Tira os erros do formulário `nome`; cada campo volta à descrição sem erro. */
export function limparErros(nome) {
  $(`#${nome}-erro-geral`).text("").prop("hidden", true);
  $(`#form-${nome} .erro`).not(".erro-geral").text("").prop("hidden", true);
  $(`#form-${nome} input`).each(function () {
    const entrada = $(this).removeAttr("aria-invalid");
    if (entrada.data("descricao")) {
      entrada.attr("aria-describedby", entrada.data("descricao"));
    } else {
      entrada.removeAttr("aria-describedby");
    }
  });
}
