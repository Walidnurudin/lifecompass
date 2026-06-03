FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (only production)
RUN npm install --omit=dev

# Copy application source code
COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
