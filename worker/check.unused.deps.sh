#!/bin/sh

# TODO Currently this script does not work with multi-line imports.
# The reason is the following line:
# RES=$(< "$FILES" xargs -r grep -E -i "(import|require|loader|plugins|${PACKAGE}).*[\"'\''\"](${PACKAGE}|.?\d+)[\"'\''\"]" | wc -l);
# This should be resolved at some point, until that is done we will have false-positives

# Base was taken from: https://stackoverflow.com/a/69708249 and modified a bit by me

# Assumes the script is on the same level as the package.json file.
ROOT_DIR=$(realpath "$(dirname "$0")");

# Temporary files for the script
FILES=$(mktemp);
PACKAGES=$(mktemp);

# The number of concurrent workers for the xargs command
# (0 means as many as possible)
CONCURRENT="${1:-0}";

####################################################################################

# The trap command allows you to catch signals and execute code when they occur.
# We use it for cleanup
trap 'rm -f "$FILES" "$PACKAGES"' EXIT;

find_source_files() {
    # Find all {.js,.ts,.json} files and log them to stdout
    find "$1" \
        -path "$1/node_modules" -prune -or \
        -path "$1/build" -prune -or \
        -path "$1/dist" -prune -or \
        \( -name "*.ts" -or -name "*.js" -or -name "*.json" \) -print;
}

check_specific_dependency_type() {
    # Read package.json for the given dependency type (prod/dev/peer) and write
    # them to the `$PACKAGES` temporary file
    < package.json jq -r "try .${1} // {} | keys[]" > "$PACKAGES";
    echo "--------------------------"
    echo "Checking $1...";
}

check() {
    # Propagate the dependency type
    check_specific_dependency_type "$1";

    # Write all of the the project source file paths to the `$FILES` temporary file
    find_source_files "$ROOT_DIR" > "$FILES";

    # For every line the `$PACKAGES` temporary file
    while read -r PACKAGE; do
        # If a co-responding node_modules folder exists, write all of the package
        # source files paths to the `$FILES` temporary file
        if [ -d "node_modules/${PACKAGE}" ]; then
            find_source_files "node_modules/${PACKAGE}" >> "$FILES";
        fi
    done < "$PACKAGES";

    # Export "FILES" to make the variable available in sub-shells (which xargs use)
    export FILES;

    # Run the following script in a sub-shell
    xargs -P "${CONCURRENT:-1}" -r -a "$PACKAGES" -I[] sh -c '
        PACKAGE="[]";
        FILES="$FILES";

        # Count the number of times every import-like statement for a line in
        # $FILES exists in $PACKAGE. If the count is 0, the package is unused
        RES=$(< "$FILES" xargs -r grep -E -i "(import|require|loader|plugins|${PACKAGE}).*[\"'\''\"](${PACKAGE}|.?\d+)[\"'\''\"]" | wc -l);

        if [ $RES = 0 ]; then
            printf "UNUSED\t\t %s\n" "$PACKAGE";
        else
            printf "USED (%d)\t %s\n" "$RES" "$PACKAGE";
        fi
    ' | sort -k3; # Sort by package name
}

main() {
    cd "$ROOT_DIR" || exit 1;

    check "dependencies";
    check "devDependencies";
    check "peerDependencies";
}

####################################################################################

main;
