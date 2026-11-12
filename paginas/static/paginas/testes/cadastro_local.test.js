import {
  corpoDoLocal,
  errosDoLocal,
  textoAvisoDeDuplicata,
  textoCoordenadas,
  textoDuplicata,
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

// Textos do formulário, como o cadastro_local.js os lê dos campos.
const DADOS = {
  nome: "Praça Nova",
  endereco: "",
  municipio_ibge: "3503208",
  tem_bebedouro: "",
  tem_sanitario: "",
  tem_bancos: "",
};
const PONTO = { latitude: -21.7827686123456789, longitude: -48.1793589987654321 };

QUnit.module("cadastro_local.js: formulário do local", function () {
  QUnit.test("comodidade: sim, não e sem resposta viram true, false e null", function (assert) {
    assert.strictEqual(valorDaComodidade("sim"), true);
    assert.strictEqual(valorDaComodidade("nao"), false);
    // Sem resposta é "não informado", e não "não tem" (Docs/API.md, seção 1).
    assert.strictEqual(valorDaComodidade(""), null);
  });

  QUnit.test("só o nome é conferido antes de ir à API", function (assert) {
    assert.deepEqual(errosDoLocal(DADOS), {});
    assert.strictEqual(errosDoLocal({ nome: "   " }).nome, "Informe o nome do local.");
  });

  QUnit.test("corpo mínimo: nome, município, ponto com seis casas e comodidades null", function (assert) {
    assert.deepEqual(corpoDoLocal(DADOS, PONTO), {
      nome: "Praça Nova",
      municipio_ibge: 3503208,
      latitude: -21.782769,
      longitude: -48.179359,
      tem_bebedouro: null,
      tem_sanitario: null,
      tem_bancos: null,
    });
  });

  QUnit.test("endereço preenchido vai, com as comodidades respondidas", function (assert) {
    const corpo = corpoDoLocal(
      { ...DADOS, nome: "  Praça Nova ", endereco: " Rua 3, 100 ", tem_bebedouro: "sim", tem_bancos: "nao" },
      PONTO,
    );
    assert.strictEqual(corpo.nome, "Praça Nova");
    assert.strictEqual(corpo.endereco, "Rua 3, 100");
    assert.strictEqual(corpo.tem_bebedouro, true);
    assert.strictEqual(corpo.tem_sanitario, null);
    assert.strictEqual(corpo.tem_bancos, false);
  });

  QUnit.test("confirmar_novo só vai na saída \"É outro lugar\" do 409", function (assert) {
    assert.false("confirmar_novo" in corpoDoLocal(DADOS, PONTO));
    assert.false("confirmar_novo" in corpoDoLocal(DADOS, PONTO, false));
    assert.true(corpoDoLocal(DADOS, PONTO, true).confirmar_novo);
  });
});

QUnit.module("cadastro_local.js: aviso de duplicata", function () {
  QUnit.test("o candidato mostra o endereço, quando há, e a distância até o ponto", function (assert) {
    assert.strictEqual(
      textoDuplicata({ endereco: "Rua 3", distancia_m: 84 }),
      "Rua 3. A 84 m do ponto escolhido.",
    );
    assert.strictEqual(
      textoDuplicata({ endereco: "", distancia_m: 1234 }),
      "A 1,2 km do ponto escolhido.",
    );
    assert.strictEqual(textoDuplicata({ endereco: "Rua 3", distancia_m: null }), "Rua 3.");
  });

  QUnit.test("o anúncio conta os parecidos e dá as duas saídas, sem citar o campo da API", function (assert) {
    const um = textoAvisoDeDuplicata(1);
    assert.true(um.includes("Há 1 local parecido."));
    assert.true(textoAvisoDeDuplicata(3).includes("Há 3 locais parecidos."));
    assert.true(um.includes("abra o local e avalie"));
    assert.true(um.includes("cadastre mesmo assim"));
    assert.false(um.includes("confirmar_novo"));
  });
});
