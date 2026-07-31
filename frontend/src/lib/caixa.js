export function arredondar(valor, casas = 3) {
  const fator = 10 ** casas;
  return Math.round((Number(valor) + Number.EPSILON) * fator) / fator;
}

export function unidadeParaCaixa(quantidadeUnidade, unidadesPorCaixa) {
  if (!unidadesPorCaixa || Number(unidadesPorCaixa) === 0) return '';
  return arredondar(Number(quantidadeUnidade || 0) / Number(unidadesPorCaixa));
}

export function caixaParaUnidade(quantidadeCaixa, unidadesPorCaixa) {
  if (!unidadesPorCaixa) return '';
  return arredondar(Number(quantidadeCaixa || 0) * Number(unidadesPorCaixa));
}
