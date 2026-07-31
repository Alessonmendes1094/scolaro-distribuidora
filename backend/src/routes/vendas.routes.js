const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

const DIAS_VENCIMENTO_PADRAO = 30;
const FORMAS_VALIDAS = ['FIADO', 'BOLETO', 'A_VISTA', 'PIX', 'DINHEIRO'];
const FORMAS_IMEDIATAS = ['A_VISTA', 'PIX', 'DINHEIRO'];

router.get('/', async (req, res) => {
  const { clienteId, empresaId, dataInicio, dataFim } = req.query;

  const where = {};
  if (clienteId) where.clienteId = Number(clienteId);
  if (empresaId) where.empresaId = Number(empresaId);
  if (dataInicio || dataFim) {
    where.data = {};
    if (dataInicio) where.data.gte = new Date(dataInicio);
    if (dataFim) where.data.lte = new Date(dataFim);
  }

  const vendas = await prisma.venda.findMany({
    where,
    include: {
      empresa: true,
      cliente: true,
      itens: { include: { produto: true } },
      contasReceber: true,
    },
    orderBy: { data: 'desc' },
  });

  const vendasComLucro = vendas.map((venda) => ({
    ...venda,
    lucroTotal: venda.itens.reduce(
      (acc, item) =>
        acc +
        (Number(item.precoUnitario) - Number(item.custoUnitario ?? 0)) * Number(item.quantidade),
      0
    ),
  }));

  res.json(vendasComLucro);
});

router.get('/ultima-por-cliente/:clienteId', async (req, res) => {
  const venda = await prisma.venda.findFirst({
    where: { clienteId: Number(req.params.clienteId) },
    include: { itens: { include: { produto: true } } },
    orderBy: { data: 'desc' },
  });

  if (!venda) return res.json(null);
  res.json(venda);
});

router.get('/:id', async (req, res) => {
  const venda = await prisma.venda.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      empresa: true,
      cliente: true,
      itens: { include: { produto: true } },
      contasReceber: true,
    },
  });
  if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });
  res.json(venda);
});

// body: { empresaId, clienteId, data, comNota?, formaPagamento, vencimento?, itens: [{ produtoId, quantidade, precoUnitario }] }
router.post('/', async (req, res) => {
  const { empresaId, clienteId, data, comNota, formaPagamento, vencimento, itens } = req.body;

  if (!empresaId || !clienteId || !data || !formaPagamento || !Array.isArray(itens) || itens.length === 0) {
    return res
      .status(400)
      .json({ error: 'Empresa, cliente, data, forma de pagamento e itens são obrigatórios' });
  }

  if (!FORMAS_VALIDAS.includes(formaPagamento)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }

  try {
    const produtosIds = itens.map((i) => Number(i.produtoId));
    const produtos = await prisma.produto.findMany({ where: { id: { in: produtosIds } } });

    for (const item of itens) {
      const produto = produtos.find((p) => p.id === Number(item.produtoId));
      if (!produto) throw new Error(`Produto ${item.produtoId} não encontrado`);
      if (Number(produto.estoqueAtual) < Number(item.quantidade)) {
        throw new Error(`Estoque insuficiente para o produto ${produto.nome}`);
      }
    }

    const valorTotal = itens.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.precoUnitario),
      0
    );

    const custosPorProduto = {};
    for (const produtoId of produtosIds) {
      const ultimoItemCompra = await prisma.itemCompra.findFirst({
        where: { produtoId },
        orderBy: [{ compra: { data: 'desc' } }, { id: 'desc' }],
      });
      custosPorProduto[produtoId] = ultimoItemCompra
        ? Number(ultimoItemCompra.custoUnitario)
        : null;
    }

    const unidadesPorCaixaPorProduto = {};
    for (const p of produtos) {
      unidadesPorCaixaPorProduto[p.id] = p.unidadesPorCaixa;
    }

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          empresaId: Number(empresaId),
          clienteId: Number(clienteId),
          data: new Date(data),
          comNota: Boolean(comNota),
          formaPagamento,
          itens: {
            create: itens.map((item) => ({
              produtoId: Number(item.produtoId),
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              custoUnitario: custosPorProduto[Number(item.produtoId)],
              unidadesPorCaixa: unidadesPorCaixaPorProduto[Number(item.produtoId)] ?? null,
            })),
          },
        },
        include: { itens: true, cliente: true },
      });

      for (const item of itens) {
        await tx.produto.update({
          where: { id: Number(item.produtoId) },
          data: { estoqueAtual: { decrement: item.quantidade } },
        });
      }

      if (FORMAS_IMEDIATAS.includes(formaPagamento)) {
        await tx.movimentoCaixa.create({
          data: {
            tipo: 'ENTRADA',
            descricao: `Venda #${novaVenda.id} - ${novaVenda.cliente.nome}`,
            valor: valorTotal,
            data: new Date(data),
            vendaId: novaVenda.id,
          },
        });
      } else {
        const dataVencimento = vencimento
          ? new Date(vencimento)
          : new Date(new Date(data).getTime() + DIAS_VENCIMENTO_PADRAO * 24 * 60 * 60 * 1000);

        await tx.contaReceber.create({
          data: {
            vendaId: novaVenda.id,
            valor: valorTotal,
            vencimento: dataVencimento,
            status: 'PENDENTE',
          },
        });
      }

      return novaVenda;
    });

    res.status(201).json(venda);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// body: igual ao POST — substitui empresa/cliente/data/formaPagamento/vencimento/itens
router.put('/:id', async (req, res) => {
  const vendaId = Number(req.params.id);
  const { empresaId, clienteId, data, comNota, formaPagamento, vencimento, itens } = req.body;

  if (!empresaId || !clienteId || !data || !formaPagamento || !Array.isArray(itens) || itens.length === 0) {
    return res
      .status(400)
      .json({ error: 'Empresa, cliente, data, forma de pagamento e itens são obrigatórios' });
  }

  if (!FORMAS_VALIDAS.includes(formaPagamento)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }

  try {
    const vendaExistente = await prisma.venda.findUnique({
      where: { id: vendaId },
      include: { itens: true, contasReceber: true },
    });
    if (!vendaExistente) throw new Error('Venda não encontrada');
    if (vendaExistente.contasReceber.some((c) => c.status === 'PAGO')) {
      throw new Error('Não é possível editar uma venda cuja conta a receber já foi recebida');
    }

    const produtosIds = itens.map((i) => Number(i.produtoId));

    const estoqueDisponivel = {};
    for (const itemAntigo of vendaExistente.itens) {
      estoqueDisponivel[itemAntigo.produtoId] =
        (estoqueDisponivel[itemAntigo.produtoId] || 0) + Number(itemAntigo.quantidade);
    }

    const produtos = await prisma.produto.findMany({ where: { id: { in: produtosIds } } });
    for (const item of itens) {
      const produto = produtos.find((p) => p.id === Number(item.produtoId));
      if (!produto) throw new Error(`Produto ${item.produtoId} não encontrado`);
      const disponivel = Number(produto.estoqueAtual) + (estoqueDisponivel[produto.id] || 0);
      if (disponivel < Number(item.quantidade)) {
        throw new Error(`Estoque insuficiente para o produto ${produto.nome}`);
      }
    }

    const valorTotal = itens.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.precoUnitario),
      0
    );

    const custosPorProduto = {};
    for (const produtoId of produtosIds) {
      const ultimoItemCompra = await prisma.itemCompra.findFirst({
        where: { produtoId },
        orderBy: [{ compra: { data: 'desc' } }, { id: 'desc' }],
      });
      custosPorProduto[produtoId] = ultimoItemCompra
        ? Number(ultimoItemCompra.custoUnitario)
        : null;
    }

    const unidadesPorCaixaPorProduto = {};
    for (const p of produtos) {
      unidadesPorCaixaPorProduto[p.id] = p.unidadesPorCaixa;
    }

    const venda = await prisma.$transaction(async (tx) => {
      for (const itemAntigo of vendaExistente.itens) {
        await tx.produto.update({
          where: { id: itemAntigo.produtoId },
          data: { estoqueAtual: { increment: itemAntigo.quantidade } },
        });
      }

      await tx.itemVenda.deleteMany({ where: { vendaId } });
      await tx.contaReceber.deleteMany({ where: { vendaId } });
      await tx.movimentoCaixa.deleteMany({ where: { vendaId, contaReceberId: null } });

      const vendaAtualizada = await tx.venda.update({
        where: { id: vendaId },
        data: {
          empresaId: Number(empresaId),
          clienteId: Number(clienteId),
          data: new Date(data),
          comNota: Boolean(comNota),
          formaPagamento,
          itens: {
            create: itens.map((item) => ({
              produtoId: Number(item.produtoId),
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
              custoUnitario: custosPorProduto[Number(item.produtoId)],
              unidadesPorCaixa: unidadesPorCaixaPorProduto[Number(item.produtoId)] ?? null,
            })),
          },
        },
        include: { itens: true, cliente: true },
      });

      for (const item of itens) {
        await tx.produto.update({
          where: { id: Number(item.produtoId) },
          data: { estoqueAtual: { decrement: item.quantidade } },
        });
      }

      if (FORMAS_IMEDIATAS.includes(formaPagamento)) {
        await tx.movimentoCaixa.create({
          data: {
            tipo: 'ENTRADA',
            descricao: `Venda #${vendaAtualizada.id} - ${vendaAtualizada.cliente.nome}`,
            valor: valorTotal,
            data: new Date(data),
            vendaId: vendaAtualizada.id,
          },
        });
      } else {
        const dataVencimento = vencimento
          ? new Date(vencimento)
          : new Date(new Date(data).getTime() + DIAS_VENCIMENTO_PADRAO * 24 * 60 * 60 * 1000);

        await tx.contaReceber.create({
          data: {
            vendaId: vendaAtualizada.id,
            valor: valorTotal,
            vencimento: dataVencimento,
            status: 'PENDENTE',
          },
        });
      }

      return vendaAtualizada;
    });

    res.json(venda);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const vendaId = Number(req.params.id);

  try {
    const vendaExistente = await prisma.venda.findUnique({
      where: { id: vendaId },
      include: { itens: true, contasReceber: true },
    });
    if (!vendaExistente) throw new Error('Venda não encontrada');
    if (vendaExistente.contasReceber.some((c) => c.status === 'PAGO')) {
      throw new Error('Não é possível excluir uma venda cuja conta a receber já foi recebida');
    }

    await prisma.$transaction(async (tx) => {
      for (const item of vendaExistente.itens) {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoqueAtual: { increment: item.quantidade } },
        });
      }

      await tx.movimentoCaixa.deleteMany({ where: { vendaId, contaReceberId: null } });
      await tx.contaReceber.deleteMany({ where: { vendaId } });
      await tx.venda.delete({ where: { id: vendaId } });
    });

    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
