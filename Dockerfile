FROM postgres:17.5-alpine AS postgres

COPY ./configs/postgresql.conf /etc/postgresql.conf

CMD ["postgres", "-c", "config_file=/etc/postgresql.conf"]

####################################################################################

FROM rabbitmq:4.1.2-management-alpine AS rabbitmq

COPY ./configs/rabbitmq.definitions.json /etc/rabbitmq/rabbitmq.definitions.json

####################################################################################

FROM node:22.17.1-slim AS server

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/mrs

COPY ./scripts/init.server.sh /home/node/init.sh

ENTRYPOINT ["/home/node/init.sh"]

####################################################################################

FROM node:22.17.1-slim AS worker

WORKDIR /home/node/worker

COPY ./scripts/init.worker.sh /home/node/init.sh

ENTRYPOINT ["/home/node/init.sh"]

####################################################################################

FROM nginxinc/nginx-unprivileged:1.29.0-alpine-slim AS nginx
USER nginx

COPY --chown=nginx ./nginx /etc/nginx

CMD ["nginx", "-g", "daemon off;"]
