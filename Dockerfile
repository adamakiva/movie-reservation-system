FROM postgres:17.2-alpine AS pg

COPY ./config/postgresql.conf /etc/postgresql.conf
COPY ./config/init-databases.sh /docker-entrypoint-initdb.d/init-databases.sh

CMD ["postgres", "-c", "config_file=/etc/postgresql.conf"]

####################################################################################

FROM node:22.13.1-slim AS server

RUN apt-get update && apt-get install -y --no-install-recommends curl tini && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node/mrs

COPY --chown=node:node ./config/init-server.sh /home/node/init.sh

ENTRYPOINT ["/home/node/init.sh"]

####################################################################################

FROM nginxinc/nginx-unprivileged:1.27.3-alpine-slim AS nginx
USER nginx

COPY --chown=nginx:nginx ./nginx /etc/nginx

CMD ["nginx", "-g", "daemon off;"]
