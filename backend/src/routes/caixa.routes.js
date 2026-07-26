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

module.exports = router;
