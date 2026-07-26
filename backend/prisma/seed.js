require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@scolaro.com';
  const adminSenha = process.env.ADMIN_SENHA || 'admin123';

  const existente = await prisma.usuario.findUnique({ where: { email: adminEmail } });
  if (!existente) {
    const senhaHash = await bcrypt.hash(adminSenha, 10);
    await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: adminEmail,
        senha: senhaHash,
        role: 'ADMIN',
      },
    });
    console.log(`Usuário admin criado: ${adminEmail}`);
  } else {
    console.log('Usuário admin já existe, pulando criação.');
  }

  console.log('Seed concluído.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
