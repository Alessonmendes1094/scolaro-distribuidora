const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

router.get('/', async (req, res) => {
  const { dataInicio, dataFim } = req.query;

  const where = {};
  if (dataInicio || dataFim) {
    where.data = {};
    if (dataInicio) where.data.gte = new Date(dataInicio);
    if (dataFim) where.data.lte = new Date(dataFim);
  }

  const movimentos = await prisma.movimentoCaixa.findMany({
    where,
    orderBy: { data: 'desc' },
  });

  const totalEntradas = movimentos
    .filter((m) => m.tipo === 'ENTRADA')
    .reduce((acc, m) => acc + Number(m.valor), 0);
  const totalSaidas = movimentos
    .filter((m) => m.tipo === 'SAIDA')
    .reduce((acc, m) => acc + Number(m.valor), 0);

  res.json({
    movimentos,
    totalEntradas,
    totalSaidas,
    saldo: totalEntradas - totalSaidas,
  });
});

// body: { valorAtual, descricao? } — lança um ajuste para que o saldo
// do caixa passe a refletir o valor informado a partir de agora.
router.post('/ajuste', async (req, res) => {
  const { valorAtual, descricao } = req.body;

  if (valorAtual === undefined || valorAtual === null || Number.isNaN(Number(valorAtual))) {
    return res.status(400).json({ error: 'Informe o valor atual do caixa' });
  }

  try {
    const movimentos = await prisma.movimentoCaixa.findMany();
    const totalEntradas = movimentos
      .filter((m) => m.tipo === 'ENTRADA')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    const totalSaidas = movimentos
      .filter((m) => m.tipo === 'SAIDA')
      .reduce((acc, m) => acc + Number(m.valor), 0);
    const saldoAtual = totalEntradas - totalSaidas;

    const diferenca = Number(valorAtual) - saldoAtual;
    if (diferenca === 0) {
      return res.status(400).json({ error: 'O caixa já está no valor informado' });
    }

    const movimento = await prisma.movimentoCaixa.create({
      data: {
        tipo: diferenca > 0 ? 'ENTRADA' : 'SAIDA',
        descricao: descricao || 'Ajuste de caixa',
        valor: Math.abs(diferenca),
      },
    });

    res.status(201).json({ movimento, saldoAnterior: saldoAtual, saldoNovo: Number(valorAtual) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
