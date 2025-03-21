# Start with the Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the rest of the application files
COPY . .

# Compile TypeScript to JavaScript
RUN tsc

# Command to run the application
CMD ["node", "/app/build/index.js"]


