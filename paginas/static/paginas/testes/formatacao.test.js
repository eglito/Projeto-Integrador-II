import {
  formatarDistancia,
  resumoBusca,
  rotuloComodidade,
  textoComodidades,
  textoDistancia,
  textoEquipamentos,
} from "../js/formatacao.js";

// Rótulos como /api/opcoes/ devolve (tipos_equipamento).
const TIPOS = [
  { valor: "barra_fixa", rotulo: "Barra fixa" },
  { valor: "barras_paralelas", rotulo: "Barras paralelas" },
  { valor: "outro", rotulo: "Outro" },
];

QUnit.module("formatacao.js: distância", function () {
  QUnit.test("abaixo de 1 km, em metros inteiros", function (assert) {
    assert.strictEqual(formatarDistancia(0), "0 m");
    assert.strictEqual(formatarDistancia(646.4), "646 m");
  });

  QUnit.test("a partir de 1 km, em km com vírgula e uma casa", function (assert) {
    assert.strictEqual(formatarDistancia(999.6), "1 km");
    assert.strictEqual(formatarDistancia(1252), "1,3 km");
    assert.strictEqual(formatarDistancia(2000), "2 km");
    assert.strictEqual(formatarDistancia(10000), "10 km");
  });

  QUnit.test("diz de onde a distância é medida", function (assert) {
    assert.strictEqual(textoDistancia(646, "centro"), "646 m do centro do mapa");
    assert.strictEqual(textoDistancia(1252, "voce"), "1,3 km de você");
    assert.strictEqual(textoDistancia(350, "endereco"), "350 m do endereço buscado");
  });
});

QUnit.module("formatacao.js: comodidades", function () {
  QUnit.test("null é não informado, e não 'não'", function (assert) {
    assert.strictEqual(rotuloComodidade(true), "sim");
    assert.strictEqual(rotuloComodidade(false), "não");
    assert.strictEqual(rotuloComodidade(null), "não informado");
  });

  QUnit.test("as três comodidades, na ordem", function (assert) {
    const local = { tem_bebedouro: false, tem_sanitario: null, tem_bancos: true };
    assert.strictEqual(
      textoComodidades(local),
      "Bebedouro: não. Sanitário: não informado. Bancos: sim.",
    );
  });
});

QUnit.module("formatacao.js: equipamentos", function () {
  QUnit.test("cada tipo aparece uma vez, com o rótulo das opções", function (assert) {
    const equipamentos = [
      { tipo: "barra_fixa", nome_outro: "" },
      { tipo: "barras_paralelas", nome_outro: "" },
      { tipo: "barra_fixa", nome_outro: "" },
    ];
    assert.strictEqual(
      textoEquipamentos(equipamentos, TIPOS),
      "Equipamentos: Barra fixa, Barras paralelas.",
    );
  });

  QUnit.test("no tipo outro, vale o nome dado por quem cadastrou", function (assert) {
    const equipamentos = [{ tipo: "outro", nome_outro: "Argola" }];
    assert.strictEqual(textoEquipamentos(equipamentos, TIPOS), "Equipamentos: Argola.");
  });

  QUnit.test("local sem equipamento diz isso", function (assert) {
    assert.strictEqual(textoEquipamentos([], TIPOS), "Equipamentos: nenhum cadastrado.");
  });
});

QUnit.module("formatacao.js: resumo da busca", function () {
  QUnit.test("plural, singular e a origem", function (assert) {
    assert.strictEqual(
      resumoBusca(2, 2000, "centro", 10000),
      "2 locais a até 2 km do centro do mapa.",
    );
    assert.strictEqual(
      resumoBusca(1, 2000, "centro", 10000),
      "1 local a até 2 km do centro do mapa.",
    );
  });

  QUnit.test("sem resultados, diz o que fazer", function (assert) {
    assert.strictEqual(
      resumoBusca(0, 2000, "centro", 10000),
      "Nenhum local a até 2 km do centro do mapa. Aumente o raio ou cadastre um local.",
    );
  });

  QUnit.test("no raio máximo, não pede para aumentar o raio", function (assert) {
    assert.strictEqual(
      resumoBusca(0, 10000, "centro", 10000),
      "Nenhum local a até 10 km do centro do mapa. Esse é o maior raio da busca: ainda não há locais cadastrados nesta região.",
    );
  });
});
