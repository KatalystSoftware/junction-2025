# Deployment Guide

## Overview

This guide covers deploying the Financial Advisor Simulator in various environments, including Docker/Podman setup and production deployment.

## Local Development

### Prerequisites

- **Node.js** >= 22.13.0
- **pnpm** (recommended) or npm
- **Google Gemini API key** - Get one free at [Google AI Studio](https://aistudio.google.com/app/apikey)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/KatalystSoftware/junction-2025.git
cd junction-2025

# Install dependencies
pnpm install

# Set up environment variables
echo "GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here" > .env

# (Optional) Add ElevenLabs for voice
echo "ELEVENLABS_API_KEY=your_elevenlabs_key" >> .env

# Initialize knowledge base
pnpm init:knowledge-base

# Start development
pnpm dev  # Runs both backend and frontend
```

## PostgreSQL Setup

The application uses PostgreSQL for production and can use LibSQL for local development.

### Using Docker/Podman

Either Docker or Podman can be used (Podman is a drop-in replacement for Docker).

#### 1. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` to change default passwords and settings (recommended for production).

#### 2. Start PostgreSQL

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

#### 3. Verify It's Running

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

### Services

#### PostgreSQL Database

- **Port**: 5432 (configurable via `POSTGRES_PORT`)
- **Database**: junction2025 (configurable via `POSTGRES_DB`)
- **User**: junction_user (configurable via `POSTGRES_USER`)
- **Password**: junction_dev_password (configurable via `POSTGRES_PASSWORD`)

**Connection String:**

```
postgresql://junction_user:junction_dev_password@localhost:5432/junction2025
```

#### pgAdmin (Optional)

For a web-based database management UI:

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

### Common Database Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Stop services and remove data
docker compose down -v

# View logs
docker compose logs -f postgres

# Access PostgreSQL CLI
docker compose exec postgres psql -U junction_user -d junction2025

# Backup database
docker compose exec -T postgres pg_dump -U junction_user junction2025 > backup.sql

# Restore database
docker compose exec -T postgres psql -U junction_user -d junction2025 < backup.sql
```

### Database Initialization

The database schema is **automatically created by the application** on first connection using `CREATE TABLE IF NOT EXISTS` statements.

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

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | junction2025 | Database name |
| `POSTGRES_USER` | junction_user | Database user |
| `POSTGRES_PASSWORD` | junction_dev_password | Database password |
| `POSTGRES_HOST` | localhost | Database host (for app) |
| `POSTGRES_PORT` | 5432 | PostgreSQL port |
| `DATABASE_URL` | postgresql://... | Full connection string |
| `PGADMIN_EMAIL` | admin@junction.local | pgAdmin login email |
| `PGADMIN_PASSWORD` | admin | pgAdmin password |
| `PGADMIN_PORT` | 5050 | pgAdmin web UI port |

## Production Deployment

### Building for Production

```bash
# Build both backend and frontend
pnpm build:all

# Build backend only
pnpm build

# Build frontend only (outputs to public/)
pnpm build:frontend
```

### Docker Deployment

The project includes a Dockerfile for containerized deployment.

#### Dockerfile Configuration

The Dockerfile:
- Copies workspace config (`pnpm-workspace.yaml`)
- Installs both root and frontend dependencies
- Runs `pnpm run build:frontend` to build frontend
- Frontend outputs to `public/` which backend serves in production
- No backend build needed (TypeScript runs directly via tsx/node)

#### .dockerignore Updates

Excludes from build context:
- `public/`, `dist/`, `node_modules/`
- Includes `knowledge-base.db` (pre-generated data)

#### Building Docker Image

```bash
# Build the image
docker build -t junction-2025 .

# Run the container
docker run -p 4111:4111 \
  -e GOOGLE_GENERATIVE_AI_API_KEY=your_key \
  -e DATABASE_URL=postgresql://... \
  junction-2025
```

### Production Checklist

For production deployment:

1. **Change default passwords** in `.env`
2. **Use secrets management** instead of `.env` file
3. **Enable SSL** for PostgreSQL connections
4. **Configure backups** (pg_dump cronjob or PostgreSQL backup tools)
5. **Set resource limits** in docker-compose.yml
6. **Use external volumes** for better performance
7. **Enable monitoring** (pgBadger, pg_stat_statements)
8. **Set up reverse proxy** (nginx/caddy) for SSL termination
9. **Configure CORS** for frontend domain
10. **Enable rate limiting** on API endpoints

### Environment Configuration

```bash
# Production environment variables
GOOGLE_GENERATIVE_AI_API_KEY=your_production_key
ELEVENLABS_API_KEY=your_production_key
DATABASE_URL=postgresql://user:pass@db-host:5432/dbname
NODE_ENV=production
PORT=4111
AGENT_LLM_MODEL=google/gemini-2.0-flash
```

## Troubleshooting

### Port Already in Use

If port 5432 is already in use, change `POSTGRES_PORT` in `.env`:

```env
POSTGRES_PORT=5433
```

Then update your `DATABASE_URL` accordingly.

### Permission Denied (Podman + SELinux)

If using Podman on Linux with SELinux, add `:Z` to volume mounts:

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

### Build Failures

**Issue:** Frontend build fails

**Solution:**
```bash
# Clean install
rm -rf node_modules frontend/node_modules
pnpm install
pnpm build:frontend
```

**Issue:** TypeScript errors

**Solution:**
```bash
# Check types
pnpm check

# Fix formatting
pnpm format
```

## Podman-Specific Notes

Podman works almost identically to Docker but:
- Use `podman-compose` instead of `docker compose` (or install podman-docker for compatibility)
- Rootless containers are default (more secure)
- Pods instead of networks (abstracted away by compose)
- SELinux may require volume label modifications

## Monitoring & Maintenance

### Health Checks

```bash
# Check API health
curl http://localhost:4111/health

# Check database connection
docker compose exec postgres pg_isready -U junction_user
```

### Logs

```bash
# Application logs
docker compose logs -f app

# Database logs
docker compose logs -f postgres

# All services
docker compose logs -f
```

### Backups

Set up automated backups:

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres pg_dump -U junction_user junction2025 > "backup_$DATE.sql"

# Add to crontab
0 2 * * * /path/to/backup.sh
```

## Scaling Considerations

For high-traffic deployments:

1. **Database Connection Pooling** - Use pgBouncer
2. **Load Balancing** - Multiple backend instances
3. **CDN** - Serve static frontend assets via CDN
4. **Caching** - Redis for session/response caching
5. **Rate Limiting** - Protect API from abuse
6. **Monitoring** - Prometheus + Grafana

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Podman Documentation](https://docs.podman.io/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
