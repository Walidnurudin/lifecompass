# ── Build stage ──────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy backend module files first (for dependency caching)
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ .

# Build the binary
RUN go build -o main main.go

# ── Run stage ─────────────────────────────────────────────────
FROM alpine:latest

# ca-certificates required for TLS connections to Neon
RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
