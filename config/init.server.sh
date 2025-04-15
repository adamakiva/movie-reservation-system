#!/bin/sh

npm install --include=dev && node ./src/database/migrations/migrate.ts && node --watch ./src/main.ts;
