# Alfalyzer Multi-Stage Docker Configuration
# This provides a containerized development environment with multiple access points

# Development Stage
FROM node:18-alpine AS development

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    git \
    python3 \
    make \
    g++ \
    nginx

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /var/log/nginx /run/nginx

# Copy nginx configuration
COPY nginx/alfalyzer.conf /etc/nginx/conf.d/default.conf

# Create entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose multiple ports for different access methods
EXPOSE 3000 3001 3005 8080 8081 8082 8083 8090 8091 80

# Set development environment
ENV NODE_ENV=development
ENV DOCKER_ENV=true

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
CMD ["dev"]

# Production Stage
FROM node:18-alpine AS production

WORKDIR /app

# Install production dependencies only
RUN apk add --no-cache curl bash nginx

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=development /app/dist ./dist
COPY --from=development /app/server ./server
COPY --from=development /app/shared ./shared

# Copy nginx configuration
COPY nginx/alfalyzer.conf /etc/nginx/conf.d/default.conf

# Create production entrypoint
COPY docker/entrypoint-prod.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose production ports
EXPOSE 3001 80

ENV NODE_ENV=production

ENTRYPOINT ["/entrypoint.sh"]
CMD ["start"]

# Multi-Access Development (default)
FROM development AS multi-access

# Additional tools for development
RUN npm install -g nodemon concurrently

# Install tunneling tools
RUN npm install -g localtunnel

# Install ngrok (if available)
RUN curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apk/keys/ngrok.asc >/dev/null && \
    echo "https://ngrok-agent.s3.amazonaws.com/linux_alpine/amd64" >> /etc/apk/repositories && \
    apk update && apk add ngrok || echo "ngrok not available"

# Copy development configurations
COPY vite.config.*.ts ./

# Set multi-access as default
CMD ["multi"]