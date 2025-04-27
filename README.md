# Movie reservation system

## Inspired by https://roadmap.sh/projects/movie-reservation-system

An application which allows to reserve movie tickets.  
This is a practice project so some stuff may be redundant/complicated for learning purposes.  
For any questions/suggestions, contact details are in my github profile

## Tech stack

- Node.js
- PostgresQL
- Rabbitmq

---

# Development mode prerequisites

## Prerequisites

1. Unix-based system with POSIX compliant shell (required for the scripts to work)
2. [Docker engine & docker-compose plugin](https://github.com/AdamAkiva/tutorials/blob/main/tools/docker/docker.md)
   preferably the latest version, otherwise you **may** encounter errors
3. Make sure the scripts have execute permissions, e.g: (Assuming project root dir)

```bash
chmod +x ./scripts/*.sh
```

4. [NVM - Node Version Manager](https://github.com/nvm-sh/nvm#installing-and-updating)
5. [Node](https://github.com/nvm-sh/nvm#long-term-support)

---

## Recommended (Will work without them, but may require manual work):

1. [Debugger](https://github.com/AdamAkiva/tutorials/blob/main/web/node/debugger/typescript/README.md)

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
3. Remove the following folders: `rm -rf ./dev-data ./npm-cache`
4. Make sure you have the latest docker and docker-compose versions
   (follow step 2 in the prerequisites)
5. Run `yes | ./scripts/start.sh` and hope for the best
6. If the problem persists, contact a maintainer/contributor in any way you see fit

---

## Development notes

### Helmet

**Helmet** (or rather the security headers added by it) are handled at the NGINX
(reverse proxy) level.  
The reason is that they are static and there is more sense to block access
at the reverse proxy level rather than the server level.

### Express `.send` vs `.json`

**`.json`** forces the response to be of type json, no matter what is it called on.  
**`.send`** checks the options is receives and returns the matching type.  
For example, string type will be returned as text/html and not application/json.  
A downside may be that you be unsure what is the type which is returned.  
To be consistent and remove the need to check for the content type on the client
side, we always use `.json`
