# Use Node.js 20 Alpine for smaller image
FROM node:20-alpine

# Install build dependencies for node-canvas and other native modules
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    python3 \
    make \
    pkgconfig

# Install runtime dependencies for canvas
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    libjpeg-turbo \
    freetype

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy application files
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:coolify"]