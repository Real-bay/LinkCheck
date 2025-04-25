FROM node:23-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build frontend (Vite) and backend (e.g., tsc)
RUN npm run build && npm run build:server

# ──────────────────────────────────────────────

FROM node:23-alpine AS runtime

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Copy any assets you might need (optional)
COPY --from=build /app/public ./public

ENV NODE_ENV=production
EXPOSE 3001

# Runs Express, which serves frontend + backend
CMD ["node", "build/server.js"]