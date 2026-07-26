const { Router } = require('express');
const prisma = require('../lib/prisma');

const router = Router();

router.get('/', async (req, res) => {
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: 'asc' } });
  res.json(clientes);
});

router.get('/:id', async (req, res) => {
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(req.params.id) } });
  if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json(cliente);
});

router.post('/', async (req, res) => {
  const { cnpj, nome, endereco, responsavel, telefone } = req.body;
  if (!cnpj || !nome) return res.status(400).json({ error: 'CNPJ e nome são obrigatórios' });
  const cliente = await prisma.cliente.create({
    data: { cnpj, nome, endereco, responsavel, telefone },
  });
  res.status(201).json(cliente);
});

router.put('/:id', async (req, res) => {
  const { cnpj, nome, endereco, responsavel, telefone } = req.body;
  const cliente = await prisma.cliente.update({
    where: { id: Number(req.params.id) },
    data: { cnpj, nome, endereco, responsavel, telefone },
  });
  res.json(cliente);
});

router.delete('/:id', async (req, res) => {
  await prisma.cliente.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

module.exports = router;
