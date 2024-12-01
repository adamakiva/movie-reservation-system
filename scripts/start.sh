#!/bin/sh

UID=$(id -u);
GID=$(id -g);

ROOT_DIR=$(dirname "$(dirname "$(realpath "$0")")");

DB_DATA_FOLDER="$ROOT_DIR"/dev-data/pg;
NPM_CACHE_FOLDER="$ROOT_DIR"/npm-cache;
KEYS_FOLDER="$ROOT_DIR"/keys;
ERR_LOG_FILE=err_logs.txt;

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
    printf "\nInstalling dependencies...\n";
    if ! npm install -d; then
        printf "\nFailed to install npm dependencies. Please check for issues and try again.\n\n";
        exit 1;
    fi
}

generate_keys() {
    if [ ! -d $KEYS_FOLDER ]; then
        printf "\nGenerating missing keys...\n";

        mkdir $KEYS_FOLDER;

        # Access keys
        openssl genpkey -algorithm RSA -out $KEYS_FOLDER/access_private_key.pem -pkeyopt rsa_keygen_bits:2048 &&
        openssl rsa -in $KEYS_FOLDER/access_private_key.pem -pubout -outform DER |
        openssl pkey -pubin -inform DER -outform PEM -out $KEYS_FOLDER/access_public_key.pem;
        # Refresh keys
        openssl genpkey -algorithm RSA -out $KEYS_FOLDER/refresh_private_key.pem -pkeyopt rsa_keygen_bits:2048 &&
        openssl rsa -in $KEYS_FOLDER/refresh_private_key.pem -pubout -outform DER |
        openssl pkey -pubin -inform DER -outform PEM -out $KEYS_FOLDER/refresh_public_key.pem;
    fi
}

check_services_health() {
    error_occurred=false;

    for service in $(docker compose ps --all --services 2>/dev/null); do
        health_status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$service");
        if [ "$health_status" = "unhealthy" ]; then
            docker logs "$service" >> "$ERR_LOG_FILE" 2>&1;
            error_occurred=true;
        elif [ "$health_status" = "exited" ]; then
            exit_code=$(docker inspect --format '{{.State.ExitCode}}' "$service");
            if [ "$exit_code" -ne 0 ]; then
                docker logs "$service" >> "$ERR_LOG_FILE" 2>&1;
                error_occurred=true;
            fi
        fi
    done

    if [ "$error_occurred" = true ]; then
        [ -f "$ERR_LOG_FILE" ] && cat "$ERR_LOG_FILE"
        printf "\nPlease address the issues above and try again.\n\n"
        exit 1
    fi
}

start() {
    check_prerequisites &&

    printf "\nStarting application...\n" &&

    mkdir -p "$DB_DATA_FOLDER" "$NPM_CACHE_FOLDER" &&

    install_dependencies &&
    generate_keys &&

    rm -f "$ERR_LOG_FILE" &&

    UID="$UID" GID="$GID" UV_THREADPOOL_SIZE="$UV_THREADPOOL_SIZE" docker compose up --always-recreate-deps --build --force-recreate -d --wait &&
    check_services_health;
}

main() {
    cd "$ROOT_DIR" || exit 1;

    start;
}

####################################################################################

main;
