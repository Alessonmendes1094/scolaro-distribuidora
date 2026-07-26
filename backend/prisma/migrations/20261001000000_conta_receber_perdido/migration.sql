-- AlterEnum
ALTER TYPE "StatusConta" ADD VALUE 'PERDIDO';

-- AlterTable
ALTER TABLE "ContaReceber" ADD COLUMN "perdidoEm" TIMESTAMP(3);
ALTER TABLE "ContaReceber" ADD COLUMN "motivoPerda" TEXT;
