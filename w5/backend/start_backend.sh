#!/bin/bash

# Start GeekBrain backend services: monitoring API and unified agent API.

set -e

cd "$(dirname "$0")"

if [ ! -f "geekbrain.db" ]; then
    echo "Error: geekbrain.db not found. Run this script from w4/backend or keep the database in w4/backend."
    exit 1
fi

mkdir -p logs

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    fi
    return 0
}

kill_port() {
    echo "Stopping existing process on port $1..."
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    sleep 1
}

echo "Checking backend ports..."
for port in 8000 8001; do
    if ! check_port "$port"; then
        kill_port "$port"
    fi
done

if [ ! -f "../.env" ] && [ ! -f "../../.env" ] && [ ! -f ".env" ]; then
    echo "Warning: no .env file found in backend, w4, or repository root."
fi

echo "Starting monitoring API on http://localhost:8000..."
nohup python3 monitoring_api.py > logs/monitoring_api.log 2>&1 &
MONITORING_PID=$!

echo "Waiting for monitoring API..."
for i in {1..10}; do
    if curl -s http://localhost:8000/ >/dev/null 2>&1; then
        echo "Monitoring API is ready."
        break
    fi
    sleep 1
done

echo "Starting unified agent API on http://localhost:8001..."
cd src
nohup python3 main.py > ../logs/main_api.log 2>&1 &
MAIN_PID=$!
cd ..

echo "Waiting for unified agent API..."
for i in {1..15}; do
    if curl -s http://localhost:8001/health >/dev/null 2>&1; then
        echo "Unified agent API is ready."
        break
    fi
    sleep 1
done

echo "$MONITORING_PID" > .pids
echo "$MAIN_PID" >> .pids

echo ""
echo "Backend services started:"
echo "  Monitoring API: http://localhost:8000"
echo "  Unified API:    http://localhost:8001"
echo ""
echo "Start the React frontend separately:"
echo "  cd ../frontend && npm run dev"
echo ""
echo "Logs:"
echo "  backend/logs/monitoring_api.log"
echo "  backend/logs/main_api.log"
echo ""
echo "Press Ctrl+C to stop backend services."

trap "echo ''; echo 'Stopping backend services...'; kill $MONITORING_PID $MAIN_PID 2>/dev/null; rm -f .pids; exit 0" INT

tail -f logs/monitoring_api.log logs/main_api.log
