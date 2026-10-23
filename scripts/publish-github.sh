#!/usr/bin/env bash
# Opt-in publisher for a NEW public repository using the authenticated GitHub CLI.
set -euo pipefail

cd "$(dirname "$0")/.."
TARGET="${1:-TheOnlyFusionCube/claude-motion}"

if [[ ! "$TARGET" =~ ^[A-Za-z0-9-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo "Usage: bash scripts/publish-github.sh owner/claude-motion" >&2
  exit 2
fi
for command in git gh; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done
if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi
OWNER="${TARGET%%/*}"
LOGIN="$(gh api user --jq .login)"
if [[ "$OWNER" != "$LOGIN" ]]; then
  echo "Authenticated account is $LOGIN, but target owner is $OWNER." >&2
  echo "For an organization target, create the repo manually and push. No automatic org publication." >&2
  exit 1
fi
if gh repo view "$TARGET" >/dev/null 2>&1; then
  echo "Repository $TARGET already exists. Nothing created or pushed." >&2
  exit 1
fi
if [[ -e .git ]]; then
  echo "This folder already contains .git. Inspect it and publish manually to avoid overwriting history." >&2
  exit 1
fi
if ! git var GIT_AUTHOR_IDENT >/dev/null 2>&1; then
  echo "Configure your local Git author identity before publishing." >&2
  exit 1
fi

echo "Publishing PUBLIC repository https://github.com/$TARGET"
echo "Review NOTICE.md and ensure you have redistribution rights before continuing."
git init -b main
git add .
git commit -m 'Initial release: claude-motion portable Agent Skill'
gh repo create "$TARGET" --public --source=. --remote=origin --push

echo "Published: https://github.com/$TARGET"
