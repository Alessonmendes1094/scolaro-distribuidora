const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

async function atualizarAtrasadas() {
  await prisma.contaPagar.updateMany({
    where: { status: 'PENDENTE', vencimento: { lt: new Date() } },
    data: { status: 'ATRASADO' },
  });
}

router.get('/', async (req, res) => {
  await atualizarAtrasadas();
  const { status } = req.query;
  const where = status ? { status } : {};
  const contas = await prisma.contaPagar.findMany({ where, orderBy: { vencimento: 'asc' } });
  res.json(contas);
});

router.post('/', async (req, res) => {
  const { descricao, categoria, valor, vencimento } = req.body;
  if (!descricao || valor === undefined || !vencimento) {
    return res.status(400).json({ error: 'Descrição, valor e vencimento são obrigatórios' });
  }
  const conta = await prisma.contaPagar.create({
    data: {
      descricao,
      categoria: categoria || 'OUTROS',
      valor,
      vencimento: new Date(vencimento),
    },
  });
  res.status(201).json(conta);
});

router.put('/:id', async (req, res) => {
  const { descricao, categoria, valor, vencimento } = req.body;
  const conta = await prisma.contaPagar.update({
    where: { id: Number(req.params.id) },
    data: {
      descricao,
      categoria,
      valor,
      vencimento: vencimento ? new Date(vencimento) : undefined,
    },
  });
  res.json(conta);
});

router.post('/:id/pagar', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const conta = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.contaPagar.findUnique({ where: { id } });
      if (!contaAtual) throw new Error('Conta a pagar não encontrada');
      if (contaAtual.status === 'PAGO') throw new Error('Conta já está paga');

      const contaAtualizada = await tx.contaPagar.update({
        where: { id },
        data: { status: 'PAGO', pagoEm: new Date() },
      });

      await tx.movimentoCaixa.create({
        data: {
          tipo: 'SAIDA',
          descricao: `Pagamento: ${contaAtualizada.descricao}`,
          valor: contaAtualizada.valor,
          contaPagarId: contaAtualizada.id,
        },
      });

      return contaAtualizada;
    });

    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  await prisma.contaPagar.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
