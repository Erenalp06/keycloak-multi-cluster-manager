FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (first build will be slow, subsequent builds use cache)
RUN npm install --legacy-peer-deps --no-audit

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]

