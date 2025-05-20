#!/bin/bash
# Script to safely remove API keys from Git history

set -e  # Exit on first error

# Check if git is installed
if ! command -v git >/dev/null 2>&1; then
  echo "Error: Git is not installed or not in your PATH"
  exit 1
fi

# Make sure we're at the root of the git repository
if [ ! -d ".git" ]; then
  echo "Error: This script must be run from the root of the Git repository"
  exit 1
fi

# Check if our purge file exists
if [ ! -f ".env.purge" ]; then
  echo "Error: .env.purge file not found. Please create it first."
  exit 1
fi

echo "===== API KEY REMOVAL FROM GIT HISTORY ====="
echo "This script will remove sensitive API keys from your Git history."
echo "This is a destructive operation that will rewrite history."
echo "Make sure you understand what this is doing!"
echo ""
echo "WARNING: After running this script, you'll need to:"
echo "  1. Generate a new API key from Anthropic"
echo "  2. Update your local .env.local file with the new API key"
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operation cancelled."
  exit 1
fi

# Backup the current .env.local if it exists
if [ -f ".env.local" ]; then
  echo "Creating backup of .env.local to .env.local.backup"
  cp .env.local .env.local.backup
fi

echo "Starting Git filter-branch operation to remove API keys..."

# Replace .env.local with our clean purge file in the entire history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local > /dev/null 2>&1 || exit 0; 
   if [ -f .env.purge ]; then cp .env.purge .env.local && git add .env.local; fi" \
  --tag-name-filter cat -- --all

echo "Cleaning up refs and forcing garbage collection..."
# Clean up refs
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Restore the backed up .env.local
if [ -f ".env.local.backup" ]; then
  echo "Restoring .env.local from backup..."
  cp .env.local.backup .env.local
  rm .env.local.backup
fi

echo "Done! The API key has been purged from your Git history."
echo ""
echo "Next steps:"
echo "1. Force push the changes to your remote repository:"
echo "   git push --force origin main"
echo ""
echo "2. Generate a new API key from Anthropic's console"
echo ""
echo "3. Update your .env.local file with the new API key"
echo ""
echo "4. Make sure .env.local is in your .gitignore file"
echo ""
echo "5. If you're working with others, they'll need to re-clone the repository"
echo ""
echo "IMPORTANT: Delete the .env.purge file when you're done:"
echo "rm .env.purge"
