FROM postgres:17.2-alpine AS pg

COPY ./config/postgresql.conf /etc/postgresql.conf
COPY ./config/init.databases.sh /docker-entrypoint-initdb.d/init.databases.sh

CMD ["postgres", "-c", "config_file=/etc/postgresql.conf"]

####################################################################################

FROM rabbitmq:4.0.5-management-alpine AS rabbitmq

COPY ./config/rbmq.definitions.json /etc/rabbitmq/rbmq.definitions.json

####################################################################################

FROM node:22.14.0-slim AS server

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/mrs

COPY ./config/init.server.sh /home/node/init.sh

ENTRYPOINT ["/home/node/init.sh"]

####################################################################################

FROM node:22.14.0-slim AS ticket-worker

WORKDIR /home/node/ticket-worker

COPY ./config/init.ticket.worker.sh /home/node/init.sh

ENTRYPOINT ["/home/node/init.sh"]

####################################################################################

FROM nginxinc/nginx-unprivileged:1.27.3-alpine-slim AS nginx
USER nginx

COPY ./nginx /etc/nginx

CMD ["nginx", "-g", "daemon off;"]
