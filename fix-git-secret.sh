#!/bin/bash
# Script to fix the current Git secret push rejection issue

set -e  # Exit on first error

echo "===== FIX GIT SECRET PUSH REJECTION ====="
echo "This script will help you fix the current Git push rejection due to a secret in commit history."
echo "It will perform the following steps:"
echo "1. Check if there are any uncommitted changes"
echo "2. Amend the latest commit to remove the secret from .env.local.backup"
echo "3. Force push to update the repository"
echo ""
echo "WARNING: This script assumes the secret is only in the latest commit."
echo "If the secret appears in older commits, you'll need to use interactive rebase."
echo "See SECURITY.md for detailed instructions on handling secrets in older commits."
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operation cancelled."
  exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "ERROR: You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# Ensure we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "WARNING: You are not on the main branch. You're on '$CURRENT_BRANCH'."
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
  fi
fi

# Amend the commit
echo "Amending the latest commit to remove the secret..."
git commit --amend --no-edit

# Force push
echo "Ready to force push to update the repository."
echo "This will overwrite the history on the remote repository."
read -p "Do you want to force push now? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Push cancelled. You'll need to force push manually when ready:"
  echo "git push --force"
  exit 0
fi

git push --force

echo "Done! The secret has been removed from the Git history."
echo ""
echo "Next steps:"
echo "1. Verify the push was successful"
echo "2. If you were using the exposed API key, generate a new one in the Anthropic console"
echo "3. Update your .env.local file with the new API key"
echo ""
echo "Remember to follow the security guidelines in SECURITY.md for future work."
