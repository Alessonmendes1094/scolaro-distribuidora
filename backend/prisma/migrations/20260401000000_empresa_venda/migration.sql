-- CreateTable
CREATE TABLE "Empresa" (
    "id" SERIAL NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "telefone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_cnpj_key" ON "Empresa"("cnpj");

-- Seed das duas empresas existentes
INSERT INTO "Empresa" ("cnpj", "razaoSocial") VALUES
    ('35896507000150', 'Scolaro Distribuidora de Frios LTDA'),
    ('66318941000186', 'C A R dos S Scolaro - Distribuidora de Frios LTDA');

-- AlterTable: adiciona coluna nullable primeiro para poder popular vendas existentes
ALTER TABLE "Venda" ADD COLUMN "empresaId" INTEGER;

-- Vincula todas as vendas já existentes à primeira empresa (Scolaro Distribuidora de Frios LTDA)
UPDATE "Venda" SET "empresaId" = (SELECT "id" FROM "Empresa" WHERE "cnpj" = '35896507000150');

-- Agora torna a coluna obrigatória
ALTER TABLE "Venda" ALTER COLUMN "empresaId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
