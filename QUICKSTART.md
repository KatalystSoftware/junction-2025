# Quick Start Guide - Local Development

This guide will help you set up a local development environment to test your changes.

## Prerequisites

- **Node.js** >= 22.13.0 ([Download](https://nodejs.org/))
- **pnpm** (will be installed automatically if missing)
- **Docker** (for PostgreSQL database) ([Download](https://www.docker.com/get-started))

## Automated Setup (Recommended)

Run the setup script:

```bash
./setup-local.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Create `.env` file with required configuration
- ✅ Start PostgreSQL database
- ✅ Optionally initialize the knowledge base

## Manual Setup

If you prefer to set up manually:

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create Environment File

Create a `.env` file in the project root:

```bash
# API Keys (required)
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here

# Optional: For voice features
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Server Configuration
PORT=4111
NODE_ENV=development

# Database Configuration
POSTGRES_DB=junction2025
POSTGRES_USER=junction_user
POSTGRES_PASSWORD=junction_dev_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
DATABASE_URL=postgresql://junction_user:junction_dev_password@localhost:5432/junction2025

# Optional: For knowledge base initialization
# OPENAI_API_KEY=your_openai_key_here
```

**Get API Keys:**
- **Google Gemini**: [Get free API key](https://aistudio.google.com/app/apikey)
- **ElevenLabs** (optional): [Get API key](https://elevenlabs.io/)
- **OpenAI** (optional, for knowledge base): [Get API key](https://platform.openai.com/api-keys)

### 3. Start PostgreSQL Database

```bash
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432`.

### 4. Initialize Knowledge Base (Optional but Recommended)

```bash
pnpm init:knowledge-base
```

**Note:** This requires an `OPENAI_API_KEY` in your `.env` file.

### 5. Start Development Servers

Start both backend and frontend:

```bash
pnpm dev
```

Or start them separately:

```bash
# Terminal 1: Backend API
pnpm dev:api

# Terminal 2: Frontend
pnpm dev:frontend
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4111
- **API Health Check**: http://localhost:4111/health/db

## Development Workflow

1. **Make changes** to frontend files in `frontend/src/`
2. **See changes instantly** - Vite hot-reloads automatically
3. **Check the browser** at http://localhost:3000

## Useful Commands

```bash
# Development
pnpm dev              # Start both API + frontend
pnpm dev:api          # Backend only
pnpm dev:frontend     # Frontend only

# Testing
pnpm test             # Run tests
pnpm check            # TypeScript type checking
pnpm format           # Format code

# Database
docker compose ps     # Check database status
docker compose logs postgres  # View database logs
docker compose down    # Stop database

# Knowledge Base
pnpm init:knowledge-base  # Initialize/update knowledge base
```

## Troubleshooting

### Port Already in Use

If port 3000 or 4111 is already in use:

1. **Change frontend port**: Edit `frontend/vite.config.ts` and change `server.port`
2. **Change backend port**: Update `PORT` in `.env`

### Database Connection Issues

1. **Check if PostgreSQL is running**:
   ```bash
   docker compose ps
   ```

2. **View database logs**:
   ```bash
   docker compose logs postgres
   ```

3. **Restart database**:
   ```bash
   docker compose restart postgres
   ```

### Frontend Not Loading

1. **Clear browser cache** or use incognito mode
2. **Check browser console** for errors
3. **Verify backend is running** on port 4111
4. **Check Vite dev server** is running on port 3000

### API Errors

1. **Check API key** is set in `.env`
2. **Verify backend logs** for error messages
3. **Test API health**: http://localhost:4111/health/db

## Next Steps

- Read the [README.md](README.md) for project overview
- Check [docs/](docs/) for detailed documentation
- See [claude.md](claude.md) for developer documentation

Happy coding! 🚀

