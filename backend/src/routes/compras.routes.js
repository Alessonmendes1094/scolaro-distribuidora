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
const FORMAS_VALIDAS = ['FIADO', 'BOLETO', 'A_VISTA', 'PIX', 'DINHEIRO'];
const FORMAS_IMEDIATAS = ['A_VISTA', 'PIX', 'DINHEIRO'];

// body: { fornecedorId, data, comNota, formaPagamento, vencimento?, itens: [{ produtoId, quantidade, custoUnitario }] }
router.post('/', async (req, res) => {
  const { fornecedorId, data, comNota, formaPagamento, vencimento, itens } = req.body;

  if (!fornecedorId || !data || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Fornecedor, data e itens são obrigatórios' });
  }

  const forma = formaPagamento || 'BOLETO';
  if (!FORMAS_VALIDAS.includes(forma)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }

  try {
    const valorTotal = itens.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.custoUnitario),
      0
    );

    const compra = await prisma.$transaction(async (tx) => {
      const dataVencimento =
        !FORMAS_IMEDIATAS.includes(forma)
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

      if (!FORMAS_IMEDIATAS.includes(forma)) {
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
            compraId: novaCompra.id,
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

// body: igual ao POST — substitui fornecedor/data/comNota/formaPagamento/vencimento/itens
router.put('/:id', async (req, res) => {
  const compraId = Number(req.params.id);
  const { fornecedorId, data, comNota, formaPagamento, vencimento, itens } = req.body;

  if (!fornecedorId || !data || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Fornecedor, data e itens são obrigatórios' });
  }

  const forma = formaPagamento || 'BOLETO';
  if (!FORMAS_VALIDAS.includes(forma)) {
    return res.status(400).json({ error: 'Forma de pagamento inválida' });
  }

  try {
    const compraExistente = await prisma.compra.findUnique({
      where: { id: compraId },
      include: { itens: true, contasPagar: true },
    });
    if (!compraExistente) throw new Error('Compra não encontrada');
    if (compraExistente.contasPagar.some((c) => c.status === 'PAGO')) {
      throw new Error('Não é possível editar uma compra cuja conta a pagar já foi quitada');
    }

    const valorTotal = itens.reduce(
      (acc, item) => acc + Number(item.quantidade) * Number(item.custoUnitario),
      0
    );

    const compra = await prisma.$transaction(async (tx) => {
      for (const itemAntigo of compraExistente.itens) {
        await tx.produto.update({
          where: { id: itemAntigo.produtoId },
          data: { estoqueAtual: { decrement: itemAntigo.quantidade } },
        });
      }

      await tx.itemCompra.deleteMany({ where: { compraId } });
      await tx.contaPagar.deleteMany({ where: { compraId } });
      await tx.movimentoCaixa.deleteMany({ where: { compraId } });

      const dataVencimento =
        !FORMAS_IMEDIATAS.includes(forma)
          ? vencimento
            ? new Date(vencimento)
            : new Date(new Date(data).getTime() + DIAS_VENCIMENTO_PADRAO * 24 * 60 * 60 * 1000)
          : null;

      const compraAtualizada = await tx.compra.update({
        where: { id: compraId },
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

      if (!FORMAS_IMEDIATAS.includes(forma)) {
        await tx.contaPagar.create({
          data: {
            descricao: `Compra #${compraAtualizada.id} - ${compraAtualizada.fornecedor.nome}`,
            categoria: 'MERCADORIA',
            valor: valorTotal,
            vencimento: dataVencimento,
            compraId: compraAtualizada.id,
          },
        });
      } else {
        await tx.movimentoCaixa.create({
          data: {
            tipo: 'SAIDA',
            descricao: `Compra #${compraAtualizada.id} - ${compraAtualizada.fornecedor.nome}`,
            valor: valorTotal,
            data: new Date(data),
            compraId: compraAtualizada.id,
          },
        });
      }

      return compraAtualizada;
    });

    res.json(compra);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const compraId = Number(req.params.id);

  try {
    const compraExistente = await prisma.compra.findUnique({
      where: { id: compraId },
      include: { itens: true, contasPagar: true },
    });
    if (!compraExistente) throw new Error('Compra não encontrada');
    if (compraExistente.contasPagar.some((c) => c.status === 'PAGO')) {
      throw new Error('Não é possível excluir uma compra cuja conta a pagar já foi quitada');
    }

    await prisma.$transaction(async (tx) => {
      for (const item of compraExistente.itens) {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoqueAtual: { decrement: item.quantidade } },
        });
      }

      await tx.movimentoCaixa.deleteMany({ where: { compraId } });
      await tx.contaPagar.deleteMany({ where: { compraId } });
      await tx.compra.delete({ where: { id: compraId } });
    });

    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
