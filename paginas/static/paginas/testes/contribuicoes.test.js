import {
  corpoDaAvaliacao,
  corpoDoEquipamento,
  errosDaAvaliacao,
  errosDaDenuncia,
  errosDoEquipamento,
  errosDoRegistro,
  iluminacaoObrigatoria,
  mensagemDaCondicao,
  mensagemDeConclusao,
  rotulosDosEquipamentos,
} from "../js/contribuicoes.js";

// Uma avaliação completa e válida, para os testes partirem dela.
const AVALIACAO = {
  faixa_horario: "tarde",
  movimento: "movimentado",
  iluminacao: "",
  limpeza: "limpo",
};

QUnit.module("contribuicoes.js: avaliação", function () {
  QUnit.test("completa e sem iluminação, de tarde, não tem o que corrigir (controle positivo)", function (assert) {
    assert.deepEqual(errosDaAvaliacao(AVALIACAO), {});
  });

  QUnit.test("tudo vazio: cada mensagem diz o que escolher, e a iluminação não é cobrada sem a faixa", function (assert) {
    const erros = errosDaAvaliacao({ faixa_horario: "", movimento: "", iluminacao: "", limpeza: "" });
    assert.deepEqual(Object.keys(erros), ["faixa_horario", "movimento", "limpeza"]);
    assert.true(erros.faixa_horario.startsWith("Escolha"));
  });

  QUnit.test("à noite, a iluminação é obrigatória (RN-05)", function (assert) {
    const erros = errosDaAvaliacao({ ...AVALIACAO, faixa_horario: "noite" });
    assert.deepEqual(Object.keys(erros), ["iluminacao"]);
    assert.true(erros.iluminacao.includes("à noite"));
    // Controle positivo: com a iluminação, a avaliação noturna passa.
    assert.deepEqual(errosDaAvaliacao({ ...AVALIACAO, faixa_horario: "noite", iluminacao: "boa" }), {});
  });

  QUnit.test("só a noite exige iluminação", function (assert) {
    assert.true(iluminacaoObrigatoria("noite"));
    assert.false(iluminacaoObrigatoria("manha"));
    assert.false(iluminacaoObrigatoria("tarde"));
    assert.false(iluminacaoObrigatoria(""));
  });

  QUnit.test("o corpo deixa a iluminação em branco de fora e leva a escolhida", function (assert) {
    assert.deepEqual(corpoDaAvaliacao(AVALIACAO), {
      faixa_horario: "tarde",
      movimento: "movimentado",
      limpeza: "limpo",
    });
    assert.deepEqual(corpoDaAvaliacao({ ...AVALIACAO, iluminacao: "fraca" }), {
      faixa_horario: "tarde",
      movimento: "movimentado",
      limpeza: "limpo",
      iluminacao: "fraca",
    });
  });
});

QUnit.module("contribuicoes.js: condição e denúncia", function () {
  QUnit.test("o registro precisa de equipamento e condição", function (assert) {
    assert.deepEqual(Object.keys(errosDoRegistro({ equipamento: "", condicao: "" })), [
      "equipamento",
      "condicao",
    ]);
    assert.deepEqual(errosDoRegistro({ equipamento: "12", condicao: "bom" }), {});
  });

  QUnit.test("a denúncia precisa de motivo", function (assert) {
    assert.true(errosDaDenuncia({ motivo: "" }).motivo.startsWith("Escolha"));
    assert.deepEqual(errosDaDenuncia({ motivo: "local_duplicado" }), {});
  });

  QUnit.test("o anúncio da condição diz qual equipamento, qual condição e onde ela aparece", function (assert) {
    const contexto = {
      nome: "Parque Infantil",
      equipamentos: [{ id: 12, tipo: "barra_fixa", tipo_nome: "Barra fixa", nome_outro: "" }],
    };
    assert.strictEqual(
      mensagemDaCondicao(contexto, { condicao_nome: "Desgastado" }, "12"),
      "Condição registrada: Desgastado em Barra fixa. Ela aparece nos detalhes de Parque Infantil, com a data de hoje.",
    );
  });
});

QUnit.module("contribuicoes.js: equipamento", function () {
  const BARRA = { tipo: "barra_fixa", nome_outro: "", altura_cm: "", largura_cm: "" };

  QUnit.test("só o tipo basta (controle positivo)", function (assert) {
    assert.deepEqual(errosDoEquipamento(BARRA), {});
  });

  QUnit.test("sem tipo, a mensagem manda escolher", function (assert) {
    assert.true(errosDoEquipamento({ ...BARRA, tipo: "" }).tipo.startsWith("Escolha"));
  });

  QUnit.test("o tipo Outro pede o nome, e só ele", function (assert) {
    assert.true(errosDoEquipamento({ ...BARRA, tipo: "outro" }).nome_outro.includes("Outro"));
    assert.true("nome_outro" in errosDoEquipamento({ ...BARRA, tipo: "outro", nome_outro: "   " }));
    assert.deepEqual(errosDoEquipamento({ ...BARRA, tipo: "outro", nome_outro: "Argolas" }), {});
    // Fora do tipo Outro, um nome que sobrou no campo não é cobrado.
    assert.deepEqual(errosDoEquipamento({ ...BARRA, nome_outro: "" }), {});
  });

  QUnit.test("medida inválida diz como corrigir; em branco vale", function (assert) {
    for (const texto of ["0", "-5", "9,5", "alta"]) {
      const erros = errosDoEquipamento({ ...BARRA, altura_cm: texto });
      assert.true(erros.altura_cm.startsWith("Informe a altura em centímetros"), texto);
    }
    assert.deepEqual(errosDoEquipamento({ ...BARRA, altura_cm: " 220 " }), {});
  });

  QUnit.test("a largura só é conferida nas barras paralelas", function (assert) {
    const paralelas = { ...BARRA, tipo: "barras_paralelas", largura_cm: "zero" };
    assert.true(errosDoEquipamento(paralelas).largura_cm.startsWith("Informe a largura"));
    assert.deepEqual(errosDoEquipamento({ ...paralelas, largura_cm: "50" }), {});
    // Num tipo sem largura, o campo está escondido e o texto que sobrou não importa.
    assert.deepEqual(errosDoEquipamento({ ...BARRA, largura_cm: "zero" }), {});
  });

  QUnit.test("o corpo leva só o que vale para o tipo", function (assert) {
    assert.deepEqual(corpoDoEquipamento(BARRA), { tipo: "barra_fixa" });
    assert.deepEqual(corpoDoEquipamento({ ...BARRA, altura_cm: "220" }), {
      tipo: "barra_fixa",
      altura_cm: 220,
    });
    // O nome e a largura que sobraram de outro tipo ficam de fora (restrições do banco).
    assert.deepEqual(
      corpoDoEquipamento({ ...BARRA, nome_outro: "Argolas", largura_cm: "50", altura_cm: "90" }),
      { tipo: "barra_fixa", altura_cm: 90 },
    );
    assert.deepEqual(corpoDoEquipamento({ tipo: "outro", nome_outro: " Argolas ", altura_cm: "", largura_cm: "" }), {
      tipo: "outro",
      nome_outro: "Argolas",
    });
    assert.deepEqual(
      corpoDoEquipamento({ tipo: "barras_paralelas", nome_outro: "", altura_cm: "110", largura_cm: "50" }),
      { tipo: "barras_paralelas", altura_cm: 110, largura_cm: 50 },
    );
  });
});

QUnit.module("contribuicoes.js: seletor de equipamentos", function () {
  const barra = (id, extras = {}) => ({
    id,
    tipo: "barra_fixa",
    tipo_nome: "Barra fixa",
    nome_outro: "",
    altura_cm: null,
    largura_cm: null,
    ...extras,
  });

  QUnit.test("equipamentos diferentes: o nome basta", function (assert) {
    const opcoes = rotulosDosEquipamentos([
      barra(1),
      { id: 2, tipo: "espaldar", tipo_nome: "Espaldar", nome_outro: "", altura_cm: null, largura_cm: null },
    ]);
    assert.deepEqual(opcoes, [
      { valor: 1, rotulo: "Barra fixa" },
      { valor: 2, rotulo: "Espaldar" },
    ]);
  });

  QUnit.test("o tipo Outro mostra o nome dado por quem cadastrou, e as medidas ajudam a distinguir", function (assert) {
    const opcoes = rotulosDosEquipamentos([
      barra(1, { altura_cm: 220 }),
      barra(2, { tipo: "barras_paralelas", tipo_nome: "Barras paralelas", altura_cm: 110, largura_cm: 50 }),
      barra(3, { tipo: "outro", tipo_nome: "Outro", nome_outro: "Argolas" }),
    ]);
    assert.deepEqual(
      opcoes.map((opcao) => opcao.rotulo),
      ["Barra fixa (altura 220 cm)", "Barras paralelas (altura 110 cm, largura 50 cm)", "Argolas"],
    );
  });

  QUnit.test("duas iguais ganham número de ordem, e a diferente não", function (assert) {
    const opcoes = rotulosDosEquipamentos([barra(1), barra(2), barra(3, { altura_cm: 200 })]);
    assert.deepEqual(
      opcoes.map((opcao) => opcao.rotulo),
      ["Barra fixa, nº 1", "Barra fixa, nº 2", "Barra fixa (altura 200 cm)"],
    );
    assert.deepEqual(
      opcoes.map((opcao) => opcao.valor),
      [1, 2, 3],
    );
  });

  QUnit.test("sem equipamentos, nenhuma opção", function (assert) {
    assert.deepEqual(rotulosDosEquipamentos([]), []);
  });
});

QUnit.module("contribuicoes.js: anúncio ao concluir os equipamentos", function () {
  QUnit.test("local que já existia: resume o que foi acrescentado, ou nada", function (assert) {
    const contexto = { nome: "Parque Infantil", aposCadastro: false };
    assert.strictEqual(mensagemDeConclusao(contexto, []), null);
    assert.strictEqual(
      mensagemDeConclusao(contexto, ["Barra fixa"]),
      "1 equipamento acrescentado a Parque Infantil.",
    );
    assert.strictEqual(
      mensagemDeConclusao(contexto, ["Barra fixa", "Espaldar"]),
      "2 equipamentos acrescentados a Parque Infantil.",
    );
  });

  QUnit.test("depois do cadastro: diz que o local já está no mapa e na lista, com ou sem equipamentos", function (assert) {
    const contexto = { nome: "Praça Nova", aposCadastro: true };
    assert.strictEqual(
      mensagemDeConclusao(contexto, ["Barra fixa"]),
      "Local Praça Nova cadastrado com 1 equipamento. Ele já aparece no mapa e na lista.",
    );
    assert.strictEqual(
      mensagemDeConclusao(contexto, ["Barra fixa", "Espaldar"]),
      "Local Praça Nova cadastrado com 2 equipamentos. Ele já aparece no mapa e na lista.",
    );
    assert.true(mensagemDeConclusao(contexto, []).includes("use Adicionar equipamento nos detalhes"));
  });
});
