/**
 * Abertura da página (Docs/API.md, 6.1). Os locais entram na etapa 3
 * (Docs/plano_front.md).
 *
 * Como módulo, este arquivo roda depois de o HTML ser lido (como um script
 * com defer): o DOM já existe, sem precisar de $(document).ready.
 */

import { obter } from "./api.js";
import { anunciar } from "./anuncio.js";
import { criarMapa } from "./mapa.js";

// Grava o cookie csrftoken. O estado da sessão ganha interface na etapa 9.
obter("/api/auth/sessao/");

obter("/api/opcoes/")
  .done(function (opcoes) {
    criarMapa("mapa", opcoes.busca.centro_padrao);
  })
  .fail(function () {
    anunciar(
      "Não foi possível carregar o mapa. Confira a conexão com a internet e recarregue a página.",
    );
  });
