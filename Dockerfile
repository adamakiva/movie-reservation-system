FROM node:22.13.1-slim AS server-dev

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends curl tini && rm -rf /var/lib/apt/lists/*

# Set the workdir
WORKDIR /home/node/mrs

# Copy the entrypoint script to a non-volumed folder
COPY ./server/entrypoint.sh /home/node/entrypoint.sh

# Make tini the entry point of the image
ENTRYPOINT ["/usr/bin/tini", "-s", "--"]

# Run the script as PID 1
CMD ["/home/node/entrypoint.sh"]

####################################################################################

FROM nginxinc/nginx-unprivileged:1.27.3-alpine-slim AS nginx-dev
USER nginx

COPY --chown=nginx:nginx ./nginx /etc/nginx

CMD ["nginx", "-g", "daemon off;"]
