#!/bin/sh

UID=$(id -u);
GID=$(id -g);

ROOT_DIR=$(realpath "$(dirname "$0")/..");

DATABASE_FOLDER="$ROOT_DIR"/dev-data;
TESTS_COVERAGE_FOLDER="$ROOT_DIR"/server/__tests__/coverage;

UV_THREADPOOL_SIZE=$(($(nproc --all) - 1));

####################################################################################

check_prerequisites() {
    # Checks docker is installed
    if ! command -v docker >/dev/null 2>&1; then
        printf "\nDocker engine not installed, you may follow this: https://docs.docker.com/engine/install \n\n";
        exit 1;
    fi
    # Checks docker-compose is installed
    if ! command -v docker compose >/dev/null 2>&1; then
        printf "\nDocker compose not installed, you may follow this: https://docs.docker.com/compose/install/linux/#install-the-plugin-manually \n\n";
        exit 1;
    fi
}

remove() {
    check_prerequisites;

    printf "\nRemoving application...\n\n";

    if ! UID="$UID" GID="$GID" UV_THREADPOOL_SIZE="$UV_THREADPOOL_SIZE" docker compose down; then
        printf "\nDocker removal failed. solve the errors and try again\n";
        exit 1;
    fi

    rm -rf "$TESTS_COVERAGE_FOLDER" "$DATABASE_FOLDER";
}

main() {
    cd "$ROOT_DIR" || exit 1;

    remove;
}

####################################################################################

main;
