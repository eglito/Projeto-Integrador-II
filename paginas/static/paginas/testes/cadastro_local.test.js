import {
  corpoDoEquipamento,
  corpoDoLocal,
  errosDoEquipamento,
  errosDoLocal,
  mensagemConclusao,
  mensagemLocalExistente,
  textoCandidato,
  textoCoordenadas,
  textoPasso,
  textoPontoEscolhido,
  valorDaComodidade,
} from "../js/cadastro_local.js";

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
});

QUnit.module("cadastro_local.js: passos", function () {
  QUnit.test("três passos; a possível duplicata ainda é o passo 2", function (assert) {
    assert.strictEqual(textoPasso("ponto"), "Passo 1 de 3: o ponto");
    assert.strictEqual(textoPasso("dados"), "Passo 2 de 3: nome e comodidades");
    assert.strictEqual(textoPasso("duplicata"), "Passo 2 de 3: nome e comodidades");
    assert.strictEqual(textoPasso("equipamentos"), "Passo 3 de 3: equipamentos");
  });
});

QUnit.module("cadastro_local.js: corpo do local", function () {
  const ponto = { latitude: -21.7827686, longitude: -48.1793589, origem: "clique", endereco: null };
  const dados = {
    nome: "  Praça do Teste  ",
    municipio: "3503208",
    endereco: " Rua Um, 10 ",
    comodidades: { tem_bebedouro: "sim", tem_sanitario: "nao", tem_bancos: "" },
    ponto,
  };

  QUnit.test("Não sei vai como null, que é 'não informado', e não como 'não tem'", function (assert) {
    assert.strictEqual(valorDaComodidade("sim"), true);
    assert.strictEqual(valorDaComodidade("nao"), false);
    assert.strictEqual(valorDaComodidade(""), null);
  });

  QUnit.test("monta o corpo do POST, sem espaços nas pontas e com o município como número", function (assert) {
    assert.deepEqual(corpoDoLocal(dados), {
      nome: "Praça do Teste",
      municipio_ibge: 3503208,
      endereco: "Rua Um, 10",
      latitude: -21.7827686,
      longitude: -48.1793589,
      tem_bebedouro: true,
      tem_sanitario: false,
      tem_bancos: null,
    });
  });

  QUnit.test("confirmar_novo só vai depois do 409, quando a pessoa diz que é outro lugar", function (assert) {
    assert.false("confirmar_novo" in corpoDoLocal(dados));
    assert.strictEqual(corpoDoLocal(dados, { confirmarNovo: true }).confirmar_novo, true);
  });

  QUnit.test("o nome vazio é corrigido antes da API, com a orientação", function (assert) {
    assert.deepEqual(errosDoLocal({ nome: "   " }), { nome: "Informe o nome do local." });
    assert.deepEqual(errosDoLocal({ nome: "Praça" }), {}, "controle: com nome, nada a corrigir");
  });
});

QUnit.module("cadastro_local.js: equipamento", function () {
  QUnit.test("barra fixa: só tipo e altura; a altura vazia vai como null", function (assert) {
    const dados = { tipo: "barra_fixa", nomeOutro: "", altura: " 220 ", largura: "" };
    assert.deepEqual(corpoDoEquipamento(dados), { tipo: "barra_fixa", altura_cm: 220 });
    assert.deepEqual(corpoDoEquipamento({ ...dados, altura: "" }), { tipo: "barra_fixa", altura_cm: null });
  });

  QUnit.test("o nome só vai no tipo outro, e a largura só em barras paralelas", function (assert) {
    assert.deepEqual(
      corpoDoEquipamento({ tipo: "outro", nomeOutro: " Argolas ", altura: "", largura: "50" }),
      { tipo: "outro", altura_cm: null, nome_outro: "Argolas" },
    );
    assert.deepEqual(
      corpoDoEquipamento({ tipo: "barras_paralelas", nomeOutro: "x", altura: "120", largura: "50" }),
      { tipo: "barras_paralelas", altura_cm: 120, largura_cm: 50 },
    );
  });

  QUnit.test("sem tipo, ou outro sem nome: a mensagem diz o que fazer", function (assert) {
    assert.deepEqual(errosDoEquipamento({ tipo: "", nomeOutro: "", altura: "", largura: "" }), {
      tipo: "Escolha o tipo do equipamento.",
    });
    assert.deepEqual(errosDoEquipamento({ tipo: "outro", nomeOutro: "  ", altura: "", largura: "" }), {
      nome_outro: "Informe o nome do equipamento, por exemplo: argolas.",
    });
  });

  QUnit.test("medidas: zero, negativo, decimal ou texto não passam", function (assert) {
    for (const altura of ["0", "-5", "2,5", "dois metros"]) {
      const erros = errosDoEquipamento({ tipo: "barra_fixa", nomeOutro: "", altura, largura: "" });
      assert.true("altura_cm" in erros, `altura "${altura}"`);
    }
    const erros = errosDoEquipamento({ tipo: "barras_paralelas", nomeOutro: "", altura: "", largura: "0" });
    assert.true("largura_cm" in erros, "largura zero em barras paralelas");
  });

  QUnit.test("controle: medidas válidas ou vazias passam, e a largura fora das paralelas não conta", function (assert) {
    assert.deepEqual(errosDoEquipamento({ tipo: "barra_fixa", nomeOutro: "", altura: "220", largura: "" }), {});
    assert.deepEqual(errosDoEquipamento({ tipo: "barra_fixa", nomeOutro: "", altura: "", largura: "x" }), {});
    assert.deepEqual(
      errosDoEquipamento({ tipo: "barras_paralelas", nomeOutro: "", altura: " 120 ", largura: "50" }),
      {},
    );
    assert.deepEqual(errosDoEquipamento({ tipo: "outro", nomeOutro: "Argolas", altura: "", largura: "" }), {});
  });
});

QUnit.module("cadastro_local.js: duplicata e conclusão", function () {
  QUnit.test("cada candidato diz a distância até o ponto escolhido", function (assert) {
    assert.strictEqual(
      textoCandidato({ nome: "Praça Pedro de Toledo", distancia_m: 79.6 }),
      "Praça Pedro de Toledo, a 80 m do ponto escolhido.",
    );
  });

  QUnit.test("a conclusão conta os equipamentos, com singular e plural", function (assert) {
    assert.strictEqual(
      mensagemConclusao("Praça do Teste", 0),
      "Local cadastrado: Praça do Teste, ainda sem equipamentos. Ele já aparece no mapa e na lista.",
    );
    assert.strictEqual(
      mensagemConclusao("Praça do Teste", 1),
      "Local cadastrado: Praça do Teste, com 1 equipamento. Ele já aparece no mapa e na lista.",
    );
    assert.strictEqual(
      mensagemConclusao("Praça do Teste", 3),
      "Local cadastrado: Praça do Teste, com 3 equipamentos. Ele já aparece no mapa e na lista.",
    );
  });

  QUnit.test("com filtros de tipo ou altura ativos, avisa que foram limpos", function (assert) {
    assert.true(
      mensagemConclusao("Praça do Teste", 1, { filtrosLimpos: true }).endsWith(
        "Os filtros de tipo e altura foram limpos para ele aparecer.",
      ),
    );
    assert.false(mensagemConclusao("Praça do Teste", 1).includes("filtros"), "controle: sem filtros, sem aviso");
  });

  QUnit.test("É este lugar: diz que nada novo foi cadastrado", function (assert) {
    assert.strictEqual(
      mensagemLocalExistente("Praça Pedro de Toledo"),
      "Nada novo foi cadastrado. Detalhes de Praça Pedro de Toledo, no mapa e na lista.",
    );
    assert.true(mensagemLocalExistente("Praça Pedro de Toledo", { filtrosLimpos: true }).includes("filtros"));
  });
});
