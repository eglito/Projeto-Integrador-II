import { opcoesDeRaio, parametrosDaBusca, raioDaArea, validarAltura } from "../js/busca.js";

// Centro padrão de /api/opcoes/ (Araraquara).
const CENTRO = { latitude: -21.7886713, longitude: -48.1773096 };

QUnit.module("busca.js: opções de raio", function () {
  QUnit.test("os degraus até o máximo, com o padrão", function (assert) {
    assert.deepEqual(opcoesDeRaio(2000, 10000), [500, 1000, 2000, 5000, 10000]);
  });

  QUnit.test("corta o que passa do máximo e inclui padrão e máximo fora dos degraus", function (assert) {
    assert.deepEqual(opcoesDeRaio(1500, 3000), [500, 1000, 1500, 2000, 3000]);
  });
});

QUnit.module("busca.js: raio da área visível", function () {
  QUnit.test("arredonda para cima até 100 m", function (assert) {
    assert.deepEqual(raioDaArea(3351.2, 10000), { raio: 3400, limitado: false });
    assert.deepEqual(raioDaArea(3400, 10000), { raio: 3400, limitado: false });
  });

  QUnit.test("nunca fica abaixo de 100 m", function (assert) {
    assert.deepEqual(raioDaArea(12, 10000), { raio: 100, limitado: false });
  });

  QUnit.test("limita ao máximo da API e avisa que cortou a área", function (assert) {
    assert.deepEqual(raioDaArea(25000, 10000), { raio: 10000, limitado: true });
    assert.deepEqual(raioDaArea(10000, 10000), { raio: 10000, limitado: false });
  });
});

QUnit.module("busca.js: altura digitada", function () {
  QUnit.test("vazio é sem filtro", function (assert) {
    assert.deepEqual(validarAltura(""), { valor: null });
    assert.deepEqual(validarAltura("   "), { valor: null });
  });

  QUnit.test("inteiro maior que zero vale", function (assert) {
    assert.deepEqual(validarAltura(" 90 "), { valor: 90 });
  });

  QUnit.test("zero, negativo, decimal e texto viram erro que diz como corrigir", function (assert) {
    for (const texto of ["0", "-5", "9,5", "9.5", "noventa"]) {
      assert.true(validarAltura(texto).erro.startsWith("Informe a altura em centímetros"), texto);
    }
  });
});

QUnit.module("busca.js: parâmetros da API", function () {
  QUnit.test("sem filtros, só o ponto e o raio", function (assert) {
    const busca = { ...CENTRO, raio: 2000, tipo: "", alturaMaxima: null };
    assert.strictEqual(
      $.param(parametrosDaBusca(busca)),
      "latitude=-21.7886713&longitude=-48.1773096&raio=2000",
    );
  });

  QUnit.test("com filtros, nos nomes que a API espera", function (assert) {
    const busca = { ...CENTRO, raio: 10000, tipo: "barra_australiana", alturaMaxima: 90 };
    assert.strictEqual(
      $.param(parametrosDaBusca(busca)),
      "latitude=-21.7886713&longitude=-48.1773096&raio=10000&tipo=barra_australiana&altura_maxima=90",
    );
  });
});
