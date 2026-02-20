# ── Build stage ──────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Cache dependencies first
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN go build -o main main.go

# ── Run stage ─────────────────────────────────────────────────
FROM alpine:latest

# Required for HTTPS / TLS connections (Neon needs this)
RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
