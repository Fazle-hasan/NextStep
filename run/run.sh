#!/usr/bin/env sh
# Runs NextStep on http://localhost:3000. Usage: ./run/run.sh [hosted|local|stop]
cd "$(dirname "$0")/.." && exec node run/run.mjs "${1:-hosted}"
