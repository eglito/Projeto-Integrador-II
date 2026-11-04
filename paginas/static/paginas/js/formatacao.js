/**
 * Textos da lista e dos anúncios. Funções puras: recebem dados e devolvem
 * texto, sem tocar na página, e por isso são testadas no QUnit (decisão 35).
 */

const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

// De onde a distância é medida (README, decisão 31).
const ORIGENS = {
  centro: "do centro do mapa",
  voce: "de você",
  endereco: "do endereço buscado",
};

// Campos de comodidade do Local (Docs/API.md, 5.7). São campos fixos do
// contrato, e não uma lista de escolhas: por isso não vêm de /api/opcoes/.
const COMODIDADES = [
  ["tem_bebedouro", "Bebedouro"],
  ["tem_sanitario", "Sanitário"],
  ["tem_bancos", "Bancos"],
];

/** "350 m" abaixo de 1 km; "1,2 km" a partir dele. */
export function formatarDistancia(metros) {
  const arredondado = Math.round(metros);
  if (arredondado < 1000) {
    return `${arredondado} m`;
  }
  return `${NUMERO.format(arredondado / 1000)} km`;
}

/** "646 m do centro do mapa". */
export function textoDistancia(metros, origem) {
  return `${formatarDistancia(metros)} ${ORIGENS[origem]}`;
}

/** null é "não informado", e não "não tem" (Docs/API.md, seção 1). */
export function rotuloComodidade(valor) {
  if (valor === null || valor === undefined) {
    return "não informado";
  }
  return valor ? "sim" : "não";
}

/** "Bebedouro: sim. Sanitário: não. Bancos: não informado." */
export function textoComodidades(local) {
  return COMODIDADES.map(
    ([campo, rotulo]) => `${rotulo}: ${rotuloComodidade(local[campo])}.`,
  ).join(" ");
}

/**
 * "Equipamentos: Barra fixa, Barras paralelas." Cada tipo aparece uma vez, com
 * o rótulo de /api/opcoes/; no tipo "outro", vale o nome dado por quem cadastrou.
 */
export function textoEquipamentos(equipamentos, tiposEquipamento) {
  const rotulos = new Map(tiposEquipamento.map((tipo) => [tipo.valor, tipo.rotulo]));
  // nome_outro só é preenchido no tipo "outro" (restrição do banco).
  const nomes = equipamentos.map((equipamento) => equipamento.nome_outro || rotulos.get(equipamento.tipo));
  const unicos = [...new Set(nomes)];
  if (unicos.length === 0) {
    return "Equipamentos: nenhum cadastrado.";
  }
  return `Equipamentos: ${unicos.join(", ")}.`;
}

/**
 * Resultado da busca, para a região aria-live (especificação, 2.1 e 2.3).
 * Sem resultados, só sugere aumentar o raio se ele ainda puder aumentar.
 */
export function resumoBusca(quantidade, raioMetros, origem, raioMaximo) {
  const area = `a até ${textoDistancia(raioMetros, origem)}`;
  if (quantidade === 0 && raioMetros < raioMaximo) {
    return `Nenhum local ${area}. Aumente o raio ou cadastre um local.`;
  }
  if (quantidade === 0) {
    return `Nenhum local ${area}. Esse é o maior raio da busca: ainda não há locais cadastrados nesta região.`;
  }
  const locais = quantidade === 1 ? "1 local" : `${quantidade} locais`;
  return `${locais} ${area}.`;
}
