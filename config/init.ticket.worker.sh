#!/bin/sh

# Install dependencies
npm install --include=dev &&
# Run the worker
node --watch ./src/main.ts;
