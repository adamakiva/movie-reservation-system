# Movie reservation system server

The backend for the application

---

## Libraries

- **[argon2](<(https://github.com/ranisalt/node-argon2)>)** - Argon2 encryption and decryption
- **[compression](<(https://github.com/expressjs/compression)>)** - Compress http responses
- **[drizzle-orm](<(https://github.com/drizzle-team/drizzle-orm)>)** - SQL ORM (More of a query builder)
- **[cron](<(https://github.com/kelektiv/node-cron)>)** - Cronjob-like library
- **[express](<(https://github.com/expressjs/express)>)** - Http routing
- **[file-type](<(https://github.com/sindresorhus/file-type)>)** - Detect file type from the magic numbers
- **[jose](<(https://github.com/panva/jose)>)** - JWT generation & validation
- **[multer](<(https://github.com/expressjs/multer)>)** - `multipart/form-data` handler
- **[postgres](<(https://github.com/porsager/postgres)>)** - Native handler for postgreSQL
- **[rabbitmq-client](<(https://github.com/cody-greene/node-rabbitmq-client)>)** - Node.js rabbitmq client
- **[ws](<(https://github.com/websockets/ws)>)** - Web socket server for Node.js
- **[zod](<(https://github.com/colinhacks/zod)>)** - Validation library

## NPM Scripts

### Must be run in docker image:

- **`npm run test`** - Run unit & integration tests
- **`npm run test-only`** - Run tests marked as `.only`. The scripts waits until a debugger is attached
- **`npm run test-stress`** - Run stress tests, outputting a report to `.clinic` folder

### Should be run on your local machine:

- **`npm run lint`** - Run linter and transpilation
- **`npm run generate-migrations`** - Generate drizzle database migrations
- **`npm run commit-local-updates`** - Check & commit local packages updates
- **`npm run check-cir-deps`** - Check for any circular dependencies
- **`npm run check-licenses`** - Check all packages licenses
- **`npm run build`** - Transpile Typescript to Javascript

---

## Development notes

### Tests

Testing a full integration test for commutating with the worker is not possible.
The reason is that the returned message will always arrive to the real server and
can't be mocked.
So what we have are test for sending and handling the response without tests
which follow the entire path
