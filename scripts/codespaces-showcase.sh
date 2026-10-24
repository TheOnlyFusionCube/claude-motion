#!/usr/bin/env bash
# Render a showcase suite from the ORIGINAL project examples including real Three.js/WebGL.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p showcase-output
export MOTION_GL="${MOTION_GL:-software}"
# In headless Linux environments, Xvfb can provide a working GLX display.
if [ -z "${DISPLAY:-}" ] && command -v Xvfb >/dev/null 2>&1; then
  Xvfb :89 -screen 0 1920x1080x24 -ac +extension GLX >/tmp/claude-motion-xvfb.log 2>&1 &
  XVFB_PID=$!
  trap 'kill "$XVFB_PID" 2>/dev/null || true' EXIT
  export DISPLAY=:89
  sleep 2
fi
node scripts/doctor.mjs
node scripts/check.mjs examples/reel --step 1
node scripts/check.mjs examples/launch --step 2
# Fast proof-of-concept mode for smaller Codespaces: DRAFT=1 bash scripts/codespaces-showcase.sh
if [ "${DRAFT:-0}" = "1" ]; then
  EXTRAS=(--draft --jobs 1 --no-blur)
else
  EXTRAS=(--jobs 1)
fi
for example in reel poster brand-promo tabletop app-promo journey launch styles; do
  echo "Rendering $example..."
  node scripts/export.mjs "examples/$example" "${EXTRAS[@]}" --out "showcase-output/$example.mp4"
done
node scripts/frames.mjs examples/poster --at 2.8,5.8,8.0,10.4 --sheet --scale 0.5 --out showcase-output/webgl-stills
echo "Rendered showcase clips and WebGL stills in showcase-output/"
