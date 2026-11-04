/**
 * Região aria-live da página (especificação, 2.1): resultados, erros e
 * confirmações aparecem na tela e são lidos pelo leitor de tela.
 */

// Tempo para o leitor de tela perceber a região vazia antes do texto novo.
const PAUSA_MS = 100;

/**
 * Mostra e anuncia `texto`. Limpar antes faz o leitor de tela repetir uma
 * mensagem igual à anterior, que de outro modo passaria em silêncio.
 */
export function anunciar(texto) {
  const regiao = $("#anuncio");
  regiao.text("");
  setTimeout(function () {
    regiao.text(texto);
  }, PAUSA_MS);
}
