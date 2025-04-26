#!/bin/sh

# Reference (with minor changes):
# https://github.com/boskomijin/postgres-multiple-databases-creation/blob/main/init/create-multiple-postgresql-databases.sh

set -e;
set -u;

####################################################################################

create_database_grant_privilege() {
    database=$1;

    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
}

main() {
    if [ -n "$POSTGRES_DATABASES" ]; then
        printf "Creating multiple database...\n";

        for database in $(printf "%s", "$POSTGRES_DATABASES" | tr ',' ' '); do
                create_database_grant_privilege "$database";
        done

        printf "Databases created successfully\n";
    fi
}

####################################################################################

main;
