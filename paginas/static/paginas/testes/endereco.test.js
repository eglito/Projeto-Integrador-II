import {
  chaveDeCache,
  esperaParaNovaBusca,
  parametrosNominatim,
  rotuloEndereco,
  validarTextoEndereco,
} from "../js/endereco.js";

// Centro padrão de /api/opcoes/ (Araraquara).
const CENTRO = { latitude: -21.7886713, longitude: -48.1773096, zoom: 14 };

QUnit.module("endereco.js: parâmetros do Nominatim", function () {
  QUnit.test("Brasil, português, até 5 resultados, em JSON", function (assert) {
    const parametros = parametrosNominatim("  Praça da Matriz  ", CENTRO);
    assert.strictEqual(parametros.q, "Praça da Matriz");
    assert.strictEqual(parametros.countrycodes, "br");
    assert.strictEqual(parametros["accept-language"], "pt-BR");
    assert.strictEqual(parametros.limit, 5);
    assert.strictEqual(parametros.format, "jsonv2");
  });

  QUnit.test("o viewbox sai do centro padrão e só dá preferência", function (assert) {
    const parametros = parametrosNominatim("Rua São Bento", CENTRO);
    assert.strictEqual(parametros.viewbox, "-48.3773,-21.5887,-47.9773,-21.9887");
    assert.strictEqual(parametros.bounded, 0);
  });
});

QUnit.module("endereco.js: uma busca por segundo", function () {
  QUnit.test("a primeira busca sai na hora", function (assert) {
    assert.strictEqual(esperaParaNovaBusca(null, 5000), 0);
  });

  QUnit.test("dentro de 1 s, espera o que falta", function (assert) {
    assert.strictEqual(esperaParaNovaBusca(5000, 5300), 700);
  });

  QUnit.test("depois de 1 s, sai na hora", function (assert) {
    assert.strictEqual(esperaParaNovaBusca(5000, 6000), 0);
    assert.strictEqual(esperaParaNovaBusca(5000, 9000), 0);
  });
});

QUnit.module("endereco.js: rótulo, cache e validação", function () {
  QUnit.test("o rótulo tira região e país e mantém o CEP", function (assert) {
    assert.strictEqual(
      rotuloEndereco(
        "Rua São Bento, Vila Ferroviária, Araraquara, São Paulo, Região Sudeste, 14801-210, Brasil",
      ),
      "Rua São Bento, Vila Ferroviária, Araraquara, São Paulo, 14801-210",
    );
  });

  QUnit.test("a chave do cache ignora maiúsculas e espaços a mais", function (assert) {
    assert.strictEqual(chaveDeCache("  Praça   da MATRIZ "), "praça da matriz");
  });

  QUnit.test("texto vazio vira erro que diz o que digitar", function (assert) {
    assert.true(validarTextoEndereco("   ").erro.startsWith("Digite um endereço"));
    assert.deepEqual(validarTextoEndereco(" Praça da Matriz "), { texto: "Praça da Matriz" });
  });
});
