# Use Node.js 20 Alpine for better security and performance
FROM node:20.11.1-alpine

# Update Alpine packages to latest security patches
RUN apk update && apk upgrade --no-cache

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (though Cloudflare Workers don't use ports)
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8787/health || exit 1

# Default command
CMD ["npm", "run", "dev"]
