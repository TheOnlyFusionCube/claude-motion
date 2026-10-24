#!/usr/bin/env bash
set -euo pipefail
sudo apt-get update
sudo apt-get install -y ffmpeg xvfb libgl1 libegl1 libgl1-mesa-dri mesa-utils
npm install --no-save playwright
npx playwright install --with-deps chromium
echo
echo "Checking Claude Motion environment..."
MOTION_GL=software node scripts/doctor.mjs || true
echo
echo "To preview: node scripts/preview.mjs examples/reel"
echo "To render a complete collection: bash scripts/codespaces-showcase.sh"
