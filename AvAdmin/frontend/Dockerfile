# ========================================
# AVADMIN FRONTEND - Dockerfile
# ========================================

FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for build
RUN npm install

# Copy source code
COPY . .

# Build-time public envs for Next.js
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S avadmin -u 1001

# Copy built application from builder stage
COPY --from=builder --chown=avadmin:nodejs /app/.next ./.next
COPY --from=builder --chown=avadmin:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=avadmin:nodejs /app/package.json ./package.json

# Switch to non-root user
USER avadmin

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]