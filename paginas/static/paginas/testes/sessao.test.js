import {
  camposVazios,
  mensagemDeContribuicao,
  rotuloVoltar,
  textoContexto,
  textoUsuario,
} from "../js/sessao.js";

QUnit.module("sessao.js: campos vazios", function () {
  QUnit.test("nome e senha preenchidos: nada a corrigir", function (assert) {
    assert.deepEqual(camposVazios({ username: "maria", password: "uma senha" }), {});
  });

  QUnit.test("vazios: a mensagem diz o que falta", function (assert) {
    assert.deepEqual(camposVazios({ username: "  ", password: "" }), {
      username: "Informe o nome de usuário.",
      password: "Informe a senha.",
    });
  });

  QUnit.test("senha só com espaços conta como preenchida: espaço vale na senha", function (assert) {
    assert.deepEqual(camposVazios({ username: "maria", password: "   " }), {});
  });
});

QUnit.module("sessao.js: ação pendente", function () {
  const pendente = { local: 7, nome: "Parque Infantil", acao: "avaliar", origem: null };

  QUnit.test("o contexto diz o que a pessoa ia fazer e que volta ao local", function (assert) {
    assert.strictEqual(
      textoContexto(pendente),
      "Entre ou crie uma conta para avaliar Parque Infantil. Depois, você volta para este local.",
    );
    assert.strictEqual(
      textoContexto({ ...pendente, acao: "condicao" }),
      "Entre ou crie uma conta para registrar a condição de um equipamento de Parque Infantil. Depois, você volta para este local.",
    );
  });

  QUnit.test("o botão do topo diz para onde volta", function (assert) {
    assert.strictEqual(rotuloVoltar(pendente), "Voltar a Parque Infantil");
    assert.strictEqual(rotuloVoltar(null), "Voltar à lista");
  });

  QUnit.test("adicionar um local também pede o login, e a volta é ao modo", function (assert) {
    assert.strictEqual(
      textoContexto({ acao: "adicionar" }),
      "Entre ou crie uma conta para adicionar um local. Depois, você volta para escolher o ponto.",
    );
    // Sem local de origem, o botão do topo volta à lista.
    assert.strictEqual(rotuloVoltar({ acao: "adicionar" }), "Voltar à lista");
  });

  QUnit.test("com login, cada ação avisa que chega numa próxima versão", function (assert) {
    for (const acao of ["avaliar", "condicao", "denunciar"]) {
      const mensagem = mensagemDeContribuicao(acao);
      assert.true(mensagem.includes("ainda não está disponível"), acao);
      assert.true(mensagem.endsWith("Essa função chega numa próxima versão."), acao);
    }
  });

  QUnit.test("o menu mostra o nome de quem está conectado", function (assert) {
    assert.strictEqual(textoUsuario("maria"), "Conectado como maria");
  });
});
