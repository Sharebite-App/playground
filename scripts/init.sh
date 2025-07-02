#!/bin/bash
set -e

echo "Running Django migrations..."
python3 manage.py makemigrations core
python3 manage.py makemigrations
python3 manage.py migrate

echo "Syncing data fixtures..."
python3 manage.py sync_data_fixture

echo "Initialization complete!"