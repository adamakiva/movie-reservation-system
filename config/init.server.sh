#!/bin/sh

npm install --include=dev && node ./src/database/migrations/migrate.ts && node --watch --experimental-transform-types ./src/main.ts;
