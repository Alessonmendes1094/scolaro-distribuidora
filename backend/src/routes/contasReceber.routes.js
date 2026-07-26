const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

async function atualizarAtrasadas() {
  await prisma.contaReceber.updateMany({
    where: { status: 'PENDENTE', vencimento: { lt: new Date() } },
    data: { status: 'ATRASADO' },
  });
}

router.get('/', async (req, res) => {
  await atualizarAtrasadas();
  const { status, clienteId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (clienteId) where.venda = { clienteId: Number(clienteId) };

  const contas = await prisma.contaReceber.findMany({
    where,
    include: { venda: { include: { cliente: true } } },
    orderBy: { vencimento: 'asc' },
  });
  res.json(contas);
});

router.post('/:id/pagar', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const conta = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.contaReceber.findUnique({
        where: { id },
        include: { venda: { include: { cliente: true } } },
      });
      if (!contaAtual) throw new Error('Conta a receber não encontrada');
      if (contaAtual.status === 'PAGO') throw new Error('Conta já está paga');

      const contaAtualizada = await tx.contaReceber.update({
        where: { id },
        data: { status: 'PAGO', pagoEm: new Date() },
      });

      await tx.movimentoCaixa.create({
        data: {
          tipo: 'ENTRADA',
          descricao: `Recebimento: Venda #${contaAtual.vendaId} - ${contaAtual.venda.cliente.nome}`,
          valor: contaAtualizada.valor,
          contaReceberId: contaAtualizada.id,
          vendaId: contaAtual.vendaId,
        },
      });

      return contaAtualizada;
    });

    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
