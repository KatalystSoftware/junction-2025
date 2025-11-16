#!/bin/bash
##
# ☠️  DATABASE NUKE SCRIPT  ☠️
#
# Fetches credentials from Terraform state and completely wipes the production database.
# Connects through bastion host via gcloud compute ssh tunnel.
# After nuking, automatically redeploys Cloud Run to recreate the schema.
#
# Usage:
#   ./scripts/nuke-db.sh                    # Dry-run (preview only)
#   ./scripts/nuke-db.sh --confirm          # Actually delete + redeploy
#   ./scripts/nuke-db.sh --confirm --backup # Backup before deletion
#
# Requirements:
#   - gcloud CLI installed and authenticated
#   - psql (PostgreSQL client)
#   - Access to bastion host
#
# Safety Features:
# - Requires --confirm flag
# - Must manually type database name to proceed
# - Shows preview of all tables before deletion
# - Optional backup creation
# - Automatic Cloud Run redeploy to recreate schema
# - Comprehensive logging

set -eo pipefail  # Removed -u to avoid unset variable exits

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
INFRA_DIR="${PROJECT_ROOT}/infra"

# Parse arguments
CONFIRM=false
BACKUP=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --confirm)
      CONFIRM=true
      shift
      ;;
    --backup)
      BACKUP=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--confirm] [--backup]"
      echo ""
      echo "Options:"
      echo "  --confirm    Actually delete (requires typing database name)"
      echo "  --backup     Create pg_dump backup before deletion"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Banner
echo -e "\n${RED}============================================================${NC}"
echo -e "${RED}${BOLD}  ☠️  DATABASE NUKE SCRIPT  ☠️${NC}"
echo -e "${RED}============================================================${NC}\n"

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
  echo -e "${RED}ERROR: terraform command not found${NC}"
  echo "Please install Terraform: https://www.terraform.io/downloads"
  exit 1
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}ERROR: gcloud command not found${NC}"
  echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  echo -e "${RED}ERROR: psql command not found${NC}"
  echo "Please install PostgreSQL client tools"
  exit 1
fi

# Check if infra directory exists
if [ ! -d "${INFRA_DIR}" ]; then
  echo -e "${RED}ERROR: Terraform directory not found: ${INFRA_DIR}${NC}"
  exit 1
fi

# Change to infra directory
cd "${INFRA_DIR}"

# Check if Terraform is initialized
if [ ! -d ".terraform" ]; then
  echo -e "${YELLOW}WARNING: Terraform not initialized. Running terraform init...${NC}"
  terraform init
fi

echo -e "${CYAN}📡 Fetching credentials from Terraform state...${NC}"

# Get database outputs
DB_HOST=$(terraform output -raw db_private_ip 2>/dev/null || echo "")
DB_NAME=$(terraform output -raw db_name 2>/dev/null || echo "")
DB_USER=$(terraform output -raw db_user 2>/dev/null || echo "")
DATABASE_URL_TEMPLATE=$(terraform output -raw database_url 2>/dev/null || echo "")
PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || echo "")

# Get bastion outputs
BASTION_NAME="db-bastion"
BASTION_ZONE=$(terraform output -raw bastion_zone 2>/dev/null || echo "europe-north1-b")

if [ -z "${DB_HOST}" ] || [ -z "${DB_NAME}" ] || [ -z "${DB_USER}" ] || [ -z "${DATABASE_URL_TEMPLATE}" ]; then
  echo -e "${RED}ERROR: Could not retrieve database credentials from Terraform state${NC}"
  echo "Make sure Terraform has been applied and outputs exist"
  exit 1
fi

echo -e "${GREEN}✅ Retrieved credentials${NC}\n"

# Show database info
echo -e "${CYAN}📍 Target Database:${NC}"
echo -e "   Host:     ${DB_HOST} (private)"
echo -e "   Port:     5432"
echo -e "   Database: ${BOLD}${DB_NAME}${NC}"
echo -e "   User:     ${DB_USER}"
echo -e "\n${CYAN}📍 Bastion Host:${NC}"
echo -e "   Name:     ${BASTION_NAME}"
echo -e "   Zone:     ${BASTION_ZONE}"
echo -e "   Project:  ${PROJECT_ID}"

# Use a random local port to avoid conflicts
LOCAL_PORT=$((15432 + RANDOM % 1000))

echo -e "\n${CYAN}🔌 Creating SSH tunnel through bastion...${NC}"
echo -e "   ${BASTION_NAME} -> ${DB_HOST}:5432"
echo -e "   Local port: ${LOCAL_PORT}"

# Start SSH tunnel in background
echo -e "${CYAN}   Establishing tunnel (this may take 10-15 seconds)...${NC}"

# Simple, direct approach: gcloud compute ssh with port forwarding
gcloud compute ssh "${BASTION_NAME}" \
  --zone="${BASTION_ZONE}" \
  --project="${PROJECT_ID}" \
  --tunnel-through-iap \
  --ssh-flag="-N" \
  --ssh-flag="-L ${LOCAL_PORT}:${DB_HOST}:5432" \
  --ssh-flag="-o StrictHostKeyChecking=no" \
  --ssh-flag="-o UserKnownHostsFile=/dev/null" \
  --ssh-flag="-o ServerAliveInterval=60" \
  --ssh-flag="-o ExitOnForwardFailure=yes" \
  > /dev/null 2>&1 &

SSH_PID=$!

echo -e "${CYAN}   Waiting for tunnel to stabilize (PID: ${SSH_PID})...${NC}"

# Wait for tunnel to establish and verify it's working
for i in {1..15}; do
  if ! ps -p ${SSH_PID} > /dev/null 2>&1; then
    echo -e "${RED}ERROR: SSH tunnel process died${NC}"
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Test basic SSH: gcloud compute ssh ${BASTION_NAME} --zone=${BASTION_ZONE} --project=${PROJECT_ID}"
    echo -e "  2. Check if bastion can reach database: ssh to bastion and run 'nc -zv ${DB_HOST} 5432'"
    echo -e "  3. Verify IAM permissions"
    exit 1
  fi

  # Check if port is listening
  if lsof -i:${LOCAL_PORT} > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Tunnel established and port is listening${NC}"
    break
  fi

  sleep 1
done

# Final check
if ! lsof -i:${LOCAL_PORT} > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Warning: Port ${LOCAL_PORT} still not listening after 15 seconds${NC}"
  echo -e "${CYAN}   Tunnel process is running, continuing anyway...${NC}"
fi

# Cleanup function to kill tunnel on exit
cleanup() {
  echo -e "\n${CYAN}🔌 Closing SSH tunnel...${NC}"
  # Kill the specific SSH process if we have the PID
  if [ -n "${SSH_PID}" ] && ps -p ${SSH_PID} > /dev/null 2>&1; then
    kill ${SSH_PID} 2>/dev/null || true
  fi
  # Kill any lingering processes related to our tunnel
  pkill -f "${LOCAL_PORT}:${DB_HOST}:5432" 2>/dev/null || true
  pkill -f "gcloud compute start-iap-tunnel.*${BASTION_NAME}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Build connection string for local tunnel
# Replace the remote host:port with localhost:LOCAL_PORT in the Terraform-provided URL
TUNNEL_DATABASE_URL=$(echo "${DATABASE_URL_TEMPLATE}" | sed "s|@${DB_HOST}:5432|@localhost:${LOCAL_PORT}|g")

# Test connection by listing tables
echo -e "\n${CYAN}🔌 Connecting to database and scanning tables...${NC}"
echo -e "${CYAN}   Connection: localhost:${LOCAL_PORT} -> ${DB_HOST}:5432${NC}"

# Create a temp file for stderr
PSQL_STDERR=$(mktemp)

# List all tables (this tests the connection AND gets what we need)
echo -e "${CYAN}   Running query...${NC}"

# First, try a simple connection test
echo -e "${CYAN}   Testing basic connectivity...${NC}"
if timeout 5 psql "${TUNNEL_DATABASE_URL}" -c "SELECT 1" 2>"${PSQL_STDERR}" > /dev/null; then
  echo -e "${GREEN}   ✓ Basic connection successful${NC}"
else
  TEST_EXIT=$?
  echo -e "${RED}   ✗ Basic connection failed (exit: ${TEST_EXIT})${NC}"
  echo -e "${YELLOW}Error:${NC}"
  cat "${PSQL_STDERR}"
  rm -f "${PSQL_STDERR}"
  exit 1
fi

# Now get the table list from ALL schemas (excluding system schemas)
echo -e "${CYAN}   Fetching table list from all schemas...${NC}"
TABLES_WITH_SCHEMA=$(timeout 15 psql "${TUNNEL_DATABASE_URL}" -t -c "SELECT schemaname || '.' || tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY schemaname, tablename;" 2>"${PSQL_STDERR}") || true
PSQL_EXIT=$?

echo -e "${CYAN}   Query exit code: ${PSQL_EXIT}${NC}"

if [ ${PSQL_EXIT} -eq 124 ]; then
  echo -e "${RED}ERROR: Database query timed out after 15 seconds${NC}"
  echo -e "${YELLOW}This could mean:${NC}"
  echo -e "  1. Bastion cannot reach database at ${DB_HOST}:5432"
  echo -e "  2. Database firewall rules blocking bastion"
  echo -e "  3. Database is not running"
  rm -f "${PSQL_STDERR}"
  exit 1
elif [ ${PSQL_EXIT} -ne 0 ]; then
  echo -e "${RED}ERROR: Failed to query database (exit code: ${PSQL_EXIT})${NC}"
  echo -e "${YELLOW}psql stderr:${NC}"
  cat "${PSQL_STDERR}"
  echo ""
  echo -e "${YELLOW}psql stdout:${NC}"
  echo "${TABLES_WITH_SCHEMA}"
  echo ""
  echo -e "${YELLOW}Connection details:${NC}"
  echo -e "  Host: localhost:${LOCAL_PORT}"
  echo -e "  Database: ${DB_NAME}"
  echo -e "  User: ${DB_USER}"
  echo -e "  Tunnel PID: ${SSH_PID}"
  echo -e "  Tunnel alive: $(ps -p ${SSH_PID} > /dev/null 2>&1 && echo 'yes' || echo 'no')"
  echo -e "  Port listening: $(lsof -i:${LOCAL_PORT} 2>/dev/null | tail -n +2 || echo 'not listening')"
  rm -f "${PSQL_STDERR}"
  exit 1
fi

rm -f "${PSQL_STDERR}"

# Clean up table list
TABLES_WITH_SCHEMA=$(echo "${TABLES_WITH_SCHEMA}" | tr -d ' ')

echo -e "${GREEN}✅ Connected to database successfully${NC}"
echo -e "${CYAN}   Tables found: $(echo "${TABLES_WITH_SCHEMA}" | grep -c . || echo "0")${NC}"

if [ -z "${TABLES_WITH_SCHEMA}" ]; then
  echo -e "\n${YELLOW}📭 Database is already empty (no tables found)${NC}"
  exit 0
fi

# Count tables
TABLE_COUNT=$(echo "${TABLES_WITH_SCHEMA}" | grep -c . || echo "0")

echo -e "${CYAN}Found ${TABLE_COUNT} tables:${NC}"

# Show table details
TOTAL_ROWS=0
for table_with_schema in ${TABLES_WITH_SCHEMA}; do
  if [ -n "${table_with_schema}" ]; then
    ROW_COUNT=$(psql "${TUNNEL_DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"${table_with_schema}\";" 2>/dev/null | tr -d ' ' || echo "0")
    printf "   • %-40s (%'d rows)\n" "${table_with_schema}" "${ROW_COUNT}"
    TOTAL_ROWS=$((TOTAL_ROWS + ROW_COUNT))
  fi
done

echo -e "\n   ${BOLD}Total: ${TOTAL_ROWS} rows${NC}"

# Dry-run mode
if [ "$CONFIRM" = false ]; then
  echo -e "\n${YELLOW}${BOLD}🔍 DRY-RUN MODE: No changes will be made${NC}"
  echo -e "\n${CYAN}To actually delete the database, run:${NC}"
  echo -e "${CYAN}${BOLD}   ./scripts/nuke-db.sh --confirm${NC}"
  exit 0
fi

# Confirmation required
echo -e "\n${RED}${BOLD}⚠️  WARNING: You are about to DELETE ALL DATA${NC}"
echo -e "${RED}   • ${TABLE_COUNT} tables will be dropped${NC}"
echo -e "${RED}   • ${TOTAL_ROWS} rows will be lost${NC}"
echo -e "${RED}   • This action CANNOT be undone${NC}"

# Create backup if requested
if [ "$BACKUP" = true ]; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_FILE="${PROJECT_ROOT}/backup-${DB_NAME}-${TIMESTAMP}.sql"

  echo -e "\n${CYAN}📦 Creating backup: ${BACKUP_FILE}${NC}"

  if pg_dump "${TUNNEL_DATABASE_URL}" -f "${BACKUP_FILE}"; then
    echo -e "${GREEN}✅ Backup created${NC}"
  else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
  fi
fi

# Prompt for confirmation
echo -e "\n${YELLOW}To proceed, type the database name exactly: ${BOLD}${DB_NAME}${NC}"
read -p "Database name: " USER_INPUT

if [ "${USER_INPUT}" != "${DB_NAME}" ]; then
  echo -e "\n${YELLOW}❌ Confirmation failed. Aborting.${NC}"
  exit 1
fi

# Final countdown
echo -e "\n${RED}⏳ Starting deletion in...${NC}"
for i in 3 2 1; do
  echo -e "${RED}   ${i}...${NC}"
  sleep 1
done

# Drop all tables
echo -e "\n${RED}💣 Dropping ${TABLE_COUNT} tables...${NC}"

for table_with_schema in ${TABLES_WITH_SCHEMA}; do
  if [ -n "${table_with_schema}" ]; then
    # Parse schema.table
    SCHEMA=$(echo "${table_with_schema}" | cut -d. -f1)
    TABLE=$(echo "${table_with_schema}" | cut -d. -f2)

    if psql "${TUNNEL_DATABASE_URL}" -c "DROP TABLE IF EXISTS \"${SCHEMA}\".\"${TABLE}\" CASCADE;" > /dev/null 2>&1; then
      echo -e "${YELLOW}  ✓ Dropped: ${table_with_schema}${NC}"
    else
      echo -e "${RED}  ✗ Failed to drop ${table_with_schema}${NC}"
    fi
  fi
done

# Verify
REMAINING=$(psql "${TUNNEL_DATABASE_URL}" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema');" 2>/dev/null | tr -d ' ')

if [ "${REMAINING}" = "0" ]; then
  echo -e "\n${GREEN}${BOLD}✅ SUCCESS: Database wiped clean${NC}"
else
  echo -e "\n${YELLOW}⚠️  WARNING: ${REMAINING} tables remain${NC}"
fi

echo -e "\n${CYAN}🔌 Disconnected from database${NC}"

# Redeploy Cloud Run to recreate schema
if [ "$CONFIRM" = true ]; then
  echo -e "\n${CYAN}${BOLD}🚀 Redeploying Cloud Run to recreate schema...${NC}"

  SERVICE_NAME="financial-advisor-sim"
  REGION=$(terraform output -raw region 2>/dev/null || echo "europe-north1")

  CURRENT_IMAGE=$(gcloud run services describe "${SERVICE_NAME}" \
    --region="${REGION}" \
    --project="${PROJECT_ID}" \
    --format="value(spec.template.spec.containers[0].image)" 2>/dev/null || echo "")

  if [ -n "${CURRENT_IMAGE}" ]; then
    echo -e "${CYAN}   Creating new revision...${NC}"
    if gcloud run deploy "${SERVICE_NAME}" \
      --image="${CURRENT_IMAGE}" \
      --region="${REGION}" \
      --project="${PROJECT_ID}" \
      --quiet 2>&1 | grep -q "Service.*is now live"; then
      echo -e "${GREEN}✅ Cloud Run redeployed - schema will be recreated on startup${NC}"
    else
      echo -e "${YELLOW}⚠️  Redeploy may have failed - check manually${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Could not get current image - skipping redeploy${NC}"
  fi
fi
