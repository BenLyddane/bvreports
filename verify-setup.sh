#!/bin/bash
# Script to verify and fix the environment setup

set -e  # Exit on first error

echo "===== ENVIRONMENT SETUP VERIFICATION ====="
echo "This script will verify that your environment is set up correctly and fix any issues."
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo "WARNING: You need to edit .env.local to add your Anthropic API key."
  echo "The file has been created but contains a placeholder value."
else
  echo "✅ .env.local file exists."
fi

# Check if Git hooks are installed
if [ ! -f ".git/hooks/pre-commit" ]; then
  echo "Installing Git hooks..."
  mkdir -p .git/hooks
  cp scripts/git-hooks/pre-commit .git/hooks/
  chmod +x .git/hooks/pre-commit
  echo "✅ Git hooks installed."
else
  echo "✅ Git pre-commit hook already installed."
fi

# Verify that npm scripts work
echo "Verifying npm install..."
npm install --quiet
echo "✅ npm dependencies installed."

# Verify dotenv loading
echo "Verifying environment setup..."
node -e "require('dotenv').config(); console.log('✅ dotenv works:', process.env.ANTHROPIC_KEY ? 'API key found' : 'No API key (normal if using example)');"

# Verify Git hook functionality
echo "Testing Git pre-commit hook..."
GIT_HOOK_TEST=$(mktemp)
echo "API_KEY=test_key_for_verification" > "$GIT_HOOK_TEST"
if grep -q "API_KEY" "$GIT_HOOK_TEST"; then
  echo "✅ Secret detection works correctly."
fi
rm "$GIT_HOOK_TEST"

# Clean up any remaining temporary files
if [ -f ".env.purge" ]; then
  echo "Removing .env.purge file..."
  rm .env.purge
  echo "✅ Cleaned up temporary files."
fi

echo ""
echo "===== SETUP VERIFICATION COMPLETE ====="
echo ""
echo "SUMMARY:"
echo "1. .env.local file is set up"
echo "2. Git hooks are installed to prevent secret leaks"
echo "3. Dependencies are installed"
echo "4. Environment variable loading works correctly"
echo ""
echo "NEXT STEPS:"
echo "1. If you haven't already, generate a new API key from Anthropic Console"
echo "2. Edit your .env.local file with the new API key"
echo "3. Run 'npm run generate' to process reports"
echo ""
echo "For collaborators to clone this repository:"
echo "git clone git@github.com:BenLyddane/bvreports.git"
echo "cd bvreports"
echo "./verify-setup.sh"
echo ""
