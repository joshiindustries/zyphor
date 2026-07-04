#!/bin/sh
set -e

# Run Prisma database migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Start the Next.js standalone server
echo "Starting Next.js server..."
exec node server.js
