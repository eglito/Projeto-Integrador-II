import { PROXIMO_PASSO, textoCoordenadas, textoPontoEscolhido } from "../js/cadastro_local.js";

QUnit.module("cadastro_local.js: ponto escolhido", function () {
  QUnit.test("diz como o ponto foi escolhido, nas três entradas", function (assert) {
    assert.strictEqual(textoPontoEscolhido({ origem: "centro" }), "Ponto escolhido pelo centro do mapa.");
    assert.strictEqual(textoPontoEscolhido({ origem: "clique" }), "Ponto escolhido por um clique no mapa.");
    assert.strictEqual(
      textoPontoEscolhido({ origem: "endereco", endereco: "Praça da Matriz, Centro, Araraquara" }),
      "Ponto escolhido pelo endereço Praça da Matriz, Centro, Araraquara.",
    );
  });

  QUnit.test("coordenadas em pt-BR, com vírgula e cinco casas", function (assert) {
    assert.strictEqual(
      textoCoordenadas(-21.7827686, -48.1793589),
      "Latitude -21,78277, longitude -48,17936.",
    );
    assert.strictEqual(textoCoordenadas(-21.5, -48), "Latitude -21,50000, longitude -48,00000.");
  });

  QUnit.test("Continuar avisa que o formulário chega numa próxima versão", function (assert) {
    assert.true(PROXIMO_PASSO.startsWith("Nome e comodidades do novo local chegam numa próxima versão."));
  });
});
