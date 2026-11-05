import {
  camposVazios,
  mensagemDeContribuicao,
  mensagemDeFalha,
  rotuloVoltar,
  separarErros,
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

QUnit.module("sessao.js: erros da API", function () {
  QUnit.test("erros de campo ficam no campo, com as mensagens juntas", function (assert) {
    const corpo = {
      password: [
        "Esta senha é muito curta. Ela precisa conter pelo menos 8 caracteres.",
        "Esta senha é inteiramente numérica.",
      ],
    };
    assert.deepEqual(separarErros(corpo), {
      porCampo: {
        password:
          "Esta senha é muito curta. Ela precisa conter pelo menos 8 caracteres. Esta senha é inteiramente numérica.",
      },
      geral: null,
    });
  });

  QUnit.test("non_field_errors vai para o topo do formulário", function (assert) {
    const corpo = {
      non_field_errors: ["Usuário ou senha incorretos. Confira os dois campos e tente de novo."],
    };
    assert.deepEqual(separarErros(corpo), {
      porCampo: {},
      geral: "Usuário ou senha incorretos. Confira os dois campos e tente de novo.",
    });
  });

  QUnit.test("sem conexão: confira a conexão; 403 e 500: recarregue", function (assert) {
    assert.true(mensagemDeFalha("entrar", 0).startsWith("Não foi possível entrar. Confira a conexão"));
    assert.strictEqual(
      mensagemDeFalha("cadastro", 403),
      "Não foi possível criar a conta agora. Recarregue a página e tente de novo.",
    );
    assert.false(mensagemDeFalha("entrar", 403).includes("CSRF"));
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
