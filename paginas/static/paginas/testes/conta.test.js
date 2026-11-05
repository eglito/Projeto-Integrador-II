import {
  errosAntesDeEnviar,
  mensagemNomeTrocado,
  normalizarNome,
  SENHA_TROCADA,
  SESSAO_TERMINOU,
  textoNomeAtual,
} from "../js/conta.js";

QUnit.module("conta.js: antes de enviar o nome", function () {
  QUnit.test("nome novo e senha atual preenchidos: nada a corrigir", function (assert) {
    const dados = { username: "maria2", senha_atual: "uma senha" };
    assert.deepEqual(errosAntesDeEnviar("conta-nome", dados, "maria"), {});
  });

  QUnit.test("vazios: cada mensagem diz o que falta", function (assert) {
    const dados = { username: "  ", senha_atual: "" };
    assert.deepEqual(errosAntesDeEnviar("conta-nome", dados, "maria"), {
      username: "Informe o novo nome de usuário.",
      senha_atual: "Informe a sua senha atual para confirmar a troca.",
    });
  });

  QUnit.test("o nome que já é o seu não vai à API, que diria que trocou", function (assert) {
    const erros = errosAntesDeEnviar("conta-nome", { username: " maria ", senha_atual: "x" }, "maria");
    assert.strictEqual(erros.username, "Esse já é o seu nome de usuário. Digite um nome diferente.");
  });

  QUnit.test("a imitação em largura total também é o mesmo nome, como na API", function (assert) {
    assert.strictEqual(normalizarNome("ｍａｒｉａ"), "maria");
    const erros = errosAntesDeEnviar("conta-nome", { username: "ｍａｒｉａ", senha_atual: "x" }, "maria");
    assert.true("username" in erros);
  });

  QUnit.test("controle: um nome parecido, mas diferente, passa", function (assert) {
    const erros = errosAntesDeEnviar("conta-nome", { username: "Maria", senha_atual: "x" }, "maria");
    assert.deepEqual(erros, {});
  });
});

QUnit.module("conta.js: antes de enviar a senha", function () {
  QUnit.test("vazios: senha atual e senha nova", function (assert) {
    assert.deepEqual(errosAntesDeEnviar("conta-senha", { senha_atual: "", nova_senha: "" }, "maria"), {
      senha_atual: "Informe a sua senha atual para confirmar a troca.",
      nova_senha: "Informe a senha nova.",
    });
  });

  QUnit.test("espaço conta como preenchido: pode fazer parte da senha", function (assert) {
    assert.deepEqual(errosAntesDeEnviar("conta-senha", { senha_atual: " ", nova_senha: "  " }, "maria"), {});
  });
});

QUnit.module("conta.js: textos", function () {
  QUnit.test("a troca de nome diz onde o nome novo aparece", function (assert) {
    assert.strictEqual(
      mensagemNomeTrocado("maria2"),
      "Nome de usuário trocado para maria2. Ele aparece no menu e nos locais que você cadastrou.",
    );
    assert.strictEqual(textoNomeAtual("maria"), "Nome atual: maria.");
  });

  QUnit.test("a troca de senha diz o que acontece com as sessões (decisão 23)", function (assert) {
    assert.true(SENHA_TROCADA.includes("Esta sessão continua aberta"));
    assert.true(SENHA_TROCADA.includes("as outras sessões da sua conta foram encerradas"));
  });

  QUnit.test("sessão que caiu: diz como voltar", function (assert) {
    assert.true(SESSAO_TERMINOU.includes("Entre de novo pelo menu"));
  });
});
