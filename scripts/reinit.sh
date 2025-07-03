#!/bin/bash
set -e

read -p "Are you sure you want to reset the local database? (yes/no): " areyousure

if [[ $areyousure == "yes" ]]
then
    start_time=$(date +%s)
    echo "Resetting the database..."
    echo "1/3. Flushing the database..."
    python3 manage.py flush --no-input
    echo "2/3. Recreating the schema..."
    python3 manage.py makemigrations core
    python3 manage.py makemigrations
    python3 manage.py migrate
    echo "3/3. Re-initializing the database with data..."
    python3 manage.py sync_data_fixture
    end_time=$(date +%s)
    elapsed_time=$((end_time - start_time))
    echo "Database reset complete. Time taken: $elapsed_time seconds."
    exit 0
else
    echo "Operation cancelled."
    exit 1
fi