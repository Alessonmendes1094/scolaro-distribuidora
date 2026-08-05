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

// body: { dataPagamento? } — data em que o pagamento foi efetivamente feito (padrão: agora)
router.post('/:id/pagar', async (req, res) => {
  const id = Number(req.params.id);
  const { dataPagamento } = req.body;
  const dataEfetiva = dataPagamento ? new Date(dataPagamento) : new Date();

  try {
    const conta = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.contaPagar.findUnique({ where: { id } });
      if (!contaAtual) throw new Error('Conta a pagar não encontrada');
      if (contaAtual.status === 'PAGO') throw new Error('Conta já está paga');

      const contaAtualizada = await tx.contaPagar.update({
        where: { id },
        data: { status: 'PAGO', pagoEm: dataEfetiva },
      });

      await tx.movimentoCaixa.create({
        data: {
          tipo: 'SAIDA',
          descricao: `Pagamento: ${contaAtualizada.descricao}`,
          valor: contaAtualizada.valor,
          contaPagarId: contaAtualizada.id,
          data: dataEfetiva,
        },
      });

      return contaAtualizada;
    });

    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/cancelar-baixa', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const conta = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.contaPagar.findUnique({ where: { id } });
      if (!contaAtual) throw new Error('Conta a pagar não encontrada');
      if (contaAtual.status !== 'PAGO') throw new Error('Esta conta não está paga');

      await tx.movimentoCaixa.deleteMany({ where: { contaPagarId: id } });

      const novoStatus = contaAtual.vencimento < new Date() ? 'ATRASADO' : 'PENDENTE';

      return tx.contaPagar.update({
        where: { id },
        data: { status: novoStatus, pagoEm: null },
      });
    });

    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const conta = await prisma.contaPagar.findUnique({ where: { id } });
    if (!conta) return res.status(404).json({ error: 'Conta a pagar não encontrada' });
    if (conta.compraId) {
      throw new Error('Esta conta está vinculada a uma compra e não pode ser excluída diretamente. Exclua a compra.');
    }
    if (conta.status === 'PAGO') {
      throw new Error('Não é possível excluir uma conta já paga');
    }
    await prisma.contaPagar.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
