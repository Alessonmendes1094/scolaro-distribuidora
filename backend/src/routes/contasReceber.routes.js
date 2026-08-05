const { Router } = require('express');
const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');

const router = Router();

function gerarCodigoBaixa() {
  return `BX-${randomUUID().split('-')[0].toUpperCase()}`;
}

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
    include: { venda: { include: { cliente: true } }, baixa: true },
    orderBy: { vencimento: 'asc' },
  });
  res.json(contas);
});

// body: { descricao, valor, vencimento, lucro? } — lançamento manual, sem venda vinculada
router.post('/', async (req, res) => {
  const { descricao, valor, vencimento, lucro } = req.body;
  if (!descricao || valor === undefined || !vencimento) {
    return res.status(400).json({ error: 'Descrição, valor e vencimento são obrigatórios' });
  }
  const conta = await prisma.contaReceber.create({
    data: {
      descricao,
      valor,
      vencimento: new Date(vencimento),
      lucro: lucro !== undefined && lucro !== null && lucro !== '' ? lucro : null,
      status: 'PENDENTE',
    },
  });
  res.status(201).json(conta);
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { descricao, valor, vencimento, lucro } = req.body;
  try {
    const contaAtual = await prisma.contaReceber.findUnique({ where: { id } });
    if (!contaAtual) throw new Error('Conta a receber não encontrada');
    if (contaAtual.vendaId) throw new Error('Esta conta está vinculada a uma venda e não pode ser editada diretamente');
    if (contaAtual.status === 'PAGO') throw new Error('Não é possível editar uma conta já recebida');

    const conta = await prisma.contaReceber.update({
      where: { id },
      data: {
        descricao,
        valor,
        vencimento: vencimento ? new Date(vencimento) : undefined,
        lucro: lucro !== undefined && lucro !== null && lucro !== '' ? lucro : null,
      },
    });
    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const conta = await prisma.contaReceber.findUnique({ where: { id } });
    if (!conta) return res.status(404).json({ error: 'Conta a receber não encontrada' });
    if (conta.vendaId) {
      throw new Error('Esta conta está vinculada a uma venda e não pode ser excluída diretamente. Exclua a venda.');
    }
    if (conta.status === 'PAGO') {
      throw new Error('Não é possível excluir uma conta já recebida');
    }
    await prisma.contaReceber.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Detalhes de uma baixa (para imprimir o recibo de pagamento)
router.get('/baixas/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Código de baixa inválido' });
  }

  try {
    const baixa = await prisma.baixaRecebimento.findUnique({
      where: { id },
      include: {
        contas: {
          include: { venda: { include: { cliente: true, empresa: true } } },
        },
      },
    });
    if (!baixa) return res.status(404).json({ error: 'Baixa não encontrada' });
    res.json(baixa);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// body: { dataPagamento? } — data em que o recebimento foi efetivamente feito (padrão: agora)
router.post('/:id/pagar', async (req, res) => {
  const id = Number(req.params.id);
  const { dataPagamento } = req.body;
  const dataEfetiva = dataPagamento ? new Date(dataPagamento) : new Date();

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.contaReceber.findUnique({
        where: { id },
        include: { venda: { include: { cliente: true } } },
      });
      if (!contaAtual) throw new Error('Conta a receber não encontrada');
      if (contaAtual.status === 'PAGO') throw new Error('Conta já está paga');
      if (contaAtual.status === 'PERDIDO') {
        throw new Error('Conta marcada como perdida. Reverta a perda antes de registrar o pagamento.');
      }

      const baixa = await tx.baixaRecebimento.create({
        data: {
          codigo: gerarCodigoBaixa(),
          data: dataEfetiva,
          valorTotal: contaAtual.valor,
        },
      });

      const contaAtualizada = await tx.contaReceber.update({
        where: { id },
        data: { status: 'PAGO', pagoEm: dataEfetiva, baixaId: baixa.id },
      });

      const descricaoMovimento = contaAtual.venda
        ? `Recebimento: Venda #${contaAtual.vendaId} - ${contaAtual.venda.cliente.nome}`
        : `Recebimento: ${contaAtual.descricao || 'Lançamento manual'}`;

      await tx.movimentoCaixa.create({
        data: {
          tipo: 'ENTRADA',
          descricao: descricaoMovimento,
          valor: contaAtualizada.valor,
          contaReceberId: contaAtualizada.id,
          vendaId: contaAtual.vendaId,
          data: dataEfetiva,
        },
      });

      return { conta: contaAtualizada, baixaId: baixa.id, codigoBaixa: baixa.codigo };
    });

    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/cancelar-baixa', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const conta = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.contaReceber.findUnique({ where: { id } });
      if (!contaAtual) throw new Error('Conta a receber não encontrada');
      if (contaAtual.status !== 'PAGO') throw new Error('Esta conta não está recebida');

      await tx.movimentoCaixa.deleteMany({ where: { contaReceberId: id } });

      const siblingPendente = await tx.contaReceber.findFirst({
        where: {
          vendaId: contaAtual.vendaId,
          vencimento: contaAtual.vencimento,
          status: { in: ['PENDENTE', 'ATRASADO'] },
          id: { not: id },
        },
        orderBy: { createdAt: 'desc' },
      });

      let valorRestaurado = Number(contaAtual.valor);
      if (siblingPendente) {
        valorRestaurado += Number(siblingPendente.valor);
        await tx.contaReceber.delete({ where: { id: siblingPendente.id } });
      }

      const novoStatus = contaAtual.vencimento < new Date() ? 'ATRASADO' : 'PENDENTE';

      return tx.contaReceber.update({
        where: { id },
        data: { valor: valorRestaurado, status: novoStatus, pagoEm: null, baixaId: null },
      });
    });

    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// body: { motivo? } — marca a pendência como perdida (cliente não pagou e nega a dívida)
router.post('/:id/perda', async (req, res) => {
  const id = Number(req.params.id);
  const { motivo } = req.body;

  try {
    const conta = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.contaReceber.findUnique({ where: { id } });
      if (!contaAtual) throw new Error('Conta a receber não encontrada');
      if (contaAtual.status === 'PAGO') throw new Error('Conta já está paga, não pode ser marcada como perdida');
      if (contaAtual.status === 'PERDIDO') throw new Error('Conta já está marcada como perdida');

      return tx.contaReceber.update({
        where: { id },
        data: { status: 'PERDIDO', perdidoEm: new Date(), motivoPerda: motivo || null },
      });
    });

    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/reverter-perda', async (req, res) => {
  const id = Number(req.params.id);

  try {
    const conta = await prisma.$transaction(async (tx) => {
      const contaAtual = await tx.contaReceber.findUnique({ where: { id } });
      if (!contaAtual) throw new Error('Conta a receber não encontrada');
      if (contaAtual.status !== 'PERDIDO') throw new Error('Esta conta não está marcada como perdida');

      const novoStatus = contaAtual.vencimento < new Date() ? 'ATRASADO' : 'PENDENTE';

      return tx.contaReceber.update({
        where: { id },
        data: { status: novoStatus, perdidoEm: null, motivoPerda: null },
      });
    });

    res.json(conta);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// body: { contaIds: [1,2,3], valorBaixado: 3000, dataPagamento? }
// Baixa total ou parcial de uma ou mais pendências selecionadas.
// Se valorBaixado < soma das contas selecionadas, quita o quanto for
// possível (na ordem de vencimento) e divide a última conta atingida
// em uma parte paga e uma parte que permanece pendente. Todas as
// contas quitadas nesta chamada recebem o mesmo código de baixa.
router.post('/baixar', async (req, res) => {
  const { contaIds, valorBaixado, dataPagamento } = req.body;

  if (!Array.isArray(contaIds) || contaIds.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos uma pendência' });
  }
  const valor = Number(valorBaixado);
  if (!valor || valor <= 0) {
    return res.status(400).json({ error: 'Informe um valor de baixa maior que zero' });
  }
  const dataEfetiva = dataPagamento ? new Date(dataPagamento) : new Date();

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
      if (contas.some((c) => c.status === 'PERDIDO')) {
        throw new Error('Uma ou mais pendências selecionadas estão marcadas como perdidas');
      }

      const somaSelecionada = contas.reduce((acc, c) => acc + Number(c.valor), 0);
      if (valor > somaSelecionada) {
        throw new Error('O valor da baixa não pode ser maior que a soma das pendências selecionadas');
      }

      const baixa = await tx.baixaRecebimento.create({
        data: {
          codigo: gerarCodigoBaixa(),
          data: dataEfetiva,
          valorTotal: valor,
        },
      });

      let restante = valor;
      const contasQuitadas = [];

      for (const conta of contas) {
        if (restante <= 0) break;

        const valorConta = Number(conta.valor);

        const identificacao = conta.venda
          ? `Venda #${conta.vendaId} - ${conta.venda.cliente.nome}`
          : conta.descricao || 'Lançamento manual';

        if (restante >= valorConta) {
          const contaPaga = await tx.contaReceber.update({
            where: { id: conta.id },
            data: { status: 'PAGO', pagoEm: dataEfetiva, baixaId: baixa.id },
          });
          await tx.movimentoCaixa.create({
            data: {
              tipo: 'ENTRADA',
              descricao: `Recebimento: ${identificacao}`,
              valor: valorConta,
              contaReceberId: contaPaga.id,
              vendaId: conta.vendaId,
              data: dataEfetiva,
            },
          });
          contasQuitadas.push(contaPaga);
          restante -= valorConta;
        } else {
          const valorPago = restante;
          const valorRemanescente = valorConta - valorPago;

          const contaPaga = await tx.contaReceber.update({
            where: { id: conta.id },
            data: { valor: valorPago, status: 'PAGO', pagoEm: dataEfetiva, baixaId: baixa.id },
          });
          await tx.movimentoCaixa.create({
            data: {
              tipo: 'ENTRADA',
              descricao: `Recebimento parcial: ${identificacao}`,
              valor: valorPago,
              contaReceberId: contaPaga.id,
              vendaId: conta.vendaId,
              data: dataEfetiva,
            },
          });

          const novaVencida = conta.vencimento < new Date() ? 'ATRASADO' : 'PENDENTE';
          await tx.contaReceber.create({
            data: {
              vendaId: conta.vendaId,
              descricao: conta.descricao,
              valor: valorRemanescente,
              vencimento: conta.vencimento,
              status: novaVencida,
            },
          });

          contasQuitadas.push(contaPaga);
          restante = 0;
        }
      }

      return { contasQuitadas, baixaId: baixa.id, codigoBaixa: baixa.codigo };
    });

    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
