const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

router.get('/', async (req, res) => {
  const produtos = await prisma.produto.findMany({ orderBy: { nome: 'asc' } });
  res.json(produtos);
});

router.get('/:id', async (req, res) => {
  const produto = await prisma.produto.findUnique({ where: { id: Number(req.params.id) } });
  if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
  res.json(produto);
});

router.get('/:id/ultimo-custo', async (req, res) => {
  const ultimoItemCompra = await prisma.itemCompra.findFirst({
    where: { produtoId: Number(req.params.id) },
    orderBy: [{ compra: { data: 'desc' } }, { id: 'desc' }],
  });

  res.json({ custoUnitario: ultimoItemCompra ? Number(ultimoItemCompra.custoUnitario) : null });
});

// body: { quantidade, motivo? } — define o estoque atual para o valor informado
router.post('/:id/ajuste-estoque', async (req, res) => {
  const produtoId = Number(req.params.id);
  const { quantidade, motivo } = req.body;

  if (quantidade === undefined || quantidade === null || Number.isNaN(Number(quantidade))) {
    return res.status(400).json({ error: 'Informe a nova quantidade em estoque' });
  }

  try {
    const produto = await prisma.$transaction(async (tx) => {
      const produtoAtual = await tx.produto.findUnique({ where: { id: produtoId } });
      if (!produtoAtual) throw new Error('Produto não encontrado');

      await tx.ajusteEstoque.create({
        data: {
          produtoId,
          quantidadeAnterior: produtoAtual.estoqueAtual,
          quantidadeNova: quantidade,
          motivo: motivo || null,
        },
      });

      return tx.produto.update({
        where: { id: produtoId },
        data: { estoqueAtual: quantidade },
      });
    });

    res.json(produto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nome, unidade, estoqueAtual, precoVenda } = req.body;
  if (!nome || !unidade || precoVenda === undefined) {
    return res.status(400).json({ error: 'Nome, unidade e preço de venda são obrigatórios' });
  }
  const produto = await prisma.produto.create({
    data: {
      nome,
      unidade,
      estoqueAtual: estoqueAtual ?? 0,
      precoVenda,
    },
  });
  res.status(201).json(produto);
});

router.put('/:id', async (req, res) => {
  const { nome, unidade, estoqueAtual, precoVenda } = req.body;
  const produto = await prisma.produto.update({
    where: { id: Number(req.params.id) },
    data: { nome, unidade, estoqueAtual, precoVenda },
  });
  res.json(produto);
});

router.delete('/:id', async (req, res) => {
  await prisma.produto.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
