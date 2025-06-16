#!/bin/bash
cd "/Users/antoniofrancisco/Documents/teste 1"
echo "Current directory: $(pwd)"
echo "Git status:"
git status
echo ""
echo "Git log (last 3 commits):"
git log --oneline -3
echo ""
echo "Files in repository:"
ls -la | head -20