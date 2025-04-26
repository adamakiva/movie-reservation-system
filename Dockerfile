FROM postgres:17.4-alpine AS pg

COPY ./configs/postgresql.conf /etc/postgresql.conf
COPY ./scripts/init.databases.sh /docker-entrypoint-initdb.d/init.databases.sh

CMD ["postgres", "-c", "config_file=/etc/postgresql.conf"]

####################################################################################

FROM rabbitmq:4.1.0-management-alpine AS rbmq

COPY ./configs/rbmq.definitions.json /etc/rabbitmq/rbmq.definitions.json

####################################################################################

FROM node:22.15.0-slim AS server

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/mrs

COPY ./scripts/init.server.sh /home/node/init.sh

ENTRYPOINT ["/home/node/init.sh"]

####################################################################################

FROM node:22.15.0-slim AS worker

WORKDIR /home/node/worker

COPY ./scripts/init.worker.sh /home/node/init.sh

ENTRYPOINT ["/home/node/init.sh"]

####################################################################################

FROM nginxinc/nginx-unprivileged:1.27.5-alpine-slim AS nginx
USER nginx

COPY --chown=nginx ./nginx /etc/nginx

CMD ["nginx", "-g", "daemon off;"]
