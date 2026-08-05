-- Contas a receber manuais (sem venda vinculada) + lucro manual em lancamentos

ALTER TABLE "ContaReceber" ALTER COLUMN "vendaId" DROP NOT NULL;
ALTER TABLE "ContaReceber" ADD COLUMN "descricao" TEXT;
ALTER TABLE "ContaReceber" ADD COLUMN "lucro" DECIMAL(12,2);

ALTER TABLE "ItemVenda" ADD COLUMN "lucroManual" DECIMAL(12,2);
