#!/bin/bash
# Weather Aggregator - Cloudflare Tunnel Launcher

# Make cloudflared executable
chmod +x cloudflared

# Start the weather aggregator in background
echo "Starting Weather Aggregator..."
cd "$(dirname "$0")"
node src/server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Start Cloudflare Tunnel
echo "Starting Cloudflare Tunnel..."
./cloudflared tunnel --url http://localhost:3000

# Cleanup on exit
kill $SERVER_PID 2>/dev/null
