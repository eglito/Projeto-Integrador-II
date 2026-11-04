import {
  caminhoPelaPermissao,
  mensagemDeFalha,
  motivoDoErro,
  podeTentarDeNovo,
} from "../js/localizacao.js";

QUnit.module("localizacao.js: caminho pela permissão", function () {
  QUnit.test("já concedida: localiza sem perguntar", function (assert) {
    assert.strictEqual(caminhoPelaPermissao("granted"), "localizar");
  });

  QUnit.test("ainda não pedida: só convida", function (assert) {
    assert.strictEqual(caminhoPelaPermissao("prompt"), "convidar");
  });

  QUnit.test("negada: explica", function (assert) {
    assert.strictEqual(caminhoPelaPermissao("denied"), "explicar");
  });

  QUnit.test("sem Permissions API: convida, e o pedido fica para o clique", function (assert) {
    assert.strictEqual(caminhoPelaPermissao(undefined), "convidar");
  });
});

QUnit.module("localizacao.js: mensagens por código de erro", function () {
  QUnit.test("os três códigos do navegador", function (assert) {
    assert.strictEqual(motivoDoErro(1), "negada");
    assert.strictEqual(motivoDoErro(2), "indisponivel");
    assert.strictEqual(motivoDoErro(3), "tempo");
  });

  QUnit.test("código desconhecido conta como indisponível", function (assert) {
    assert.strictEqual(motivoDoErro(99), "indisponivel");
  });

  QUnit.test("negada: diz onde liberar a permissão", function (assert) {
    const mensagem = mensagemDeFalha(motivoDoErro(1));
    assert.true(mensagem.startsWith("A localização não foi permitida"), mensagem);
    assert.true(mensagem.includes("libere a localização deste site"), mensagem);
  });

  QUnit.test("indisponível: manda conferir a localização do aparelho", function (assert) {
    const mensagem = mensagemDeFalha(motivoDoErro(2));
    assert.true(mensagem.includes("localização do aparelho está ligada"), mensagem);
  });

  QUnit.test("tempo: cita o limite de 10 segundos", function (assert) {
    const mensagem = mensagemDeFalha(motivoDoErro(3));
    assert.true(mensagem.startsWith("A localização demorou mais de 10 segundos"), mensagem);
  });

  QUnit.test("toda falha diz que o mapa não mudou e leva à busca por endereço", function (assert) {
    for (const motivo of ["negada", "indisponivel", "tempo"]) {
      const mensagem = mensagemDeFalha(motivo);
      assert.true(mensagem.includes("o mapa continua onde estava"), motivo);
      assert.true(mensagem.endsWith("Ou busque por endereço."), motivo);
      assert.true(podeTentarDeNovo(motivo), motivo);
    }
  });

  QUnit.test("bloqueada na abertura: diz onde liberar, sem falar de mudança no mapa", function (assert) {
    const mensagem = mensagemDeFalha("bloqueada");
    assert.true(mensagem.startsWith("A localização está bloqueada para este site"), mensagem);
    assert.true(mensagem.includes("libere a localização no navegador"), mensagem);
    assert.false(mensagem.includes("o mapa continua"), mensagem);
    assert.true(mensagem.endsWith("Ou busque por endereço."), mensagem);
    assert.true(podeTentarDeNovo("bloqueada"));
  });

  QUnit.test("sem suporte: não oferece tentar de novo, só o endereço", function (assert) {
    const mensagem = mensagemDeFalha("sem_suporte");
    assert.true(mensagem.includes("conexão segura (https)"), mensagem);
    assert.true(mensagem.includes("Busque por endereço"), mensagem);
    assert.false(podeTentarDeNovo("sem_suporte"));
  });
});
