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

function clienteWhere(query) {
  return query.clienteId ? { clienteId: Number(query.clienteId) } : {};
}

function statusPendenciaVenda(venda) {
  if (venda.formaPagamento === 'A_VISTA') return 'PAGO';
  if (!venda.contasReceber || venda.contasReceber.length === 0) return 'PAGO';
  if (venda.contasReceber.some((c) => c.status === 'PERDIDO')) return 'PERDIDO';
  if (venda.contasReceber.some((c) => c.status === 'ATRASADO')) return 'ATRASADO';
  if (venda.contasReceber.every((c) => c.status === 'PAGO')) return 'PAGO';
  return 'PENDENTE';
}

function diasAtraso(vencimento) {
  const diff = Date.now() - new Date(vencimento).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function diasAtrasoVenda(venda) {
  const atrasadas = (venda.contasReceber || []).filter((c) => c.status === 'ATRASADO');
  if (atrasadas.length === 0) return null;
  return Math.max(...atrasadas.map((c) => diasAtraso(c.vencimento)));
}

// Vendas por cliente no período
router.get('/vendas-por-cliente', async (req, res) => {
  await prisma.contaReceber.updateMany({
    where: { status: 'PENDENTE', vencimento: { lt: new Date() } },
    data: { status: 'ATRASADO' },
  });

  const vendas = await prisma.venda.findMany({
    where: { ...periodoWhere(req.query), ...empresaWhere(req.query), ...clienteWhere(req.query) },
    include: { cliente: true, itens: true, contasReceber: true },
    orderBy: { data: 'desc' },
  });

  const { status: statusFiltro } = req.query;

  const porCliente = {};
  for (const venda of vendas) {
    const statusPendencia = statusPendenciaVenda(venda);
    if (statusFiltro && statusPendencia !== statusFiltro) continue;

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
      statusPendencia,
      diasAtraso: statusPendencia === 'ATRASADO' ? diasAtrasoVenda(venda) : null,
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
      venda: {
        ...(req.query.empresaId ? { empresaId: Number(req.query.empresaId) } : {}),
        ...clienteWhere(req.query),
      },
    },
    include: { venda: { include: { cliente: true, itens: true } }, baixa: true },
    orderBy: { pagoEm: 'desc' },
  });

  const porCliente = {};
  for (const conta of contas) {
    const clienteId = conta.venda.clienteId;
    const valorVenda = conta.venda.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
      0
    );
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
      dataVenda: conta.venda.data,
      valorVenda,
      valor: Number(conta.valor),
      pagoEm: conta.pagoEm,
      baixaId: conta.baixaId,
      codigoBaixa: conta.baixa?.codigo,
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

  const statusValidos = ['PENDENTE', 'ATRASADO'];
  const statusFiltro =
    req.query.status && statusValidos.includes(req.query.status) ? req.query.status : null;

  const contas = await prisma.contaReceber.findMany({
    where: {
      status: statusFiltro || { in: statusValidos },
      ...periodoWhere(req.query, 'vencimento'),
      venda: {
        ...(req.query.empresaId ? { empresaId: Number(req.query.empresaId) } : {}),
        ...clienteWhere(req.query),
      },
    },
    include: { venda: { include: { cliente: true, itens: true } } },
    orderBy: { vencimento: 'asc' },
  });

  const porCliente = {};
  for (const conta of contas) {
    const clienteId = conta.venda.clienteId;
    const valorVenda = conta.venda.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
      0
    );
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
      dataVenda: conta.venda.data,
      valorVenda,
      valor: Number(conta.valor),
      vencimento: conta.vencimento,
      status: conta.status,
      diasAtraso: conta.status === 'ATRASADO' ? diasAtraso(conta.vencimento) : null,
    });
    porCliente[clienteId].valorTotal += Number(conta.valor);
  }

  res.json(Object.values(porCliente));
});

// Pendências financeiras marcadas como perdidas, por cliente
router.get('/perdas', async (req, res) => {
  const contas = await prisma.contaReceber.findMany({
    where: {
      status: 'PERDIDO',
      ...periodoWhere(req.query, 'perdidoEm'),
      venda: {
        ...(req.query.empresaId ? { empresaId: Number(req.query.empresaId) } : {}),
        ...clienteWhere(req.query),
      },
    },
    include: { venda: { include: { cliente: true, itens: true } } },
    orderBy: { perdidoEm: 'desc' },
  });

  const porCliente = {};
  for (const conta of contas) {
    const clienteId = conta.venda.clienteId;
    const valorVenda = conta.venda.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
      0
    );
    if (!porCliente[clienteId]) {
      porCliente[clienteId] = {
        clienteId,
        clienteNome: conta.venda.cliente.nome,
        perdas: [],
        valorTotal: 0,
      };
    }
    porCliente[clienteId].perdas.push({
      contaId: conta.id,
      vendaId: conta.vendaId,
      dataVenda: conta.venda.data,
      valorVenda,
      valor: Number(conta.valor),
      vencimentoOriginal: conta.vencimento,
      perdidoEm: conta.perdidoEm,
      motivo: conta.motivoPerda,
    });
    porCliente[clienteId].valorTotal += Number(conta.valor);
  }

  res.json(Object.values(porCliente));
});

// Resumo mensal por cliente: agrupa vendas por mês (mais recente primeiro),
// mostrando total do mês e o detalhamento por cliente dentro do mês.
router.get('/resumo-mensal', async (req, res) => {
  const meses = Math.max(1, Math.min(36, Number(req.query.meses) || 6));

  const hoje = new Date();
  const dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59, 999);
  const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1);

  const vendas = await prisma.venda.findMany({
    where: {
      data: { gte: dataInicio, lte: dataFim },
      ...empresaWhere(req.query),
      ...clienteWhere(req.query),
    },
    include: { cliente: true, itens: true },
    orderBy: { data: 'desc' },
  });

  const porMes = {};
  for (const venda of vendas) {
    const dataVenda = new Date(venda.data);
    const chaveMes = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, '0')}`;

    const valorVenda = venda.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
      0
    );
    const lucroVenda = venda.itens.reduce(
      (s, i) => s + (Number(i.precoUnitario) - Number(i.custoUnitario ?? 0)) * Number(i.quantidade),
      0
    );

    if (!porMes[chaveMes]) {
      porMes[chaveMes] = {
        mes: chaveMes,
        ano: dataVenda.getFullYear(),
        mesNumero: dataVenda.getMonth() + 1,
        totalVendido: 0,
        lucroTotal: 0,
        quantidadeVendas: 0,
        clientes: {},
      };
    }

    const grupoMes = porMes[chaveMes];
    grupoMes.totalVendido += valorVenda;
    grupoMes.lucroTotal += lucroVenda;
    grupoMes.quantidadeVendas += 1;

    if (!grupoMes.clientes[venda.clienteId]) {
      grupoMes.clientes[venda.clienteId] = {
        clienteId: venda.clienteId,
        clienteNome: venda.cliente.nome,
        quantidadeVendas: 0,
        valorTotal: 0,
        lucroTotal: 0,
      };
    }
    const grupoCliente = grupoMes.clientes[venda.clienteId];
    grupoCliente.quantidadeVendas += 1;
    grupoCliente.valorTotal += valorVenda;
    grupoCliente.lucroTotal += lucroVenda;
  }

  const resultado = Object.values(porMes)
    .map((grupoMes) => ({
      ...grupoMes,
      clientes: Object.values(grupoMes.clientes).sort((a, b) => b.valorTotal - a.valorTotal),
    }))
    .sort((a, b) => b.mes.localeCompare(a.mes));

  res.json(resultado);
});

// Resumo anual por cliente: agrupa vendas por ano (mais recente primeiro),
// mostrando total do ano e o detalhamento por cliente dentro do ano.
router.get('/resumo-anual', async (req, res) => {
  const anos = Math.max(1, Math.min(15, Number(req.query.anos) || 3));

  const hoje = new Date();
  const dataFim = new Date(hoje.getFullYear(), 11, 31, 23, 59, 59, 999);
  const dataInicio = new Date(hoje.getFullYear() - (anos - 1), 0, 1);

  const vendas = await prisma.venda.findMany({
    where: {
      data: { gte: dataInicio, lte: dataFim },
      ...empresaWhere(req.query),
      ...clienteWhere(req.query),
    },
    include: { cliente: true, itens: true },
    orderBy: { data: 'desc' },
  });

  const porAno = {};
  for (const venda of vendas) {
    const dataVenda = new Date(venda.data);
    const chaveAno = String(dataVenda.getFullYear());

    const valorVenda = venda.itens.reduce(
      (s, i) => s + Number(i.quantidade) * Number(i.precoUnitario),
      0
    );
    const lucroVenda = venda.itens.reduce(
      (s, i) => s + (Number(i.precoUnitario) - Number(i.custoUnitario ?? 0)) * Number(i.quantidade),
      0
    );

    if (!porAno[chaveAno]) {
      porAno[chaveAno] = {
        ano: dataVenda.getFullYear(),
        totalVendido: 0,
        lucroTotal: 0,
        quantidadeVendas: 0,
        clientes: {},
      };
    }

    const grupoAno = porAno[chaveAno];
    grupoAno.totalVendido += valorVenda;
    grupoAno.lucroTotal += lucroVenda;
    grupoAno.quantidadeVendas += 1;

    if (!grupoAno.clientes[venda.clienteId]) {
      grupoAno.clientes[venda.clienteId] = {
        clienteId: venda.clienteId,
        clienteNome: venda.cliente.nome,
        quantidadeVendas: 0,
        valorTotal: 0,
        lucroTotal: 0,
      };
    }
    const grupoCliente = grupoAno.clientes[venda.clienteId];
    grupoCliente.quantidadeVendas += 1;
    grupoCliente.valorTotal += valorVenda;
    grupoCliente.lucroTotal += lucroVenda;
  }

  const resultado = Object.values(porAno)
    .map((grupoAno) => ({
      ...grupoAno,
      clientes: Object.values(grupoAno.clientes).sort((a, b) => b.valorTotal - a.valorTotal),
    }))
    .sort((a, b) => b.ano - a.ano);

  res.json(resultado);
});

module.exports = router;
