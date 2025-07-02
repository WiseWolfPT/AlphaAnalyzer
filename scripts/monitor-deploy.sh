#!/bin/bash
while true; do
    echo "=== $(date) ==="
    echo "Backend Status:"
    curl -s http://localhost:3001/api/health 2>/dev/null || echo "Backend DOWN"
    echo "Frontend Status:"
    curl -s http://localhost:3000 >/dev/null 2>&1 && echo "Frontend UP" || echo "Frontend DOWN"
    echo "Processes:"
    ps aux | grep -E "(vite|tsx)" | grep -v grep
    echo "====================="
    sleep 30
done
