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
- **Drizzle ORM** - SQL integration
- **postgres** - Native handler for postgreSQL
- **jose** - JWT generation & validation
- **zod** - Validation library
- **ESLint & Prettier** - Code linter & formatter
- **tsx** - Typescript execute to run typescript in Node.js

---

# Development mode run instructions

## Prerequisites

1. Linux-based system with POSIX compliant shell (required for the scripts to work)
2. [Docker engine & docker-compose plugin](https://github.com/AdamAkiva/tutorials/blob/main/tools/docker/docker.md)
   preferably the latest version, otherwise you may encounter errors
3. Make sure the scripts have execute permissions, e.g: (Assuming root dir)

```bash
chmod +x ./scripts/*.sh
```

---

## Recommended (Will work without them):

1. [NVM - Node Version Manager](https://github.com/nvm-sh/nvm#installing-and-updating)
2. [Node LTS version](https://github.com/nvm-sh/nvm#long-term-support)
3. [Debugger](https://github.com/AdamAkiva/tutorials/blob/main/web/node/debugger/typescript/README.md)

**Notes:**

- **ONLY** run the application using the start/remove scripts, not directly via
  the docker. (Unless you are sure you know what you're doing)
- For any issue(s), contact a maintainer/contributor in any way you see fit

---

## Run locally

1. Make sure you have a .env file with needed values (see `.template.env`) in the
   root folder of the application.
   In order to generate these values see [this](./be/README.md)
2. Use this to start the local environment:

```bash
./scripts/start.sh
```

3. Use this to stop the local environment:

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
