# Movie reservation system server

The backend for the application

---

## Libraries

- **[argon2](<(https://github.com/ranisalt/node-argon2)>)** - Argon2 encryption and decryption
- **[compression](<(https://github.com/expressjs/express)>)** - Compress http responses
- **[Drizzle ORM](<(https://github.com/drizzle-team/drizzle-orm)>)** - SQL ORM (More of a query builder)
- **[Express.js](<(https://github.com/expressjs/express)>)** - Http routing
- **[file-type](<(https://github.com/expressjs/express)>)** - Detect file type from the magic numbers
- **[jose](<(https://github.com/panva/jose)>)** - JWT generation & validation
- **[multer](<(https://github.com/expressjs/multer)>)** - `multipart/form-data` handler
- **[Postgres](<(https://github.com/porsager/postgres)>)** - Native handler for postgreSQL (used by the ORM)
- **[ws](<(https://github.com/websockets/ws)>)** - Web socket server for Node.js
- **[rabbitmq-client](<(https://github.com/expressjs/express)>)** - Node.js rabbitmq client
- **[zod](<(https://github.com/colinhacks/zod)>)** - Validation library

## NPM Scripts

### Run in docker:

- **`npm run test`** - Run unit & integration tests
- **`npm run test-only`** - Run tests marked as `.only`. The scripts waits until a debugger is attached
- **`npm run test-stress`** - Run stress tests, outputting a report to `.clinic` folder

### Run on your local machine

- **`npm run lint`** - Run linter and transpilation
- **`npm run generate-migrations`** - Generate drizzle database migrations
- **`npm run check-global-updates`** - Check global Node.js related updates
- **`npm run check-local-updates`** - Check local packages updates
- **`npm run commit-local-updates`** - Commit local packages updates
- **`npm run check-code-deps`** - Check if any packages are unused
- **`npm run check-cir-deps`** - Check for any circular dependencies
- **`npm run check-licenses`** - Check all packages licenses
- **`npm run build`** - Transpile typescript to javascript
