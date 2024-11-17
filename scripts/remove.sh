#!/bin/sh

UID=$(id -u);
GID=$(id -g);

ROOT_DIR=$(dirname "$(dirname "$(realpath "$0")")");

TESTS_COVERAGE_FOLDER="$ROOT_DIR"/__tests__/coverage;

UV_THREADPOOL_SIZE=$(($(nproc --all) - 1));

####################################################################################

check_prerequisites() {
    if ! docker --version 1> /dev/null 2> /dev/null; then
        printf "\nDocker engine not installed, you may follow this: https://docs.docker.com/engine/install";
        printf "\n\n";
        exit 1;
    fi
    if ! docker compose version 1> /dev/null 2> /dev/null; then
        printf "\nDocker compose not installed, you may follow this: https://docs.docker.com/compose/install/linux/#install-the-plugin-manually";
        printf "\n\n";
        exit 1;
    fi

    return 0;
}

remove() {
    if ! UID="$UID" GID="$GID" UV_THREADPOOL_SIZE="$UV_THREADPOOL_SIZE" docker compose down; then
        printf "\nDocker removal failed. solve the errors and try again.\n";
        exit 1;
    fi

    rm -rf "$TESTS_COVERAGE_FOLDER"

    return 0;
}

################################################################################

cd "$ROOT_DIR" || exit 1;

remove;

printf '\nRemoved Application\n\n';
