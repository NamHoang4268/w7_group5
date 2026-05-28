#!/bin/bash
# Start W7 DocHub AI Backend locally

set -e
cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. Copy .env.example to .env and fill in values."
fi

echo "Starting AI Backend on http://localhost:8000..."
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
