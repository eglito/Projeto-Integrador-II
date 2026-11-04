import {
  descricaoFiltros,
  formatarDistancia,
  resumoBusca,
  rotuloComodidade,
  textoComodidades,
  textoDistancia,
  textoEquipamentos,
  textoFiltrosAtivos,
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

QUnit.module("formatacao.js: filtros no texto", function () {
  QUnit.test("tipo, altura, os dois ou nenhum", function (assert) {
    assert.strictEqual(
      descricaoFiltros("Espaldar", 90),
      " com equipamento do tipo Espaldar de até 90 cm",
    );
    assert.strictEqual(descricaoFiltros("Espaldar", null), " com equipamento do tipo Espaldar");
    assert.strictEqual(descricaoFiltros(null, 90), " com equipamento de até 90 cm");
    assert.strictEqual(descricaoFiltros(null, null), "");
  });
});

QUnit.module("formatacao.js: filtros ativos no topo da lista", function () {
  QUnit.test("tipo, altura e raio", function (assert) {
    assert.strictEqual(
      textoFiltrosAtivos("Espaldar", 90, 10000, false),
      "Tipo: Espaldar. Altura máxima: 90 cm. Raio: 10 km.",
    );
  });

  QUnit.test("sem filtros de equipamento, diz isso e mostra o raio", function (assert) {
    assert.strictEqual(
      textoFiltrosAtivos(null, null, 2000, false),
      "Sem filtros de equipamento. Raio: 2 km.",
    );
  });

  QUnit.test("raio da área visível vem marcado", function (assert) {
    assert.strictEqual(
      textoFiltrosAtivos(null, null, 3400, true),
      "Sem filtros de equipamento. Raio: 3,4 km (área visível do mapa).",
    );
  });

  QUnit.test("o endereço buscado vem primeiro", function (assert) {
    assert.strictEqual(
      textoFiltrosAtivos("Espaldar", null, 2000, false, "Praça da Matriz, Araraquara"),
      "Endereço: Praça da Matriz, Araraquara. Tipo: Espaldar. Raio: 2 km.",
    );
    assert.strictEqual(
      textoFiltrosAtivos(null, null, 2000, false, "Praça da Matriz, Araraquara"),
      "Endereço: Praça da Matriz, Araraquara. Sem filtros de equipamento. Raio: 2 km.",
    );
  });
});

QUnit.module("formatacao.js: resumo da busca", function () {
  // Raio padrão e máximo de /api/opcoes/.
  const BUSCA = { raio: 2000, raioMaximo: 10000, origem: "centro" };

  QUnit.test("plural, singular e a origem", function (assert) {
    assert.strictEqual(resumoBusca(2, BUSCA), "2 locais a até 2 km do centro do mapa.");
    assert.strictEqual(resumoBusca(1, BUSCA), "1 local a até 2 km do centro do mapa.");
  });

  QUnit.test("cita os filtros ativos", function (assert) {
    const filtros = descricaoFiltros("Espaldar", null);
    assert.strictEqual(
      resumoBusca(1, { ...BUSCA, raio: 10000, filtros }),
      "1 local com equipamento do tipo Espaldar a até 10 km do centro do mapa.",
    );
  });

  QUnit.test("avisa quando a área visível passou do raio máximo", function (assert) {
    assert.strictEqual(
      resumoBusca(6, { ...BUSCA, raio: 10000, limitado: true }),
      "6 locais a até 10 km do centro do mapa. A área visível passa desse raio, o maior da busca: os locais mais longe do centro ficaram de fora.",
    );
  });

  QUnit.test("sem resultados, diz o que fazer", function (assert) {
    assert.strictEqual(
      resumoBusca(0, BUSCA),
      "Nenhum local a até 2 km do centro do mapa. Aumente o raio ou cadastre um local.",
    );
  });

  QUnit.test("sem resultados com filtros, sugere mudar os filtros", function (assert) {
    const filtros = descricaoFiltros(null, 90);
    assert.strictEqual(
      resumoBusca(0, { ...BUSCA, filtros }),
      "Nenhum local com equipamento de até 90 cm a até 2 km do centro do mapa. Mude os filtros, aumente o raio ou cadastre um local.",
    );
  });

  QUnit.test("área cortada sem resultados sugere aproximar o mapa", function (assert) {
    assert.strictEqual(
      resumoBusca(0, { ...BUSCA, raio: 10000, limitado: true }),
      "Nenhum local a até 10 km do centro do mapa. A área visível passa desse raio, o maior da busca: aproxime o mapa da região que quer ver e use Buscar nesta área.",
    );
  });

  QUnit.test("no raio máximo, sugere mudar de área, e não aumentar o raio", function (assert) {
    assert.strictEqual(
      resumoBusca(0, { ...BUSCA, raio: 10000 }),
      "Nenhum local a até 10 km do centro do mapa. Esse é o maior raio da busca: mova o mapa para outra região e use Buscar nesta área.",
    );
  });
});
