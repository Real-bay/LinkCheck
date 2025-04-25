# Start with the Node.js image
FROM node:23-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

EXPOSE 5173

# Command to run the application
CMD ["npm", "run", "start:frontend"]