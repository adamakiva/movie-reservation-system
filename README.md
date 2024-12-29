# Movie reservation system

## Inspired by https://roadmap.sh/projects/movie-reservation-system

A backend which allows to reserve movie tickets.  
This is a practice exercise so some stuff may be redundant/complicated for learning purposes.  
For any questions/suggestions, contact details are in my github profile

## Tech stack

- Node.js
- PostgreSQL

## Libraries

- **Express.js** - Http routing
- **Drizzle ORM** - SQL ORM
- **postgres** - Native handler for postgreSQL (used by the ORM)
- **jose** - JWT generation & validation
- **zod** - Validation library
- **ESLint & Prettier** - Code linter & formatter
- **tsx** - Typescript execute to run typescript in Node.js
- **argon2** - [Argon2](https://github.com/ranisalt/node-argon2) encryption and decryption library
- **multer** - `multipart/form-data` request handler

---

# Development mode prerequisites

## Prerequisites

1. Linux-based system with POSIX compliant shell (required for the scripts to work)
2. [Docker engine & docker-compose plugin](https://github.com/AdamAkiva/tutorials/blob/main/tools/docker/docker.md)
   preferably the latest version, otherwise you may encounter errors
3. Make sure the scripts have execute permissions, e.g: (Assuming project root dir)

```bash
chmod +x ./scripts/*.sh
```

---

## Recommended (Will work without them, but may require manual work):

1. [NVM - Node Version Manager](https://github.com/nvm-sh/nvm#installing-and-updating)
2. [Node LTS version](https://github.com/nvm-sh/nvm#long-term-support)
3. [Debugger](https://github.com/AdamAkiva/tutorials/blob/main/web/node/debugger/typescript/README.md)

---

## Run locally instructions

1. Use this to start the local environment:

```bash
./scripts/start.sh
```

2. Use this to stop the local environment:

```bash
./scripts/remove.sh
```

---

## Troubleshooting

If you have permission errors when running the postgres image, try the following:

1. If you have **postgresql installed locally**, firstly why? secondly, make
   sure to stop the service whenever the docker runs and vice versa
   (`sudo service postgresql stop`). If you want to make it permanent,
   [see this answer](https://askubuntu.com/a/19324)
2. Stop the docker using: `yes | ./scripts/remove.sh`
3. Remove the following folders: `rm -rf ./dev-data ./node_modules ./npm-cache`
4. Make sure you have the latest docker and docker-compose versions
   (follow step 2 in the prerequisites)
5. Run `yes | ./scripts/start.sh` and hope for the best
6. If the problem persists, contact a maintainer/contributor in any way you see fit

---

## Development notes

### CORS & Helmet

**Helmet** (or rather the security headers added by it) are handled at the NGINX
(reverse proxy) level.  
The reason is that they are static and there is more sense to block access
at the reverse proxy level rather than the server level.

**CORS** on the other hand is handled on the server level.  
The reason for that is the ability to be able to handle dynamic values.
