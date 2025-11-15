FROM node:24-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Enable pnpm via corepack (included with Node 22)
RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 8080

CMD ["pnpm", "start"]
