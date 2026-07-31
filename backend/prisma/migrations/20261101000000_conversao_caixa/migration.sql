-- Adiciona suporte a conversao de unidade/kg <-> caixa

ALTER TABLE "Produto" ADD COLUMN "unidadesPorCaixa" DECIMAL(12,3);

ALTER TABLE "ItemCompra" ADD COLUMN "unidadesPorCaixa" DECIMAL(12,3);

ALTER TABLE "ItemVenda" ADD COLUMN "unidadesPorCaixa" DECIMAL(12,3);
