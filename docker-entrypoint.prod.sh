#!/bin/sh
set -e

mkdir -p /app/prisma/data

npx prisma db push --skip-generate
npx prisma db seed

exec "$@"
