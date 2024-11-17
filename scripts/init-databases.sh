#!/bin/sh

set -e
set -u

####################################################################################

create_database_grant_privilege() {
        database=$1
        printf "Creating database: '%s' and granting privileges to: '%s'" "$database" "$POSTGRES_USER";
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
            CREATE DATABASE $database;
            GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
}

if [ -n "$POSTGRES_DBS" ]; then
        printf "Creating multiple database...\n";

        for db in $(printf "%s", "$POSTGRES_DBS" | tr ',' ' ', "$"); do
                create_database_grant_privilege "$db";
        done

        printf "Databases created successfully\n";
fi
