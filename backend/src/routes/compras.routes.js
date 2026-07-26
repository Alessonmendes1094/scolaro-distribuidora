const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

router.get('/', async (req, res) => {
  const compras = await prisma.compra.findMany({
    include: { fornecedor: true, itens: { include: { produto: true } }, contasPagar: true },
    orderBy: { data: 'desc' },
  });
  res.json(compras);
});

router.get('/:id', async (req, res) => {
  const compra = await prisma.compra.findUnique({
    where: { id: Number(req.params.id) },
    include: { fornecedor: true, itens: { include: { produto: true } }, contasPagar: true },
  });
  if (!compra) return res.status(404).json({ error: 'Compra não encontrada' });
  res.json(compra);
});

const DIAS_VENCIMENTO_PADRAO = 30;

// body: { fornecedorId, data, comNota, formaPagamento, vencimento?, itens: [{ produtoId, quantidade, custoUnitario }] }
router.post('/', async (req, res) => {
  const { fornecedorId, data, comNota, formaPagamento, vencimento, itens } = req.body;

  if (!fornecedorId || !data || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Fornecedor, data e itens são obrigatórios' });
  }

  const formasValidas = ['FIADO', 'BOLETO', 'A_VISTA'];
  const forma = formaPagamento || 'BOLETO';
  if (!formasValidas.includes(forma)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }

  try {
    const valorTotal = itens.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.custoUnitario),
      0
    );

    const compra = await prisma.$transaction(async (tx) => {
      const dataVencimento =
        forma !== 'A_VISTA'
          ? vencimento
            ? new Date(vencimento)
            : new Date(new Date(data).getTime() + DIAS_VENCIMENTO_PADRAO * 24 * 60 * 60 * 1000)
          : null;

      const novaCompra = await tx.compra.create({
        data: {
          fornecedorId: Number(fornecedorId),
          data: new Date(data),
          comNota: Boolean(comNota),
          formaPagamento: forma,
          vencimento: dataVencimento,
          itens: {
            create: itens.map((item) => ({
              produtoId: Number(item.produtoId),
              quantidade: item.quantidade,
              custoUnitario: item.custoUnitario,
            })),
          },
        },
        include: { itens: true, fornecedor: true },
      });

      for (const item of itens) {
        await tx.produto.update({
          where: { id: Number(item.produtoId) },
          data: { estoqueAtual: { increment: item.quantidade } },
        });
      }

      if (forma !== 'A_VISTA') {
        await tx.contaPagar.create({
          data: {
            descricao: `Compra #${novaCompra.id} - ${novaCompra.fornecedor.nome}`,
            categoria: 'MERCADORIA',
            valor: valorTotal,
            vencimento: dataVencimento,
            compraId: novaCompra.id,
          },
        });
      } else {
        await tx.movimentoCaixa.create({
          data: {
            tipo: 'SAIDA',
            descricao: `Compra #${novaCompra.id} - ${novaCompra.fornecedor.nome}`,
            valor: valorTotal,
            data: new Date(data),
          },
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
