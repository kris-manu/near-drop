#!/bin/bash

# ========================================
# NearDrop Startup Script
# ========================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR" || exit 1

echo ""
echo "========================================"
echo "              NearDrop"
echo "       Local File Sharing"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js is not installed."
    exit 1
fi

# Check npm
if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm is not installed."
    exit 1
fi

echo "Node: $(node --version)"
echo "npm:  $(npm --version)"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

echo "Starting NearDrop..."
echo ""

npm start