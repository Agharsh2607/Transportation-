FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund

# Copy application source
COPY src ./src

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]
