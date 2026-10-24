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
# Nonblocking quality checks run AFTER rendering. A pixel-perfect Chromium
# seek-history check can report a driver-specific difference; log it for review.
# Usage: DRAFT=1 bash scripts/codespaces-showcase.sh reel poster
if [ "${DRAFT:-0}" = "1" ]; then
  EXTRAS=(--draft --jobs 1 --no-blur)
  echo "Draft mode: 960x540, 24 fps, no motion blur."
else
  EXTRAS=(--jobs 1)
  echo "Full-quality mode: WebGL software rendering can be slow."
fi
if [ "$#" -gt 0 ]; then
  FILMS=("$@")
else
  FILMS=(reel poster brand-promo tabletop app-promo journey launch styles)
fi
failed=0
for example in "${FILMS[@]}"; do
  if [[ "$example" == */* || "$example" == *..* || ! -f "examples/$example/film.js" ]]; then
    echo "Unknown example: $example" >&2
    exit 2
  fi
  out="showcase-output/$example.mp4"
  if [ -s "$out" ] && [ "${FORCE:-0}" != "1" ]; then
    echo "Skipping existing $out (set FORCE=1 to re-render)"
    continue
  fi
  echo "Rendering $example..."
  if node scripts/export.mjs "examples/$example" "${EXTRAS[@]}" --out "$out" 2>&1 | tee "showcase-output/$example-export.log"; then
    if [ ! -s "$out" ]; then
      echo "Missing MP4 after export: $example" >&2
      failed=$((failed + 1))
    fi
  else
    echo "Export failed for $example; see showcase-output/$example-export.log" >&2
    failed=$((failed + 1))
  fi
done
if [ "${CHECKS:-1}" = "1" ]; then
  for example in reel launch; do
    if [[ " ${FILMS[*]} " != *" $example "* ]]; then continue; fi
    echo "Checking $example (nonblocking)... "
    if node scripts/check.mjs "examples/$example" --step 1 >"showcase-output/$example-check.log" 2>&1; then
      echo "Quality check passed: $example"
    else
      echo "Quality check warning: $example; see showcase-output/$example-check.log"
      tail -n 5 "showcase-output/$example-check.log"
    fi
  done
fi
if [ "${STILLS:-1}" = "1" ] && [ -s "showcase-output/poster.mp4" ]; then
  STILL_ARGS=(--at 2.8,5.8,8.0,10.4 --sheet --scale 0.5 --out showcase-output/webgl-stills)
  if [ "${DRAFT:-0}" = "1" ]; then STILL_ARGS+=(--no-blur); fi
  if ! node scripts/frames.mjs examples/poster "${STILL_ARGS[@]}" >"showcase-output/stills.log" 2>&1; then
    echo "Stills warning; see showcase-output/stills.log"
  fi
fi
echo "Available MP4s in showcase-output/:"
find showcase-output -maxdepth 1 -name "*.mp4" -type f -print
echo "Package with: zip -r claude-motion-renders.zip showcase-output/"
if [ "$failed" -gt 0 ]; then exit 1; fi
echo "Showcase export complete. Review the check logs before publication."
