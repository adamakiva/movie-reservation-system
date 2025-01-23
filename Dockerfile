FROM node:22.13.0-alpine AS server-dev

# Install dependencies without cache (Not set versions since it is used for the
# local development environment)
RUN apk add --no-cache curl tini

# Set the workdir
WORKDIR /home/node/mrs

# Copy the entrypoint script to a non-volumed folder
COPY ./server/entrypoint.sh /home/node/entrypoint.sh

# Make tini the entry point of the image
ENTRYPOINT ["/sbin/tini", "-s", "--"]

# Run the script as PID 1
CMD ["/home/node/entrypoint.sh"]

####################################################################################

FROM nginxinc/nginx-unprivileged:1.27.3-alpine-slim AS nginx-dev
USER nginx

COPY --chown=nginx:nginx ./nginx /etc/nginx

CMD ["nginx", "-g", "daemon off;"]
