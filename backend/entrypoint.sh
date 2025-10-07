#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."
until PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready"

echo "🗄️  Initializing database..."
node scripts/init-database.js

echo "🚀 Starting application..."
exec npm start