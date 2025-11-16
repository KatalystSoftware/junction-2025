#!/bin/bash
# Quick check of database status

set -eo pipefail

cd "$(dirname "$0")/../infra"

DATABASE_URL=$(terraform output -raw database_url 2>/dev/null)
DB_HOST=$(terraform output -raw db_private_ip 2>/dev/null)
BASTION_NAME="db-bastion"
BASTION_ZONE=$(terraform output -raw bastion_zone 2>/dev/null)
PROJECT_ID=$(terraform output -raw project_id 2>/dev/null)

LOCAL_PORT=$((15432 + RANDOM % 1000))

echo "Creating tunnel..."
gcloud compute ssh "${BASTION_NAME}" \
  --zone="${BASTION_ZONE}" \
  --project="${PROJECT_ID}" \
  --tunnel-through-iap \
  --ssh-flag="-N" \
  --ssh-flag="-L ${LOCAL_PORT}:${DB_HOST}:5432" \
  --ssh-flag="-o StrictHostKeyChecking=no" \
  --ssh-flag="-o UserKnownHostsFile=/dev/null" \
  > /dev/null 2>&1 &

SSH_PID=$!
sleep 5

cleanup() {
  kill ${SSH_PID} 2>/dev/null || true
}
trap cleanup EXIT

TUNNEL_URL=$(echo "${DATABASE_URL}" | sed "s|@${DB_HOST}:5432|@localhost:${LOCAL_PORT}|g")

echo "Database status:"
echo "==============="
psql "${TUNNEL_URL}" -c "
SELECT
  schemaname || '.' || tablename as table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema = schemaname AND table_name = tablename) as columns
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;
"

echo ""
echo "Recent activity:"
echo "==============="
psql "${TUNNEL_URL}" -c "
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) as size,
  stats_reset,
  xact_commit + xact_rollback as total_transactions
FROM pg_stat_database
WHERE datname = current_database();
"
