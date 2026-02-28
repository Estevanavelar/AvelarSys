#!/bin/bash
# Backup dos schemas SQL
# StockTech: avelar_stocktech
# AxCellOS: avelar_axcellos

set -e

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Configurações do banco
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="postgres"
DB_PASSWORD="77bfbc034480395c92c0e19d94cda932d2726dd87fd7b0c56e5e68ce68d99dcc"
DB_NAME="postgres"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🔐 Conectando ao PostgreSQL..."
echo "Host: $DB_HOST:$DB_PORT"
echo "Banco: $DB_NAME"
echo "---"

# Export da password para não precisar digitar
export PGPASSWORD="$DB_PASSWORD"

# Backup do schema avelar_stocktech
echo "📦 Fazendo backup do schema: avelar_stocktech"
STOCKTECH_FILE="$BACKUP_DIR/schema_avelar_stocktech_${TIMESTAMP}.sql"
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -n avelar_stocktech \
  --no-owner \
  --no-privileges \
  > "$STOCKTECH_FILE"

if [ -f "$STOCKTECH_FILE" ]; then
  SIZE=$(du -h "$STOCKTECH_FILE" | cut -f1)
  echo "   ✅ StockTech: $STOCKTECH_FILE ($SIZE)"
else
  echo "   ❌ Erro ao fazer backup de avelar_stocktech"
  exit 1
fi

# Backup do schema avelar_axcellos
echo "📦 Fazendo backup do schema: avelar_axcellos"
AXCELLOS_FILE="$BACKUP_DIR/schema_avelar_axcellos_${TIMESTAMP}.sql"
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -n avelar_axcellos \
  --no-owner \
  --no-privileges \
  > "$AXCELLOS_FILE"

if [ -f "$AXCELLOS_FILE" ]; then
  SIZE=$(du -h "$AXCELLOS_FILE" | cut -f1)
  echo "   ✅ AxCellOS: $AXCELLOS_FILE ($SIZE)"
else
  echo "   ❌ Erro ao fazer backup de avelar_axcellos"
  exit 1
fi

echo ""
echo "============================================================"
echo "✨ Backup dos schemas SQL concluído!"
echo "   📁 Local: $BACKUP_DIR/"
echo "============================================================"

# Listar os backups SQL criados
echo ""
echo "📋 Backups SQL disponíveis:"
ls -lh "$BACKUP_DIR"/schema_*.sql 2>/dev/null | awk '{print "   " $9 " (" $5 ")"}'

unset PGPASSWORD
