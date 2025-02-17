#!/bin/sh

# Install dependencies
npm install --include=dev &&
# Commit database migrations
node ./src/database/migrations/migrate.ts &&
# Run the server
node --watch ./src/main.ts;
