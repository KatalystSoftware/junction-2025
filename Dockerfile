FROM node:24-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Enable pnpm via corepack (included with Node 22)
RUN corepack enable

# Copy workspace config and package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/

# Install all dependencies (root + frontend workspace)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend only (outputs to public/ for backend to serve)
RUN pnpm run build:frontend

EXPOSE 8080

CMD ["pnpm", "start"]
