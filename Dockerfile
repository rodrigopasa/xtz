FROM node:18.20.5-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:18.20.5-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    ca-certificates \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create app directory and required directories
WORKDIR /app
RUN mkdir -p /app/public/books /app/public/covers /app/uploads && \
    chmod -R 777 /app/public /app/uploads

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env* ./
# Renomeia o .env.production para .env se existir
RUN if [ -f ".env.production" ]; then \
    mv .env.production .env; \
    echo "Using production environment file"; \
fi
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install production dependencies including tsx for TypeScript execution
RUN npm ci

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV SSL_CERT_DIR=/etc/ssl/certs
ENV VITE_DEV_SERVER_ENABLED=false

# Define script de inicialização baseado em ambiente
CMD if [ "$USE_SQLITE" = "true" ]; then \
    npx tsx server/initDb-sqlite.ts && npx tsx server/index-sqlite.ts; \
  else \
    npx tsx server/initDb.ts && npm run start; \
  fi