FROM node:18.20.5-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
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
    && rm -rf /var/lib/apt/lists/*

# Create app directory and public directory
WORKDIR /app
RUN mkdir -p /app/public && chmod 777 /app/public

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/uploads ./uploads

# Install production dependencies including vite for production use
COPY --from=builder /app/node_modules ./node_modules

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000

# Start the application
CMD ["npm", "run", "start"]