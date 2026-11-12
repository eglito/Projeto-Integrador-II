import { mensagemDeSessaoCaida } from "../js/falhas.js";

QUnit.module("falhas.js: sessão que caiu", function () {
  QUnit.test("diz para entrar de novo e o que a pessoa ia fazer", function (assert) {
    assert.strictEqual(
      mensagemDeSessaoCaida("avaliar o local"),
      "Sua sessão terminou. Entre de novo pelo menu para avaliar o local.",
    );
    assert.strictEqual(
      mensagemDeSessaoCaida("cadastrar o local"),
      "Sua sessão terminou. Entre de novo pelo menu para cadastrar o local.",
    );
  });
});
