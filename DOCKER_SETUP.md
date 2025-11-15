# PostgreSQL Docker Setup

This guide explains how to run PostgreSQL for Junction 2025 using Docker or Podman.

## Prerequisites

Either:

- **Docker**: Install from [docker.com](https://docs.docker.com/get-docker/)
- **Podman**: Install from [podman.io](https://podman.io/getting-started/installation)

Podman is a drop-in replacement for Docker and uses the same commands.

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and customize if needed:

```bash
cp .env.example .env
```

Edit `.env` to change default passwords and settings (recommended for production).

### 2. Start PostgreSQL

**Using Docker:**

```bash
docker compose up -d
```

**Using Podman:**

```bash
podman-compose up -d
# or
docker-compose up -d  # Podman supports docker-compose command
```

This will:

- Start PostgreSQL 16 on port 5432
- Create the database and user
- Set up persistent volumes for data
- Schema is auto-created by the application on first connection

### 3. Verify It's Running

**Check container status:**

```bash
docker compose ps
# or
podman-compose ps
```

**Check PostgreSQL logs:**

```bash
docker compose logs postgres
# or
podman-compose logs postgres
```

**Test connection:**

```bash
docker compose exec postgres psql -U junction_user -d junction2025
# or
podman-compose exec postgres psql -U junction_user -d junction2025
```

## Services

### PostgreSQL Database

- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Database**: junction2025 (configurable via `POSTGRES_DB`)
- **User**: junction_user (configurable via `POSTGRES_USER`)
- **Password**: junction_dev_password (configurable via `POSTGRES_PASSWORD`)

**Connection String:**

```
postgresql://junction_user:junction_dev_password@localhost:5432/junction2025
```

### pgAdmin (Optional)

For a web-based database management UI, start pgAdmin:

```bash
docker compose --profile admin up -d
# or
podman-compose --profile admin up -d
```

Access pgAdmin at: http://localhost:5050

- **Email**: admin@junction.local (configurable via `PGADMIN_EMAIL`)
- **Password**: admin (configurable via `PGADMIN_PASSWORD`)

**Add PostgreSQL Server in pgAdmin:**

1. Click "Add New Server"
2. General tab: Name = "Junction 2025"
3. Connection tab:
   - Host: `postgres` (container name)
   - Port: `5432`
   - Database: `junction2025`
   - Username: `junction_user`
   - Password: `junction_dev_password`

## Common Commands

### Start Services

```bash
docker compose up -d
```

### Stop Services

```bash
docker compose down
```

### Stop Services and Remove Data

```bash
docker compose down -v
```

### View Logs

```bash
# All services
docker compose logs -f

# PostgreSQL only
docker compose logs -f postgres

# pgAdmin only
docker compose --profile admin logs -f pgadmin
```

### Restart Services

```bash
docker compose restart
```

### Access PostgreSQL CLI

```bash
docker compose exec postgres psql -U junction_user -d junction2025
```

### Run SQL File

```bash
docker compose exec -T postgres psql -U junction_user -d junction2025 < your-script.sql
```

### Backup Database

```bash
docker compose exec -T postgres pg_dump -U junction_user junction2025 > backup.sql
```

### Restore Database

```bash
docker compose exec -T postgres psql -U junction_user -d junction2025 < backup.sql
```

## Database Initialization

The database schema is **automatically created by the application** on first connection using `CREATE TABLE IF NOT EXISTS` statements. No manual setup or SQL scripts are required.

The application creates:

- 4 tables: `character_states`, `transactions`, `advice_effects`, `monthly_summaries`
- 6 indexes for query optimization
- Foreign key constraints

To reset the database:

```bash
# Stop and remove containers and volumes
docker compose down -v

# Start fresh (schema will be auto-created by app)
docker compose up -d
```

## Environment Variables

| Variable            | Default               | Description             |
| ------------------- | --------------------- | ----------------------- |
| `POSTGRES_DB`       | junction2025          | Database name           |
| `POSTGRES_USER`     | junction_user         | Database user           |
| `POSTGRES_PASSWORD` | junction_dev_password | Database password       |
| `POSTGRES_HOST`     | localhost             | Database host (for app) |
| `POSTGRES_PORT`     | 5432                  | PostgreSQL port         |
| `DATABASE_URL`      | postgresql://...      | Full connection string  |
| `PGADMIN_EMAIL`     | admin@junction.local  | pgAdmin login email     |
| `PGADMIN_PASSWORD`  | admin                 | pgAdmin password        |
| `PGADMIN_PORT`      | 5050                  | pgAdmin web UI port     |

## Data Persistence

Data is persisted using Docker/Podman volumes:

- `postgres_data` - PostgreSQL data directory
- `pgadmin_data` - pgAdmin configuration

Volumes persist even when containers are stopped. To completely remove data:

```bash
docker compose down -v
```

## Troubleshooting

### Port Already in Use

If port 5432 is already in use, change `POSTGRES_PORT` in `.env`:

```env
POSTGRES_PORT=5433
```

Then update your `DATABASE_URL` accordingly.

### Permission Denied

If using Podman on Linux with SELinux, you may need to add `:Z` to volume mounts:

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data:Z
```

### Container Won't Start

Check logs for errors:

```bash
docker compose logs postgres
```

Common issues:

- Port already in use
- Invalid environment variables
- Corrupted volume data (try `docker compose down -v`)

### Cannot Connect from Application

Ensure:

1. PostgreSQL is running: `docker compose ps`
2. Port is correct in `.env`
3. Connection string matches `.env` settings
4. Application can reach `localhost:5432`

## Using with the Application

Update your application's database configuration to use the PostgreSQL connection:

```typescript
// Instead of SQLite file path
const dbPath = "saves/advisor_123.db";

// Use PostgreSQL connection string
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://junction_user:junction_dev_password@localhost:5432/junction2025";
```

## Production Deployment

For production:

1. **Change default passwords** in `.env`
2. **Use secrets management** instead of `.env` file
3. **Enable SSL** for PostgreSQL connections
4. **Configure backups** (pg_dump cronjob or PostgreSQL backup tools)
5. **Set resource limits** in docker-compose.yml
6. **Use external volumes** for better performance
7. **Enable monitoring** (pgBadger, pg_stat_statements)

## Podman-Specific Notes

Podman works almost identically to Docker but:

- Use `podman-compose` instead of `docker compose` (or install podman-docker for compatibility)
- Rootless containers are default (more secure)
- Pods instead of networks (abstracted away by compose)
- SELinux may require volume label modifications

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Podman Documentation](https://docs.podman.io/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
