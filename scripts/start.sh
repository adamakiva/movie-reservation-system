#!/bin/sh

UID=$(id -u);
GID=$(id -g);

ROOT_DIR=$(realpath "$(dirname "$0")/..");

DATABASE_DATA_DIR="$ROOT_DIR"/dev-data/pg;
MESSAGE_QUEUE_DATA_DIR="$ROOT_DIR"/dev-data/rbmq;
MOVIE_POSTERS_DIR="$ROOT_DIR/server/posters";
NPM_SERVER_CACHE_DIR="$ROOT_DIR"/npm-cache/server;
NPM_WORKER_CACHE_DIR="$ROOT_DIR"/npm-cache/worker;
CERTS_DIR="$ROOT_DIR"/nginx/certs;
KEYS_DIR="$ROOT_DIR"/server/keys;
ERR_LOG_FILE="$ROOT_DIR"/error_logs.txt;

UV_THREADPOOL_SIZE=$(($(nproc --all) - 1));

####################################################################################

check_prerequisites() {
    if ! command -v docker >/dev/null 2>&1; then
        printf "\nDocker engine not installed, you may follow this: https://docs.docker.com/engine/install \n\n";
        exit 1;
    fi
    if ! command -v docker compose >/dev/null 2>&1; then
        printf "\nDocker compose not installed, you may follow this: https://docs.docker.com/compose/install/linux/#install-the-plugin-manually \n\n";
        exit 1;
    fi
}

install_dependencies() {
    cd "$ROOT_DIR"/server || exit 1;
    if ! npm install --include=dev -d; then
        printf "\nFailed to install npm dependencies. Please check for issues and try again.\n\n";
        exit 1;
    fi

    cd "$ROOT_DIR"/worker || exit 1;
    if ! npm install --include=dev -d; then
        printf "\nFailed to install npm dependencies. Please check for issues and try again.\n\n";
        exit 1;
    fi

    cd "$ROOT_DIR"/packages/message-queue || exit 1;
    if ! npm install --include=dev -d; then
        printf "\nFailed to install app npm dependencies. Please check for issues and try again.\n\n";
        exit 1;
    fi
    cd "$ROOT_DIR"/packages/shared || exit 1;
    if ! npm install --include=dev -d; then
        printf "\nFailed to install app npm dependencies. Please check for issues and try again.\n\n";
        exit 1;
    fi
}

generate_certs() {
    if [ ! -d "$CERTS_DIR" ]; then
        mkdir "$CERTS_DIR" || exit 1;

        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERTS_DIR"/selfsigned.key \
        -out "$CERTS_DIR"/selfsigned.crt \
        -subj "/C=US/ST=Test/L=Local/O=Dev/OU=Test/CN=localhost" || exit 1;
    fi
}

generate_keys() {
    if [ ! -d "$KEYS_DIR" ]; then
        mkdir "$KEYS_DIR" || exit 1;

        openssl genpkey -algorithm RSA -out "$KEYS_DIR"/access_private_key.pem -pkeyopt rsa_keygen_bits:2048 &&
        openssl rsa -in "$KEYS_DIR"/access_private_key.pem -pubout -outform DER |
        openssl pkey -pubin -inform DER -outform PEM -out "$KEYS_DIR"/access_public_key.pem || exit 1;

        openssl genpkey -algorithm RSA -out "$KEYS_DIR"/refresh_private_key.pem -pkeyopt rsa_keygen_bits:2048 &&
        openssl rsa -in "$KEYS_DIR"/refresh_private_key.pem -pubout -outform DER |
        openssl pkey -pubin -inform DER -outform PEM -out "$KEYS_DIR"/refresh_public_key.pem || exit 1;
    fi
}

check_services_health() {
    error_occurred=false;

    for service in $(docker compose ps --all --services 2>/dev/null); do
        health_status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$service" 2>/dev/null) || continue;
        if [ "$health_status" = "unhealthy" ]; then
            docker logs "$service" >> "$ERR_LOG_FILE" 2>&1;
            error_occurred=true;
        elif [ "$health_status" = "exited" ]; then
            exit_code=$(docker inspect --format '{{.State.ExitCode}}' "$service");
            if [ "$exit_code" -ne 0 ]; then
                docker logs "$service" >> "$ERR_LOG_FILE" 2>&1 || exit 1;
                error_occurred=true;
            fi
        fi
    done

    if [ "$error_occurred" = true ]; then
        [ -f "$ERR_LOG_FILE" ] && cat "$ERR_LOG_FILE"
        printf "\nPlease address the issues above and try again.\n\n";
        exit 1;
    fi
}

start() {
    check_prerequisites &&
    mkdir -p "$DATABASE_DATA_DIR" "$MESSAGE_QUEUE_DATA_DIR" "$MOVIE_POSTERS_DIR" "$NPM_SERVER_CACHE_DIR" "$NPM_WORKER_CACHE_DIR" || exit 1;
    install_dependencies &&
    generate_certs &&
    generate_keys &&
    rm -f "$ERR_LOG_FILE";
    UID="$UID" GID="$GID" UV_THREADPOOL_SIZE="$UV_THREADPOOL_SIZE" docker compose up --always-recreate-deps --build --force-recreate -d --wait || exit 1;
    check_services_health;
}

main() {
    cd "$ROOT_DIR" || exit 1;
    start;
}

####################################################################################

main;
