# syntax=docker/dockerfile:1

# ==========================================
# ContextBridge — Multi-Service Dockerfile
# ==========================================
# Build targets:
#   - api  (default) → REST API + frontend static files
#   - mcp            → MCP tool server
#
# Railway usage:
#   1. Create an "api" service → builds default target (api)
#   2. Create an "mcp" service → set Dockerfile build target to "mcp"
# ==========================================

# ─── Stage 1: Build Go backend binaries ───
FROM golang:1.24-alpine AS go-builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates

ENV GOTOOLCHAIN=auto

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/api ./cmd/api/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o bin/mcp ./cmd/mcp/main.go

# ─── Stage 2: Build frontend SPA ───
FROM node:22-alpine AS fe-builder
WORKDIR /app

ARG VITE_MCP_URL
ENV VITE_MCP_URL=${VITE_MCP_URL}

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm ci -w frontend --include-workspace-root

COPY frontend/ ./frontend/
RUN npm run build -w frontend

# ─── Stage 3: MCP server image ───
FROM gcr.io/distroless/static-debian12 AS mcp
WORKDIR /app
COPY --from=go-builder /app/bin/mcp /app/mcp
ENV MCP_PORT=8081
EXPOSE 8081
ENTRYPOINT ["/app/mcp"]

# ─── Stage 4: API server image (DEFAULT) ───
FROM gcr.io/distroless/static-debian12 AS api
WORKDIR /app
COPY --from=go-builder /app/bin/api /app/api
COPY --from=go-builder /app/internal/db/migrations /app/internal/db/migrations
COPY --from=fe-builder /app/frontend/dist /app/frontend/dist
ENV PORT=8080
ENV FRONTEND_DIST=/app/frontend/dist
ENV MIGRATIONS_PATH=/app/internal/db/migrations
EXPOSE 8080
ENTRYPOINT ["/app/api"]
