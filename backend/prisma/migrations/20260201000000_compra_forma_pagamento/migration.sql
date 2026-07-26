-- AlterEnum
ALTER TYPE "CategoriaDespesa" ADD VALUE 'MERCADORIA';

-- AlterTable
ALTER TABLE "Compra" ADD COLUMN "formaPagamento" "FormaPagamento" NOT NULL DEFAULT 'BOLETO';
ALTER TABLE "Compra" ADD COLUMN "vencimento" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ContaPagar" ADD COLUMN "compraId" INTEGER;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;
