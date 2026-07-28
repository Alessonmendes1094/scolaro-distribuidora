require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');
const { uploadsDir } = require('./lib/upload');

const authRoutes = require('./routes/auth.routes');
const configuracoesRoutes = require('./routes/configuracoes.routes');
const empresasRoutes = require('./routes/empresas.routes');
const fornecedoresRoutes = require('./routes/fornecedores.routes');
const produtosRoutes = require('./routes/produtos.routes');
const clientesRoutes = require('./routes/clientes.routes');
const comprasRoutes = require('./routes/compras.routes');
const vendasRoutes = require('./routes/vendas.routes');
const contasPagarRoutes = require('./routes/contasPagar.routes');
const contasReceberRoutes = require('./routes/contasReceber.routes');
const caixaRoutes = require('./routes/caixa.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Arquivos enviados (ex: logo) — servidos publicamente para uso em <img>,
// inclusive nos recibos impressos.
app.use('/uploads', express.static(uploadsDir));

app.use('/auth', authRoutes);

app.use('/configuracoes', authMiddleware, configuracoesRoutes);
app.use('/empresas', authMiddleware, empresasRoutes);
app.use('/fornecedores', authMiddleware, fornecedoresRoutes);
app.use('/produtos', authMiddleware, produtosRoutes);
app.use('/clientes', authMiddleware, clientesRoutes);
app.use('/compras', authMiddleware, comprasRoutes);
app.use('/vendas', authMiddleware, vendasRoutes);
app.use('/contas-pagar', authMiddleware, contasPagarRoutes);
app.use('/contas-receber', authMiddleware, contasReceberRoutes);
app.use('/caixa', authMiddleware, caixaRoutes);
app.use('/dashboard', authMiddleware, dashboardRoutes);
app.use('/relatorios', authMiddleware, relatoriosRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Evita que um erro não tratado em uma rota (ex: promise rejeitada sem
// try/catch) derrube o processo inteiro do servidor.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
