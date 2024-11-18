#!/bin/sh

# This script is used for the docker start up. It sets up all of the required
# dependencies and start the process as PID 1 as a result of running this script
# using `tini``. This will allow signals to be forwarded to the application as
# expected

npm install &&
npm run commit-migrations &&
exec node --watch --nolazy --enable-source-maps --trace-uncaught --trace-warnings --max-old-space-size=1536 --inspect=0.0.0.0:"$SERVER_DEBUG_PORT" --import @swc-node/register/esm-register ./src/main.ts;
