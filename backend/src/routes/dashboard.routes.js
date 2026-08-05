const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

function parsePeriodo(query) {
  const hoje = new Date();
  const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const dataInicio = query.dataInicio ? new Date(query.dataInicio) : inicioPadrao;
  const dataFim = query.dataFim ? new Date(query.dataFim) : hoje;
  // Estende até o fim do dia (UTC) para não excluir registros com
  // horário (ex: createdAt de contas lançadas manualmente) do dia final.
  dataFim.setUTCHours(23, 59, 59, 999);
  return { dataInicio, dataFim };
}

router.get('/', async (req, res) => {
  const { dataInicio, dataFim } = parsePeriodo(req.query);
  const { empresaId } = req.query;

  await prisma.contaReceber.updateMany({
    where: { status: 'PENDENTE', vencimento: { lt: new Date() } },
    data: { status: 'ATRASADO' },
  });
  await prisma.contaPagar.updateMany({
    where: { status: 'PENDENTE', vencimento: { lt: new Date() } },
    data: { status: 'ATRASADO' },
  });

  const vendas = await prisma.venda.findMany({
    where: {
      data: { gte: dataInicio, lte: dataFim },
      ...(empresaId ? { empresaId: Number(empresaId) } : {}),
    },
    include: { itens: true },
  });

  const totalVendido = vendas.reduce(
    (acc, venda) =>
      acc + venda.itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.precoUnitario), 0),
    0
  );

  const totalVendidoComNota = vendas
    .filter((venda) => venda.comNota)
    .reduce(
      (acc, venda) =>
        acc + venda.itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.precoUnitario), 0),
      0
    );

  function lucroItemVenda(i) {
    if (i.lucroManual !== null && i.lucroManual !== undefined) return Number(i.lucroManual);
    return (Number(i.precoUnitario) - Number(i.custoUnitario ?? 0)) * Number(i.quantidade);
  }

  const lucroVendas = vendas.reduce(
    (acc, venda) => acc + venda.itens.reduce((s, i) => s + lucroItemVenda(i), 0),
    0
  );

  const contasReceberManuaisPeriodo = await prisma.contaReceber.findMany({
    where: {
      vendaId: null,
      createdAt: { gte: dataInicio, lte: dataFim },
    },
  });
  const lucroManualContas = contasReceberManuaisPeriodo.reduce(
    (acc, c) => acc + Number(c.lucro ?? 0),
    0
  );

  const lucroTotal = lucroVendas + lucroManualContas;

  const compras = await prisma.compra.findMany({
    where: { data: { gte: dataInicio, lte: dataFim } },
    include: { itens: true },
  });

  const totalComprado = compras.reduce(
    (acc, compra) =>
      acc + compra.itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.custoUnitario), 0),
    0
  );

  const totalCompradoComNota = compras
    .filter((compra) => compra.comNota)
    .reduce(
      (acc, compra) =>
        acc + compra.itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.custoUnitario), 0),
      0
    );

  const porDiaMap = {};
  for (const venda of vendas) {
    const dia = venda.data.toISOString().slice(0, 10);
    const totalVenda = venda.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
      0
    );
    const lucroVenda = venda.itens.reduce((s, i) => s + lucroItemVenda(i), 0);
    if (!porDiaMap[dia]) porDiaMap[dia] = { vendas: 0, lucro: 0, compras: 0 };
    porDiaMap[dia].vendas += totalVenda;
    porDiaMap[dia].lucro += lucroVenda;
  }
  for (const conta of contasReceberManuaisPeriodo) {
    const dia = conta.createdAt.toISOString().slice(0, 10);
    if (!porDiaMap[dia]) porDiaMap[dia] = { vendas: 0, lucro: 0, compras: 0 };
    porDiaMap[dia].lucro += Number(conta.lucro ?? 0);
  }
  for (const compra of compras) {
    const dia = compra.data.toISOString().slice(0, 10);
    const totalCompra = compra.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.custoUnitario),
      0
    );
    if (!porDiaMap[dia]) porDiaMap[dia] = { vendas: 0, lucro: 0, compras: 0 };
    porDiaMap[dia].compras += totalCompra;
  }
  const vendasPorDia = Object.entries(porDiaMap)
    .map(([data, valores]) => ({ data, total: valores.vendas, ...valores }))
    .sort((a, b) => a.data.localeCompare(b.data));

  const contasReceberPendentes = await prisma.contaReceber.findMany({
    where: {
      status: { in: ['PENDENTE', 'ATRASADO'] },
      ...(empresaId ? { venda: { empresaId: Number(empresaId) } } : {}),
    },
  });
  const totalReceberPendente = contasReceberPendentes
    .filter((c) => c.status === 'PENDENTE')
    .reduce((acc, c) => acc + Number(c.valor), 0);
  const totalReceberAtrasado = contasReceberPendentes
    .filter((c) => c.status === 'ATRASADO')
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const contasPagarPendentes = await prisma.contaPagar.findMany({
    where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
  });
  const totalPagarPendente = contasPagarPendentes
    .filter((c) => c.status === 'PENDENTE')
    .reduce((acc, c) => acc + Number(c.valor), 0);
  const totalPagarAtrasado = contasPagarPendentes
    .filter((c) => c.status === 'ATRASADO')
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const contasPerdidas = await prisma.contaReceber.findMany({
    where: {
      status: 'PERDIDO',
      ...(empresaId ? { venda: { empresaId: Number(empresaId) } } : {}),
    },
  });
  const totalPerdido = contasPerdidas.reduce((acc, c) => acc + Number(c.valor), 0);
  const quantidadePerdas = contasPerdidas.length;

  res.json({
    periodo: { dataInicio, dataFim },
    totalVendido,
    totalVendidoComNota,
    totalComprado,
    totalCompradoComNota,
    lucroTotal,
    vendasPorDia,
    contasReceber: {
      pendente: totalReceberPendente,
      atrasado: totalReceberAtrasado,
      total: totalReceberPendente + totalReceberAtrasado,
    },
    contasPagar: {
      pendente: totalPagarPendente,
      atrasado: totalPagarAtrasado,
      total: totalPagarPendente + totalPagarAtrasado,
    },
    perdas: {
      total: totalPerdido,
      quantidade: quantidadePerdas,
    },
  });
});

module.exports = router;
