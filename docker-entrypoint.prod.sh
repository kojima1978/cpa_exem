#!/bin/sh
set -e

mkdir -p /app/prisma/data

./node_modules/.bin/prisma db push --skip-generate
./node_modules/.bin/tsx prisma/seed.ts

exec "$@"
