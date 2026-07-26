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
  const { status, clienteId, dataInicio, dataFim } = req.query;
  const where = {};
  if (status) where.status = status;
  if (clienteId) where.venda = { clienteId: Number(clienteId) };
  if (dataInicio || dataFim) {
    where.vencimento = {};
    if (dataInicio) where.vencimento.gte = new Date(dataInicio);
    if (dataFim) where.vencimento.lte = new Date(dataFim);
  }

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

// body: { contaIds: [1,2,3], valorBaixado: 3000 }
// Baixa total ou parcial de uma ou mais pendências selecionadas.
// Se valorBaixado < soma das contas selecionadas, quita o quanto for
// possível (na ordem de vencimento) e divide a última conta atingida
// em uma parte paga e uma parte que permanece pendente.
router.post('/baixar', async (req, res) => {
  const { contaIds, valorBaixado } = req.body;

  if (!Array.isArray(contaIds) || contaIds.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos uma pendência' });
  }
  const valor = Number(valorBaixado);
  if (!valor || valor <= 0) {
    return res.status(400).json({ error: 'Informe um valor de baixa maior que zero' });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const contas = await tx.contaReceber.findMany({
        where: { id: { in: contaIds.map(Number) } },
        include: { venda: { include: { cliente: true } } },
        orderBy: { vencimento: 'asc' },
      });

      if (contas.length !== contaIds.length) {
        throw new Error('Uma ou mais pendências não foram encontradas');
      }
      if (contas.some((c) => c.status === 'PAGO')) {
        throw new Error('Uma ou mais pendências selecionadas já estão pagas');
      }

      const somaSelecionada = contas.reduce((acc, c) => acc + Number(c.valor), 0);
      if (valor > somaSelecionada) {
        throw new Error('O valor da baixa não pode ser maior que a soma das pendências selecionadas');
      }

      let restante = valor;
      const contasQuitadas = [];

      for (const conta of contas) {
        if (restante <= 0) break;

        const valorConta = Number(conta.valor);

        if (restante >= valorConta) {
          const contaPaga = await tx.contaReceber.update({
            where: { id: conta.id },
            data: { status: 'PAGO', pagoEm: new Date() },
          });
          await tx.movimentoCaixa.create({
            data: {
              tipo: 'ENTRADA',
              descricao: `Recebimento: Venda #${conta.vendaId} - ${conta.venda.cliente.nome}`,
              valor: valorConta,
              contaReceberId: contaPaga.id,
              vendaId: conta.vendaId,
            },
          });
          contasQuitadas.push(contaPaga);
          restante -= valorConta;
        } else {
          const valorPago = restante;
          const valorRemanescente = valorConta - valorPago;

          const contaPaga = await tx.contaReceber.update({
            where: { id: conta.id },
            data: { valor: valorPago, status: 'PAGO', pagoEm: new Date() },
          });
          await tx.movimentoCaixa.create({
            data: {
              tipo: 'ENTRADA',
              descricao: `Recebimento parcial: Venda #${conta.vendaId} - ${conta.venda.cliente.nome}`,
              valor: valorPago,
              contaReceberId: contaPaga.id,
              vendaId: conta.vendaId,
            },
          });

          const novaVencida = conta.vencimento < new Date() ? 'ATRASADO' : 'PENDENTE';
          await tx.contaReceber.create({
            data: {
              vendaId: conta.vendaId,
              valor: valorRemanescente,
              vencimento: conta.vencimento,
              status: novaVencida,
            },
          });

          contasQuitadas.push(contaPaga);
          restante = 0;
        }
      }

      return contasQuitadas;
    });

    res.json({ contasQuitadas: resultado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
