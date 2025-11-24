FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (first build will be slow, subsequent builds use cache)
RUN npm install --legacy-peer-deps --no-audit

# Create cache directory with proper permissions
RUN mkdir -p /app/node_modules/.cache && chmod -R 777 /app/node_modules

# Copy source code
COPY . .

# Ensure cache directory has write permissions
RUN chmod -R 777 /app/node_modules/.cache 2>/dev/null || true

EXPOSE 3000

CMD ["npm", "start"]

