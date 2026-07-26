const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

const DIAS_VENCIMENTO_PADRAO = 30;

router.get('/', async (req, res) => {
  const { clienteId, dataInicio, dataFim } = req.query;

  const where = {};
  if (clienteId) where.clienteId = Number(clienteId);
  if (dataInicio || dataFim) {
    where.data = {};
    if (dataInicio) where.data.gte = new Date(dataInicio);
    if (dataFim) where.data.lte = new Date(dataFim);
  }

  const vendas = await prisma.venda.findMany({
    where,
    include: { cliente: true, itens: { include: { produto: true } }, contasReceber: true },
    orderBy: { data: 'desc' },
  });
  res.json(vendas);
});

router.get('/:id', async (req, res) => {
  const venda = await prisma.venda.findUnique({
    where: { id: Number(req.params.id) },
    include: { cliente: true, itens: { include: { produto: true } }, contasReceber: true },
  });
  if (!venda) return res.status(404).json({ error: 'Venda não encontrada' });
  res.json(venda);
});

// body: { clienteId, data, formaPagamento, vencimento?, itens: [{ produtoId, quantidade, precoUnitario }] }
router.post('/', async (req, res) => {
  const { clienteId, data, formaPagamento, vencimento, itens } = req.body;

  if (!clienteId || !data || !formaPagamento || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Cliente, data, forma de pagamento e itens são obrigatórios' });
  }

  const formasValidas = ['FIADO', 'BOLETO', 'A_VISTA'];
  if (!formasValidas.includes(formaPagamento)) {
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

    const venda = await prisma.$transaction(async (tx) => {
      const novaVenda = await tx.venda.create({
        data: {
          clienteId: Number(clienteId),
          data: new Date(data),
          formaPagamento,
          itens: {
            create: itens.map((item) => ({
              produtoId: Number(item.produtoId),
              quantidade: item.quantidade,
              precoUnitario: item.precoUnitario,
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

      if (formaPagamento === 'A_VISTA') {
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

module.exports = router;
