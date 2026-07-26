#!/bin/sh
set -e

echo ">> Aguardando banco de dados ficar disponível..."
until npx prisma migrate deploy; do
  echo ">> Banco ainda não disponível, tentando novamente em 3s..."
  sleep 3
done

echo ">> Migrations aplicadas com sucesso."

if [ "$RUN_SEED" != "false" ]; then
  echo ">> Executando seed..."
  node prisma/seed.js || echo ">> Seed falhou ou já foi executado anteriormente."
fi

echo ">> Iniciando aplicação..."
exec node src/server.js
