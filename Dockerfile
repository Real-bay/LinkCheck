# ──────────────── Stage 1: Build ────────────────
FROM node:23-alpine AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

# Build frontend (Vite outputs to frontend/dist) and backend (tsc -> backend/build)
# Assumes "build" script runs both: tsc for backend and vite build for frontend
RUN npm run build

# ──────────────── Stage 2: Runtime ────────────────
FROM node:23-alpine AS runtime

WORKDIR /app

# Copy backend build
COPY --from=build /usr/src/app/build ./build

# Copy frontend build output to where server.ts expects it
COPY --from=build /usr/src/app/dist ./dist

# Include deps and metadata
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

# Run Express, which serves API and static frontend
CMD ["node", "build/backend/server.js"]
