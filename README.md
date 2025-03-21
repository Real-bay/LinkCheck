# LinkCheck

This project uses the VirusTotal API to scan URLs and analyze their safety by retrieving analysis results. It can be run both locally with Node.js or in a Docker container using Docker Compose.

## Features

- Submits a URL for scanning to the VirusTotal API.
- Retrieves analysis results after the scan is completed.
- Supports both local and containerized environments.

## Prerequisites

Before using this tool, ensure you have the following:

1. [Node.js](https://nodejs.org/) (version 18.x or higher) installed on your system.
2. A valid [VirusTotal API key](https://www.virustotal.com/api/v3/).

You’ll also need to set your API key as an environment variable in a `.env` file:

```
VIRUSTOTAL_API_KEY=your_api_key_here
```

## Installation

### 1. Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/Real-bay/LinkCheck.git
cd LinkCheck
```

### 2. Install Dependencies

Install the required npm packages:

```bash
npm install
```

## Running the Project

### Option 1: Running Locally with Node.js

1. Set up your `.env` file with your VirusTotal API key (see the **Prerequisites** section).
2. Run the project:

```bash
npm start
```

This will build the TypeScript files and execute the script in `build/index.js`. You can modify the URL to scan within the script itself or integrate it into a larger application.

### Option 2: Running in Docker with Docker Compose

To run the project using Docker Compose, follow these steps:

1. **Create a `.env` file** with your VirusTotal API key, as shown above.
2. **Build and run the services:**

```bash
docker-compose up --build
```

This will build the Docker image, set up the container, and start the application with the specified command (`node /app/build/index.js https://example.com`). You can modify the command or URL by editing the `docker-compose.yml` file.

The `docker-compose.yml` file specifies the `url-checker` service, which builds the image using the `Dockerfile`, loads the environment variables from the `.env` file, and runs the application with the command `node /app/build/index.js`. The volume mount (`- ./:/usr/src`) ensures the current directory is available in the container for any changes you make to the source files.

## Dockerfile and Docker compose

The project includes a `Dockerfile` and `docker-compose.yml` for containerization. Docker sets up the Node.js environment, installs dependencies, compiles the TypeScript code, and runs the application.

### Explanation of the Docker Compose Setup:

- The `docker-compose.yml` file defines a service (`url-checker`) that uses the `Dockerfile` to build the image and run the container.
- The `env_file: .env` tells Docker Compose to use the `.env` file for environment variables (like the VirusTotal API key).
- The `volumes` directive mounts the project’s directory into the container to keep it in sync with any local changes you make while the container is running.
- The `command` overrides the default command and ensures the application runs with the specified URL (`https://example.com` in this case).
