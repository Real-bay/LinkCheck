# LinkCheck

This project can be used to evaluate the safety of a particular website based on a provided URL. The application first uses the VirusTotal API to check against known URL blacklists. If VirusTotal returns a clean result, the application further inspects the website by performing static HMTL and JavaScript analysis on the site contents. Finally it displays the results of the analysis in a user-friendly format.

## Features

- **VirusTotal API Integration**: Checks URLs against VirusTotal's database of known malicious sites.
- **Static Analysis**: Performs static HTML and JavaScript analysis on the website's content to identify potential security issues.
- **Docker implementation**: Runs in a containerized environment for easy deployment and safety.

### Tech Stack
- **Frontend**: React, Vite, TypeScript
- **Backend**: Express (Node), Axios, TypeScript
- **Static Analysis**: Static HTML analysis, ESLint for JS analysis
- **Containerization**: Docker, Docker Compose
- **Testing/Code checking**: Vitest, ESLint, Prettier
- **Pipeline/Security**: GitHub Actions, Trivy, ZAP

## Prerequisites

Before using this tool, ensure you have the following:

1. [Node.js](https://nodejs.org/) (version 20.x or higher) installed on your system.
2. A valid [VirusTotal API key](https://www.virustotal.com/api/v3/).
3. [Docker](https://www.docker.com/) installed on your system

You’ll also need to set your API key and default PORT as environment variables in a `.env` file:

```
VIRUSTOTAL_API_KEY=your_api_key_here
PORT=3001
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

## Running the Project using Docker Compose

To run the project using Docker Compose, follow these steps:

### 1. Create a `.env` file
Create a `.env` file in the root directory of the project and add your VirusTotal API key and desired port.

### 2. **Build and run the services:**

```bash
docker-compose build application analyzer
```

This will build the Docker images for both the application container and the analysis container(s).

```bash
docker-compose up
```

This will start the application container which runs the Express server hosting the app. The application will be accessible at `http://localhost:3001` (or the port specified in your `.env` file).

## Dockerfiles and Docker compose

The project includes `Dockerfiles` for both the application and analyzer containers as well as the`docker-compose.yml` config file for containerization. Docker sets up the Node.js environment, installs dependencies, compiles the TypeScript code, and runs the application.

### Explanation of the Docker Compose Setup:

- **application**: This service runs the main application, which handles the frontend and backend, interacts with the VirusTotal API and spins up the analyzer service containers as necessary.
- **analyzer**: This service is responsible for performing static analysis on the website's content. It is built from the `Dockerfile` located in the `analyzer` directory.



