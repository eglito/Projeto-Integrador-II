import { mensagemDeFalha, separarErros } from "../js/formularios.js";

// Campos de Entrar, como o sessao.js os descreve.
const CAMPOS = {
  username: { id: "entrar-usuario", rotulo: "Nome de usuário" },
  password: { id: "entrar-senha", rotulo: "Senha" },
};

QUnit.module("formularios.js: erros da API", function () {
  QUnit.test("erros de campo ficam no campo, com as mensagens juntas", function (assert) {
    const corpo = {
      password: [
        "Esta senha é muito curta. Ela precisa conter pelo menos 8 caracteres.",
        "Esta senha é inteiramente numérica.",
      ],
    };
    assert.deepEqual(separarErros(corpo, CAMPOS), {
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
    assert.deepEqual(separarErros(corpo, CAMPOS), {
      porCampo: {},
      geral: "Usuário ou senha incorretos. Confira os dois campos e tente de novo.",
    });
  });

  QUnit.test("campo que o formulário não tem também vai para o topo", function (assert) {
    const corpo = { senha_atual: ["Senha atual incorreta. Digite a senha que você usa para entrar."] };
    assert.deepEqual(separarErros(corpo, CAMPOS), {
      porCampo: {},
      geral: "Senha atual incorreta. Digite a senha que você usa para entrar.",
    });
  });
});

QUnit.module("formularios.js: falhas", function () {
  QUnit.test("sem conexão: confira a conexão; 403 e 500: recarregue", function (assert) {
    assert.true(mensagemDeFalha("entrar", 0).startsWith("Não foi possível entrar. Confira a conexão"));
    assert.strictEqual(
      mensagemDeFalha("criar a conta", 403),
      "Não foi possível criar a conta agora. Recarregue a página e tente de novo.",
    );
    assert.false(mensagemDeFalha("entrar", 403).includes("CSRF"));
  });

  QUnit.test("sair: a rede manda conferir a conexão; o servidor, recarregar", function (assert) {
    assert.strictEqual(
      mensagemDeFalha("sair", 0),
      "Não foi possível sair. Confira a conexão com a internet e tente de novo.",
    );
    assert.strictEqual(
      mensagemDeFalha("sair", 500),
      "Não foi possível sair agora. Recarregue a página e tente de novo.",
    );
  });
});
