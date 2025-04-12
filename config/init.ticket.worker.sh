#!/bin/sh

npm install --include=dev && node --watch --experimental-transform-types ./src/main.ts;
