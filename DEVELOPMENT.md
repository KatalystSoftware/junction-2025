# Development Guide

## Project Structure

This is a monorepo containing:

- **Backend** (root): Mastra-based game orchestrator and API
- **Frontend** (`frontend/`): React + Vite WhatsApp-style UI

## Development Commands

### Running the Full Application

```bash
# Run both backend and frontend (recommended)
pnpm run dev:all

# Run backend only (API on port 4111)
pnpm run dev:api

# Run frontend only (UI on port 3000)
pnpm run dev:frontend
```

### Building for Production

```bash
# Build both backend and frontend
pnpm run build:all

# Build backend only
pnpm run build

# Build frontend only (outputs to public/)
pnpm run build:frontend
```

### Installing Dependencies

```bash
# Install all dependencies (root + frontend)
pnpm install

# Install frontend dependencies only
pnpm run install:frontend
```

### Other Commands

```bash
# Run tests
pnpm test

# Format code
pnpm format

# Type check
pnpm check

# Initialize knowledge base
pnpm run init:knowledge-base
```

## Ports

- **Backend API**: http://localhost:4111
- **Frontend Dev**: http://localhost:3000
- **Frontend (in production)**: Served from backend's `/public` directory

## API Routes

The backend exposes game orchestration routes at:

- `POST /api/game/init` - Initialize or load session
- `POST /api/game/start-consultation` - Start new client consultation
- `POST /api/game/send-message` - Send message in thread
- `GET /api/game/session/:sessionId` - Get session status

Frontend automatically proxies `/api/*` requests to backend during development.
