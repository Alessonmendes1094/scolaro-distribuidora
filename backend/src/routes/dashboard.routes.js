const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

function parsePeriodo(query) {
  const hoje = new Date();
  const inicioPadrao = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const dataInicio = query.dataInicio ? new Date(query.dataInicio) : inicioPadrao;
  const dataFim = query.dataFim ? new Date(query.dataFim) : hoje;
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

  const lucroTotal = vendas.reduce(
    (acc, venda) =>
      acc +
      venda.itens.reduce(
        (s, i) =>
          s + (Number(i.precoUnitario) - Number(i.custoUnitario ?? 0)) * Number(i.quantidade),
        0
      ),
    0
  );

  const compras = await prisma.compra.findMany({
    where: { data: { gte: dataInicio, lte: dataFim } },
    include: { itens: true },
  });

  const totalComprado = compras.reduce(
    (acc, compra) =>
      acc + compra.itens.reduce((s, i) => s + Number(i.quantidade) * Number(i.custoUnitario), 0),
    0
  );

  const vendasPorDiaMap = {};
  for (const venda of vendas) {
    const dia = venda.data.toISOString().slice(0, 10);
    const totalVenda = venda.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
      0
    );
    vendasPorDiaMap[dia] = (vendasPorDiaMap[dia] || 0) + totalVenda;
  }
  const vendasPorDia = Object.entries(vendasPorDiaMap)
    .map(([data, total]) => ({ data, total }))
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

  res.json({
    periodo: { dataInicio, dataFim },
    totalVendido,
    totalComprado,
    lucroTotal,
    vendasPorDia,
    contasReceber: {
      pendente: totalReceberPendente,
      atrasado: totalReceberAtrasado,
    },
    contasPagar: {
      pendente: totalPagarPendente,
      atrasado: totalPagarAtrasado,
    },
  });
});

module.exports = router;
