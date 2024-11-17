#!/bin/sh

UID=$(id -u);
GID=$(id -g);

ROOT_DIR=$(dirname "$(dirname "$(realpath "$0")")");

DB_DATA_FOLDER="$ROOT_DIR"/dev-data/pg;
NPM_CACHE_FOLDER="$ROOT_DIR"/npm-cache;
ERR_LOG_FILE=build_err_logs.txt;

UV_THREADPOOL_SIZE=$(($(nproc --all) - 1));

####################################################################################

check_prerequisites() {
    if ! docker --version 1> /dev/null 2> /dev/null; then
        printf "\nDocker engine not installed, you may follow this: https://docs.docker.com/engine/install";
        printf "\n\n";
        exit 1;
    fi
    if ! docker compose version 1> /dev/null 2> /dev/null; then
        printf "\nDocker compose not installed, you may follow this: https://docs.docker.com/compose/install/linux/#install-the-plugin-manually"
        printf "\n\n";
        exit 1;
    fi

    return 0;
}

install_dependencies() {
    npm install;
}

check_services_health() {
    error_occurred=false;
    for service in $(docker compose ps --all --services 2>/dev/null); do
        health_status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$service");
        if [ "$health_status" = "unhealthy" ]; then
            docker logs "$service" 2>> "$ERR_LOG_FILE";
            error_occurred=true;
        fi
        if [ "$health_status" = "exited" ]; then
            exit_code=$(docker inspect --format '{{.State.ExitCode}}' "$service");
            if [ "$exit_code" -ne 0 ]; then
                docker logs "$service" 2>> "$ERR_LOG_FILE";
                error_occurred=true;
            fi
        fi
    done
    if [ "$error_occurred" = true ]; then
        cat "$ERR_LOG_FILE";
        printf "\n\nDocker run failed. The logs are displayed above. Use them to solve the issue(s) and try again\n\n";
        exit 1;
    fi

    return 0;
}

start() {
    rm "$ERR_LOG_FILE" 1> /dev/null 2> /dev/null;

    printf "Building Application...\n\n";

    mkdir -p "$DB_DATA_FOLDER" "$NPM_CACHE_FOLDER";

    UID="$UID" GID="$GID" UV_THREADPOOL_SIZE="$UV_THREADPOOL_SIZE" docker compose up --always-recreate-deps --build --force-recreate -d --wait;
    check_services_health;

    return 0;
}

####################################################################################

cd "$ROOT_DIR" || exit 1;

check_prerequisites && install_dependencies && start;

printf "\nApplication is running\n\n";
