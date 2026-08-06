# Production Dockerfile for Modern Site Inspection PDF Generator
FROM mcr.microsoft.com/playwright:v1.42.1-jammy

WORKDIR /app

# Copy package definition
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3000

ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "dist/server.js"]
