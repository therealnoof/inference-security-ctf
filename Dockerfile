# =============================================================================
# Dockerfile - LLM Security CTF Platform
# =============================================================================
# Multi-stage build for optimal image size:
# 1. deps: Install dependencies
# 2. builder: Build the Next.js application
# 3. runner: Production runtime
#
# Build:  docker build -t llm-ctf:latest .
# Run:    docker run -p 3000:3000 llm-ctf:latest
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Install Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine 
# for understanding why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
# Use --legacy-peer-deps if you encounter peer dependency issues
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Build the Application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build the Next.js application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets from builder stage
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy the standalone build (includes server code)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set port environment variable
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
