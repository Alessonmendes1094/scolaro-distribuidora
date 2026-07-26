const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

router.get('/', async (req, res) => {
  const compras = await prisma.compra.findMany({
    include: { fornecedor: true, itens: { include: { produto: true } } },
    orderBy: { data: 'desc' },
  });
  res.json(compras);
});

router.get('/:id', async (req, res) => {
  const compra = await prisma.compra.findUnique({
    where: { id: Number(req.params.id) },
    include: { fornecedor: true, itens: { include: { produto: true } } },
  });
  if (!compra) return res.status(404).json({ error: 'Compra não encontrada' });
  res.json(compra);
});

// body: { fornecedorId, data, comNota, itens: [{ produtoId, quantidade, custoUnitario }] }
router.post('/', async (req, res) => {
  const { fornecedorId, data, comNota, itens } = req.body;

  if (!fornecedorId || !data || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Fornecedor, data e itens são obrigatórios' });
  }

  try {
    const compra = await prisma.$transaction(async (tx) => {
      const novaCompra = await tx.compra.create({
        data: {
          fornecedorId: Number(fornecedorId),
          data: new Date(data),
          comNota: Boolean(comNota),
          itens: {
            create: itens.map((item) => ({
              produtoId: Number(item.produtoId),
              quantidade: item.quantidade,
              custoUnitario: item.custoUnitario,
            })),
          },
        },
        include: { itens: true },
      });

      for (const item of itens) {
        await tx.produto.update({
          where: { id: Number(item.produtoId) },
          data: { estoqueAtual: { increment: item.quantidade } },
        });
      }

      return novaCompra;
    });

    res.status(201).json(compra);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
