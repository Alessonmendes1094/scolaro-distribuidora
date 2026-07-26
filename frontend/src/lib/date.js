// Formata uma data (string ISO ou Date) como DD/MM/AAAA usando os
// componentes UTC. Datas "somente data" (vencimento, data da venda/compra)
// são gravadas como meia-noite UTC; usar toLocaleDateString local desloca
// o dia exibido em fusos negativos (ex: Brasil). Usar UTC aqui garante que
// o dia exibido é sempre o mesmo que foi gravado/selecionado.
export function formatarData(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const ano = d.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}
