# Frontend Migration Summary

## Changes Made

The frontend has been consolidated into the puppet-master monorepo for easier development and deployment.

### Directory Structure

**Before:**

```
junction2025/puppet-master/
├── Aichatinterface/          # Separate frontend repo with own .git
└── puppet-master/            # Backend
```

**After:**

```
junction2025/puppet-master/puppet-master/
├── frontend/                 # Frontend (consolidated, no .git)
├── src/                      # Backend source
├── public/                   # Static assets & frontend build output
└── pnpm-workspace.yaml       # Monorepo config
```

### Configuration Updates

1. **pnpm Workspace**: Created `pnpm-workspace.yaml` to manage frontend as workspace package
2. **Package Scripts**: Added frontend commands to root `package.json`:
   - `pnpm run dev:frontend` - Run frontend dev server
   - `pnpm run dev:all` - Run both backend and frontend
   - `pnpm run build:frontend` - Build frontend
   - `pnpm run build:all` - Build both backend and frontend
   - `pnpm run install:frontend` - Install frontend deps

3. **Vite Config**: Updated paths in `frontend/vite.config.ts`:
   - `@backend` alias: `../puppet-master/src` → `../src`
   - Build output: `../puppet-master/public` → `../public`

4. **Git**: Removed `.git` folder from frontend (now tracked by parent repo)

5. **Gitignore**: Added frontend-specific ignores to root `.gitignore`

### Development Workflow

```bash
# From puppet-master directory:
cd /path/to/puppet-master/puppet-master

# Install all dependencies
pnpm install

# Run full stack
pnpm run dev:all

# Or run separately:
pnpm run dev:api      # Backend on :4111
pnpm run dev:frontend # Frontend on :3000
```

### Benefits

- ✅ Single repository simplifies version control
- ✅ Shared dependencies in root `node_modules`
- ✅ Unified build and deployment
- ✅ Easier to keep backend and frontend in sync
- ✅ No need to manage separate git repos

### Docker Build Configuration

The `public/` directory is now excluded from git and built during Docker image creation:

1. **Dockerfile Changes**:
   - Copies workspace config (`pnpm-workspace.yaml`)
   - Installs both root and frontend dependencies
   - Runs `pnpm run build:frontend` to build frontend
   - Frontend outputs to `public/` which backend serves in production
   - No backend build needed (TypeScript runs directly via tsx/node)

2. **.dockerignore Updates**:
   - Excludes `public/`, `dist/`, `node_modules/` from build context
   - Includes `knowledge-base.db` (pre-generated data)

3. **.gitignore Updates**:
   - Added `public/` to ignore frontend build artifacts
   - All build artifacts generated during development/deployment

### Notes

- Frontend dev server (port 3000) proxies `/api/*` to backend (port 4111)
- Production builds output to `public/` for backend to serve (via `@hono/node-server/serve-static`)
- `public/` directory is now gitignored and built in Dockerfile
- All existing functionality preserved - this was a structural change only
