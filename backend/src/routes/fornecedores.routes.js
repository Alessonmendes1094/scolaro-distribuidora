const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

router.get('/', async (req, res) => {
  const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: 'asc' } });
  res.json(fornecedores);
});

router.get('/:id', async (req, res) => {
  const fornecedor = await prisma.fornecedor.findUnique({ where: { id: Number(req.params.id) } });
  if (!fornecedor) return res.status(404).json({ error: 'Fornecedor não encontrado' });
  res.json(fornecedor);
});

router.post('/', async (req, res) => {
  const { nome, telefone } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  const fornecedor = await prisma.fornecedor.create({ data: { nome, telefone } });
  res.status(201).json(fornecedor);
});

router.put('/:id', async (req, res) => {
  const { nome, telefone } = req.body;
  const fornecedor = await prisma.fornecedor.update({
    where: { id: Number(req.params.id) },
    data: { nome, telefone },
  });
  res.json(fornecedor);
});

router.delete('/:id', async (req, res) => {
  await prisma.fornecedor.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
