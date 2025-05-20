#!/bin/bash
# More aggressive script to remove API keys from Git history

set -e  # Exit on first error

echo "===== AGGRESSIVE API KEY REMOVAL FROM GIT HISTORY ====="
echo "This script creates a new branch without the secret, then replaces main with it."
echo ""
echo "WARNING: This is a destructive operation that completely rewrites history."
echo "All collaborators will need to re-clone the repository after this."
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operation cancelled."
  exit 1
fi

# Create a temporary branch from the current state without the secret files
echo "Creating a clean branch..."
git checkout -b temp-clean-branch
git rm --cached .env.local.backup
git commit -m "Remove sensitive files from tracking"

# Create a completely new branch with a single commit
echo "Creating a clean main branch..."
git checkout --orphan new-main

# Add all files from the current state
git add .

# Commit all files
git commit -m "Initial commit with clean history"

# Delete the old main branch and rename the new one
echo "Replacing main branch with clean branch..."
git branch -D temp-clean-branch
git branch -M main

echo "Done! Clean repository created. Now run:"
echo "git push --force origin main"
echo ""
echo "IMPORTANT: All collaborators will need to re-clone the repository."
echo "You should also generate a new API key since the old one was exposed."
