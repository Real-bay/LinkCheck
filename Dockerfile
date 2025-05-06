FROM node:23-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Build frontend (Vite) and backend (Express/tsc)
RUN npm run build

# ──────────────────────────────────────────────

FROM node:23-alpine AS runtime

WORKDIR /app

COPY --from=build /usr/src/app/build ./build
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

# Runs Express, which serves frontend + backend
CMD ["node", "build/backend/server.js"]