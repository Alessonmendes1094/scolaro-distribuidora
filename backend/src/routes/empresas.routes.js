const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

router.get('/', async (req, res) => {
  const empresas = await prisma.empresa.findMany({ orderBy: { razaoSocial: 'asc' } });
  res.json(empresas);
});

router.get('/:id', async (req, res) => {
  const empresa = await prisma.empresa.findUnique({ where: { id: Number(req.params.id) } });
  if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(empresa);
});

router.post('/', async (req, res) => {
  const { cnpj, razaoSocial, telefone } = req.body;
  if (!cnpj || !razaoSocial) {
    return res.status(400).json({ error: 'CNPJ e razão social são obrigatórios' });
  }
  const empresa = await prisma.empresa.create({ data: { cnpj, razaoSocial, telefone } });
  res.status(201).json(empresa);
});

router.put('/:id', async (req, res) => {
  const { cnpj, razaoSocial, telefone } = req.body;
  const empresa = await prisma.empresa.update({
    where: { id: Number(req.params.id) },
    data: { cnpj, razaoSocial, telefone },
  });
  res.json(empresa);
});

router.delete('/:id', async (req, res) => {
  await prisma.empresa.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
