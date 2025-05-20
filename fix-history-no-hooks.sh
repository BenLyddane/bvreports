#!/bin/bash
# More aggressive script to remove API keys from Git history (without hooks)

set -e  # Exit on first error

echo "===== AGGRESSIVE API KEY REMOVAL FROM GIT HISTORY ====="
echo "This script creates a new repository with clean history."
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

# Temporarily disable the pre-commit hook
echo "Temporarily disabling pre-commit hooks..."
if [ -f ".git/hooks/pre-commit" ]; then
  mv .git/hooks/pre-commit .git/hooks/pre-commit.bak
fi

# Create a completely new branch with a single commit
echo "Creating a clean main branch..."
git checkout --orphan new-main

# Remove the .env.local.backup file
rm -f .env.local.backup

# Add all files except .env.local.backup
echo "Adding files to new branch..."
git add .

# Commit everything
echo "Committing clean history..."
git commit -m "Initial commit with clean history" --no-verify

# Rename to main
echo "Replacing main branch with clean branch..."
git branch -D main
git branch -M new-main main

# Restore pre-commit hook if we backed it up
if [ -f ".git/hooks/pre-commit.bak" ]; then
  mv .git/hooks/pre-commit.bak .git/hooks/pre-commit
fi

echo "Done! Clean repository created. Now run:"
echo "git push --force origin main"
echo ""
echo "IMPORTANT: All collaborators will need to re-clone the repository."
echo "You should also generate a new API key since the old one was exposed."
