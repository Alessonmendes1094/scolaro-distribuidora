# Scolaro Distribuidora — Sistema de Gestão de Compras e Vendas

Monorepo com:
- `backend/`: Node.js + Express + Prisma + PostgreSQL (API REST)
- `frontend/`: React + Vite + Tailwind (SPA)

## Funcionalidades

- Cadastros de Fornecedores, Produtos e Clientes
- Compras com entrada automática de estoque (com/sem nota fiscal)
- Vendas com baixa automática de estoque e geração de Conta a Receber (FIADO/BOLETO) ou Movimento de Caixa (À VISTA)
- Financeiro: Contas a Pagar, Contas a Receber e extrato de Caixa
- Dashboard com filtro de período, totais e gráfico de vendas por dia
- Relatórios por cliente (vendas, recebidos, pendentes) com exportação em CSV
- Autenticação via JWT

## Rodando localmente com Docker (recomendado)

Pré-requisitos: Docker e Docker Compose instalados.

1. Copie o arquivo de variáveis de ambiente:

   ```bash
   cp .env.example .env
   ```

2. Ajuste as senhas/segredos em `.env` conforme desejar.

3. Suba os containers:

   ```bash
   docker compose up -d --build
   ```

   Isso vai:
   - Subir o PostgreSQL
   - Rodar `prisma migrate deploy` automaticamente no backend
   - Rodar o seed (cria o usuário admin definido em `ADMIN_EMAIL`/`ADMIN_SENHA`)
   - Subir a API em `http://localhost:3333`
   - Subir o frontend em `http://localhost:8080`

4. Acesse `http://localhost:8080` e faça login com as credenciais do `.env` (padrão: `admin@scolaro.com` / `admin123`).

Nenhuma configuração manual adicional é necessária — o script `docker-entrypoint.sh` do backend cuida das migrations e do seed antes de subir a aplicação.

## Deploy em uma VPS com Docker

1. Provisione uma VPS (ex: Ubuntu 22.04) e instale o Docker + Docker Compose:

   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. Copie o projeto para o servidor (via `git clone` ou `scp`):

   ```bash
   git clone <url-do-repositorio> scolaro
   cd scolaro
   ```

3. Crie o `.env` de produção:

   ```bash
   cp .env.example .env
   nano .env   # ajuste POSTGRES_PASSWORD, JWT_SECRET, ADMIN_SENHA, VITE_API_URL
   ```

   Importante: `VITE_API_URL` deve apontar para o endereço público da API (ex: `http://SEU_IP:3333` ou seu domínio).

4. Suba a aplicação:

   ```bash
   docker compose up -d --build
   ```

5. (Opcional) Configure um proxy reverso (Nginx/Caddy/Traefik) na frente das portas 8080 (frontend) e 3333 (backend) para servir com domínio e HTTPS.

6. Para atualizar após mudanças no código:

   ```bash
   git pull
   docker compose up -d --build
   ```

## Desenvolvimento local sem Docker

### Backend

```bash
cd backend
cp .env.example .env   # ajuste DATABASE_URL para seu Postgres local
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

API disponível em `http://localhost:3333`.

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend disponível em `http://localhost:5173`.

## Estrutura de pastas

```
backend/
  prisma/
    schema.prisma       # modelo de dados
    migrations/          # migrations SQL
    seed.js              # cria usuário admin inicial
  src/
    routes/               # rotas REST por entidade
    middleware/auth.js     # validação de JWT
    lib/prisma.js           # client Prisma
    server.js                # bootstrap da API

frontend/
  src/
    pages/          # telas (Dashboard, Compras, Vendas, Financeiro, Relatórios...)
    components/      # Layout e Modal reutilizáveis
    context/          # AuthContext (login/logout, token)
    lib/                # cliente axios e util de export CSV
```
