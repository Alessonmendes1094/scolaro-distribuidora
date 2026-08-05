-- Permite vincular um cliente a uma conta a receber lancada manualmente

ALTER TABLE "ContaReceber" ADD COLUMN "clienteId" INTEGER;

ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
