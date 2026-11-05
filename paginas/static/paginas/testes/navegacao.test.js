import { idDaUrl, urlComLocal } from "../js/navegacao.js";

QUnit.module("navegacao.js: ?local=id", function () {
  QUnit.test("sem o parâmetro, nenhum local", function (assert) {
    assert.strictEqual(idDaUrl(""), null);
    assert.strictEqual(idDaUrl("?filtro=x"), null);
  });

  QUnit.test("um id inteiro maior que zero", function (assert) {
    assert.strictEqual(idDaUrl("?local=7"), 7);
    assert.strictEqual(idDaUrl("?x=1&local=12"), 12);
  });

  QUnit.test("qualquer outro valor é inválido, e não vai à API", function (assert) {
    for (const query of ["?local=abc", "?local=0", "?local=-3", "?local=7.5", "?local=", "?local=07"]) {
      assert.strictEqual(idDaUrl(query), "invalido", query);
    }
  });
});

QUnit.module("navegacao.js: URL do histórico", function () {
  QUnit.test("abre o local na mesma página", function (assert) {
    assert.strictEqual(urlComLocal("http://localhost:8000/", 7), "/?local=7");
    assert.strictEqual(urlComLocal("http://localhost:8000/?local=7", 8), "/?local=8");
  });

  QUnit.test("fecha o local tirando só o parâmetro", function (assert) {
    assert.strictEqual(urlComLocal("http://localhost:8000/?local=7", null), "/");
    assert.strictEqual(urlComLocal("http://localhost:8000/?x=1&local=7", null), "/?x=1");
  });
});
