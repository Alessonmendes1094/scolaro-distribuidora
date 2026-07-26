-- CreateTable
CREATE TABLE "AjusteEstoque" (
    "id" SERIAL NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidadeAnterior" DECIMAL(12,3) NOT NULL,
    "quantidadeNova" DECIMAL(12,3) NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AjusteEstoque_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AjusteEstoque" ADD CONSTRAINT "AjusteEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
