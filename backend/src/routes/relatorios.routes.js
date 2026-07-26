const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

function periodoWhere(query, field = 'data') {
  const { dataInicio, dataFim } = query;
  if (!dataInicio && !dataFim) return {};
  const range = {};
  if (dataInicio) range.gte = new Date(dataInicio);
  if (dataFim) range.lte = new Date(dataFim);
  return { [field]: range };
}

function empresaWhere(query) {
  return query.empresaId ? { empresaId: Number(query.empresaId) } : {};
}

// Vendas por cliente no período
router.get('/vendas-por-cliente', async (req, res) => {
  const vendas = await prisma.venda.findMany({
    where: { ...periodoWhere(req.query), ...empresaWhere(req.query) },
    include: { cliente: true, itens: true },
    orderBy: { data: 'desc' },
  });

  const porCliente = {};
  for (const venda of vendas) {
    const totalVenda = venda.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
      0
    );
    const qtdItens = venda.itens.reduce((s, i) => s + Number(i.quantidade), 0);

    if (!porCliente[venda.clienteId]) {
      porCliente[venda.clienteId] = {
        clienteId: venda.clienteId,
        clienteNome: venda.cliente.nome,
        vendas: [],
        quantidadeTotal: 0,
        valorTotal: 0,
      };
    }
    porCliente[venda.clienteId].vendas.push({
      id: venda.id,
      data: venda.data,
      formaPagamento: venda.formaPagamento,
      quantidade: qtdItens,
      valorTotal: totalVenda,
    });
    porCliente[venda.clienteId].quantidadeTotal += qtdItens;
    porCliente[venda.clienteId].valorTotal += totalVenda;
  }

  res.json(Object.values(porCliente));
});

// Pagamentos recebidos por cliente no período
router.get('/pagamentos-recebidos', async (req, res) => {
  const contas = await prisma.contaReceber.findMany({
    where: {
      status: 'PAGO',
      ...periodoWhere(req.query, 'pagoEm'),
      ...(req.query.empresaId ? { venda: { empresaId: Number(req.query.empresaId) } } : {}),
    },
    include: { venda: { include: { cliente: true } } },
    orderBy: { pagoEm: 'desc' },
  });

  const porCliente = {};
  for (const conta of contas) {
    const clienteId = conta.venda.clienteId;
    if (!porCliente[clienteId]) {
      porCliente[clienteId] = {
        clienteId,
        clienteNome: conta.venda.cliente.nome,
        pagamentos: [],
        valorTotal: 0,
      };
    }
    porCliente[clienteId].pagamentos.push({
      contaId: conta.id,
      vendaId: conta.vendaId,
      valor: Number(conta.valor),
      pagoEm: conta.pagoEm,
    });
    porCliente[clienteId].valorTotal += Number(conta.valor);
  }

  res.json(Object.values(porCliente));
});

// Pagamentos pendentes por cliente no período (por vencimento)
router.get('/pagamentos-pendentes', async (req, res) => {
  await prisma.contaReceber.updateMany({
    where: { status: 'PENDENTE', vencimento: { lt: new Date() } },
    data: { status: 'ATRASADO' },
  });

  const contas = await prisma.contaReceber.findMany({
    where: {
      status: { in: ['PENDENTE', 'ATRASADO'] },
      ...periodoWhere(req.query, 'vencimento'),
      ...(req.query.empresaId ? { venda: { empresaId: Number(req.query.empresaId) } } : {}),
    },
    include: { venda: { include: { cliente: true } } },
    orderBy: { vencimento: 'asc' },
  });

  const porCliente = {};
  for (const conta of contas) {
    const clienteId = conta.venda.clienteId;
    if (!porCliente[clienteId]) {
      porCliente[clienteId] = {
        clienteId,
        clienteNome: conta.venda.cliente.nome,
        pendencias: [],
        valorTotal: 0,
      };
    }
    porCliente[clienteId].pendencias.push({
      contaId: conta.id,
      vendaId: conta.vendaId,
      valor: Number(conta.valor),
      vencimento: conta.vencimento,
      status: conta.status,
    });
    porCliente[clienteId].valorTotal += Number(conta.valor);
  }

  res.json(Object.values(porCliente));
});

module.exports = router;
