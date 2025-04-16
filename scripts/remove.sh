#!/bin/sh

UID=$(id -u);
GID=$(id -g);

ROOT_DIR=$(realpath "$(dirname "$0")/..");

DATABASE_DATA_FOLDER="$ROOT_DIR"/dev-data;
MESSAGE_QUEUE_DATA_FOLDER="$ROOT_DIR"/dev-data/rbmq;
TEST_COVERAGE_FILE="$ROOT_DIR"/server/__tests__/junit.xml;
CLINIC_FOLDER="$ROOT_DIR"/server/.clinic;

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

remove() {
    check_prerequisites &&
    UID="$UID" GID="$GID" UV_THREADPOOL_SIZE="$UV_THREADPOOL_SIZE" docker compose down || exit 1;
    rm -rf "$DATABASE_DATA_FOLDER" "$MESSAGE_QUEUE_DATA_FOLDER" "$TEST_COVERAGE_FILE" "$CLINIC_FOLDER" || exit 1;
}

main() {
    cd "$ROOT_DIR" || exit 1;
    remove;
}

####################################################################################

main;
