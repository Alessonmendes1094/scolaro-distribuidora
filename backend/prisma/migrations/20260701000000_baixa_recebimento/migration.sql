-- CreateTable
CREATE TABLE "BaixaRecebimento" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaixaRecebimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaixaRecebimento_codigo_key" ON "BaixaRecebimento"("codigo");

-- AlterTable
ALTER TABLE "ContaReceber" ADD COLUMN "baixaId" INTEGER;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_baixaId_fkey" FOREIGN KEY ("baixaId") REFERENCES "BaixaRecebimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
