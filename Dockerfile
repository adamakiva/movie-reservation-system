FROM node:22.11.0-alpine AS dev

# Install dependencies
RUN apk add --no-cache curl tini

# Set the workdir
WORKDIR /home/node/mrs

# Copy the entrypoint script to a non-volumed folder
COPY ./scripts/entrypoint.sh /home/node/entrypoint.sh

# Make tini the entry point of the image
ENTRYPOINT ["/sbin/tini", "-s", "--"]

# Run the script as PID 1
CMD ["/home/node/entrypoint.sh"]
