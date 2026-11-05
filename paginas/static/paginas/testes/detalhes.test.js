import {
  erroDeDetalhes,
  linhasSeguranca,
  nomeEquipamento,
  rotuloComodidadeDetalhe,
  textoAutoria,
  textoCondicao,
  textoDimensoes,
  textoAvaliacoes,
  textoDistanciaDetalhe,
  textoEndereco,
} from "../js/detalhes.js";

// Rótulos como /api/opcoes/ devolve.
const ROTULOS = {
  faixas_horario: [
    { valor: "manha", rotulo: "Manhã" },
    { valor: "tarde", rotulo: "Tarde" },
    { valor: "noite", rotulo: "Noite" },
  ],
  movimento: [
    { valor: "movimentado", rotulo: "Movimentado" },
    { valor: "pouco_movimento", rotulo: "Pouco movimento" },
    { valor: "vazio", rotulo: "Vazio" },
  ],
  iluminacao: [
    { valor: "boa", rotulo: "Boa" },
    { valor: "fraca", rotulo: "Fraca" },
    { valor: "ausente", rotulo: "Ausente" },
  ],
};

QUnit.module("detalhes.js: equipamentos", function () {
  QUnit.test("o nome é o tipo, ou o nome dado no tipo outro", function (assert) {
    assert.strictEqual(nomeEquipamento({ tipo_nome: "Barra fixa", nome_outro: "" }), "Barra fixa");
    assert.strictEqual(
      nomeEquipamento({ tipo_nome: "Outro", nome_outro: "Argolas" }),
      "Argolas",
    );
  });

  QUnit.test("dimensões só com o que foi informado", function (assert) {
    assert.strictEqual(
      textoDimensoes({ altura_cm: 220, largura_cm: 50 }),
      "Altura: 220 cm. Largura: 50 cm.",
    );
    assert.strictEqual(textoDimensoes({ altura_cm: 90, largura_cm: null }), "Altura: 90 cm.");
    assert.strictEqual(
      textoDimensoes({ altura_cm: null, largura_cm: null }),
      "Dimensões não informadas.",
    );
  });

  QUnit.test("condição sempre com a data do registro (RN-02)", function (assert) {
    assert.strictEqual(
      textoCondicao({
        condicao_atual_nome: "Bom",
        condicao_registrada_em: "2026-10-12T14:39:10-03:00",
      }),
      "Condição: Bom, registrado em 12/10/2026.",
    );
  });

  QUnit.test("sem registro, diz que não há registro", function (assert) {
    assert.strictEqual(
      textoCondicao({ condicao_atual_nome: null, condicao_registrada_em: null }),
      "Sem registro de condição.",
    );
  });
});

QUnit.module("detalhes.js: local", function () {
  QUnit.test("autoria com o nome de quem cadastrou (RN-08)", function (assert) {
    assert.strictEqual(
      textoAutoria("1234", "2026-10-09T11:30:13-03:00"),
      "Cadastrado por 1234 em 09/10/2026.",
    );
  });

  QUnit.test("sem autor (conta excluída), só a data", function (assert) {
    assert.strictEqual(
      textoAutoria(null, "2026-11-03T21:16:02-03:00"),
      "Cadastrado em 03/11/2026.",
    );
  });

  QUnit.test("distância como na lista, com a origem", function (assert) {
    assert.strictEqual(
      textoDistanciaDetalhe(646, "centro"),
      "Distância: 646 m do centro do mapa.",
    );
    assert.strictEqual(textoDistanciaDetalhe(1252, "voce"), "Distância: 1,3 km de você.");
  });

  QUnit.test("aberto pelo link, o local é o centro do mapa, e não '0 m'", function (assert) {
    assert.strictEqual(textoDistanciaDetalhe(0, "centro"), "No centro do mapa.");
    assert.strictEqual(textoDistanciaDetalhe(0.4, "centro"), "No centro do mapa.");
  });

  QUnit.test("endereço, ou o aviso de que não foi informado", function (assert) {
    assert.strictEqual(textoEndereco("Rua 3", "Araraquara (SP)"), "Rua 3. Araraquara (SP).");
    assert.strictEqual(
      textoEndereco("", "Araraquara (SP)"),
      "Endereço não informado. Araraquara (SP).",
    );
  });

  QUnit.test("comodidades: Sim, Não e Não informado, e null não é não", function (assert) {
    assert.strictEqual(rotuloComodidadeDetalhe(true), "Sim");
    assert.strictEqual(rotuloComodidadeDetalhe(false), "Não");
    assert.strictEqual(rotuloComodidadeDetalhe(null), "Não informado");
  });
});

QUnit.module("detalhes.js: segurança por faixa de horário", function () {
  QUnit.test("uma linha por faixa, na ordem de /api/opcoes/", function (assert) {
    const vazio = { avaliacoes: 0, movimento: {}, iluminacao: {} };
    const linhas = linhasSeguranca({ manha: vazio, tarde: vazio, noite: vazio }, ROTULOS);
    assert.deepEqual(
      linhas.map((linha) => linha.faixa),
      ["Manhã", "Tarde", "Noite"],
    );
  });

  QUnit.test("quantas avaliações, no singular e no plural", function (assert) {
    assert.strictEqual(textoAvaliacoes(0), "Nenhuma avaliação");
    assert.strictEqual(textoAvaliacoes(1), "1 avaliação");
    assert.strictEqual(textoAvaliacoes(3), "3 avaliações");
  });

  QUnit.test("sem avaliações, diz isso em texto", function (assert) {
    const vazio = { avaliacoes: 0, movimento: {}, iluminacao: {} };
    const [manha] = linhasSeguranca({ manha: vazio, tarde: vazio, noite: vazio }, ROTULOS);
    assert.deepEqual(manha, {
      faixa: "Manhã",
      avaliacoes: "Nenhuma avaliação",
      movimento: "Sem avaliações",
      iluminacao: "Sem avaliações",
    });
  });

  QUnit.test("contagens com os rótulos, na ordem das escolhas", function (assert) {
    const vazio = { avaliacoes: 0, movimento: {}, iluminacao: {} };
    const noite = {
      avaliacoes: 3,
      movimento: { vazio: 1, movimentado: 2 },
      iluminacao: { boa: 3 },
    };
    const linhas = linhasSeguranca({ manha: vazio, tarde: vazio, noite }, ROTULOS);
    assert.deepEqual(linhas[2], {
      faixa: "Noite",
      avaliacoes: "3 avaliações",
      movimento: "Movimentado: 2; Vazio: 1",
      iluminacao: "Boa: 3",
    });
  });

  QUnit.test("de dia, a iluminação pode faltar: Não informada", function (assert) {
    const vazio = { avaliacoes: 0, movimento: {}, iluminacao: {} };
    const tarde = { avaliacoes: 1, movimento: { pouco_movimento: 1 }, iluminacao: {} };
    const linhas = linhasSeguranca({ manha: vazio, tarde, noite: vazio }, ROTULOS);
    assert.strictEqual(linhas[1].movimento, "Pouco movimento: 1");
    assert.strictEqual(linhas[1].iluminacao, "Não informada");
  });
});

QUnit.module("detalhes.js: erros", function () {
  QUnit.test("404 e id inválido: mensagem própria em português (bug 2)", function (assert) {
    for (const status of [404, "invalido"]) {
      const erro = erroDeDetalhes(status);
      assert.strictEqual(erro.titulo, "Local não encontrado", String(status));
      assert.true(erro.mensagem.startsWith("Não encontramos este local."), String(status));
      assert.true(erro.mensagem.endsWith("Escolha um local na lista ou no mapa."), String(status));
      assert.false(erro.mensagem.includes("No Local matches"), String(status));
    }
  });

  QUnit.test("falha de conexão: diz o que conferir", function (assert) {
    const erro = erroDeDetalhes(0);
    assert.strictEqual(erro.titulo, "Detalhes indisponíveis");
    assert.true(erro.mensagem.includes("Confira a conexão com a internet"));
  });
});
