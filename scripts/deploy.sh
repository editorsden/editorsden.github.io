#!/bin/bash
set -e

# Default commit message if none provided
MSG="${1:-Update website content}"

echo "🚀 Checking for changes..."
if [ -z "$(git status --porcelain)" ]; then
  echo "✅ No changes to deploy! Working directory is clean."
  exit 0
fi

echo "📦 Staging changes..."
git add -A

echo "💾 Committing: $MSG"
git commit -m "$MSG"

echo "⬆️ Pushing to GitHub..."
git push origin main

echo "🎉 Pushed successfully! GitHub Actions is now automatically building & deploying your site."
echo "🔗 Watch progress here: https://github.com/editorsden/editorsden.github.io/actions"
