#!/bin/bash
# Start the Cloud File Explorer

cd "$(dirname "$0")"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 not found"
    exit 1
fi

# Check if Flask is installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Installing Flask..."
    pip3 install flask
fi

echo "🔺 Starting Cloud File Explorer..."
echo "Open: http://2.24.118.123:8080"
echo ""
python3 server.py
