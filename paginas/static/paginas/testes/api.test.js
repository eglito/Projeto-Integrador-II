import { exigirBarraFinal, lerCookie, precisaCsrf } from "../js/api.js";

QUnit.module("api.js: lerCookie", function () {
  QUnit.test("encontra o cookie entre outros", function (assert) {
    const cookies = "sessionid=abc; csrftoken=xyz123; tema=claro";
    assert.strictEqual(lerCookie("csrftoken", cookies), "xyz123");
  });

  QUnit.test("devolve null quando o cookie não existe", function (assert) {
    assert.strictEqual(lerCookie("csrftoken", "tema=claro"), null);
    assert.strictEqual(lerCookie("csrftoken", ""), null);
  });

  QUnit.test("não confunde com um nome que só termina igual", function (assert) {
    assert.strictEqual(lerCookie("csrftoken", "xcsrftoken=errado"), null);
  });

  QUnit.test("decodifica o valor", function (assert) {
    assert.strictEqual(lerCookie("local", "local=Pra%C3%A7a%20Central"), "Praça Central");
  });
});

QUnit.module("api.js: precisaCsrf", function () {
  QUnit.test("métodos que alteram dados na API levam o token", function (assert) {
    assert.true(precisaCsrf("POST", "/api/locais/"));
    assert.true(precisaCsrf("patch", "/api/locais/7/"));
    assert.true(precisaCsrf("PUT", "/api/locais/7/foto/"));
  });

  QUnit.test("leitura não leva o token", function (assert) {
    assert.false(precisaCsrf("GET", "/api/locais/"));
  });

  QUnit.test("a URL assinada do envio de foto não leva o token", function (assert) {
    assert.false(precisaCsrf("PUT", "/armazenamento-local/token-assinado/"));
    assert.false(precisaCsrf("PUT", "https://storage.googleapis.com/bucket/objeto"));
  });
});

QUnit.module("api.js: exigirBarraFinal", function () {
  QUnit.test("aceita a URL com a barra, com ou sem query string", function (assert) {
    assert.strictEqual(exigirBarraFinal("/api/locais/"), "/api/locais/");
    assert.strictEqual(exigirBarraFinal("/api/locais/?raio=2000"), "/api/locais/?raio=2000");
  });

  QUnit.test("URL de outro servidor passa sem conferência", function (assert) {
    const bucket = "https://storage.googleapis.com/bucket/objeto?assinatura=abc";
    const nominatim = "https://nominatim.openstreetmap.org/search?q=Araraquara";
    assert.strictEqual(exigirBarraFinal(bucket), bucket);
    assert.strictEqual(exigirBarraFinal(nominatim), nominatim);
  });

  QUnit.test("recusa a URL sem a barra e diz como corrigir", function (assert) {
    assert.throws(() => exigirBarraFinal("/api/locais"), /Use \/api\/locais\//);
    assert.throws(() => exigirBarraFinal("/api/locais?raio=2000"), /Use \/api\/locais\//);
  });
});
