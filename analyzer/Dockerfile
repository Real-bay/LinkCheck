# Start with the Node.js image
FROM node:23-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY ../package.json ../package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Compile using tsc via npm script
RUN npm run build:analyzer

# Entrypoint: run the analyzer
CMD ["node", "analyzer/htmlAnalysis.js"]
