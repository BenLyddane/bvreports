# Security Policy for BV Reports

## API Keys and Secrets

This application uses the Anthropic API, which requires an API key. **NEVER** commit API keys or any other secrets to the Git repository. 

### Setting Up Your Environment

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your real API key to `.env.local`:
   ```
   ANTHROPIC_KEY=your_actual_api_key_here
   ```

3. Never commit `.env.local` to the repository (it's already in `.gitignore`).

### What to Do If You Accidentally Commit a Secret

If you accidentally commit a secret:

1. **Immediately invalidate the exposed key/token**
   - Go to the service provider (e.g., Anthropic) and revoke the compromised key
   - Generate a new key to use going forward

2. **Remove the secret from Git history**
   - Use the instructions below to remove the secret from the Git history
   - Force push the changes to the remote repository

#### Removing a Secret from Git History

For a secret in the most recent commit:

```bash
# Remove the secret from your files
# Then amend the commit without changing the commit message
git commit --amend --all
# Force push
git push --force
```

For a secret in an older commit:

```bash
# Identify the commit that introduced the secret
git log

# Start an interactive rebase to that commit
git rebase -i <COMMIT-ID>~1

# Mark the commit as "edit" in the editor
# Make your changes to remove the secret
git add .
git commit --amend
git rebase --continue

# Force push
git push --force
```

### Preventing Secret Leaks

We have several safeguards in place:

1. **Comprehensive .gitignore**: All environment and secret files are excluded
2. **Pre-commit check**: Run `npm run git:check-secrets` before committing to check for secrets
3. **GitHub Secret Scanning**: GitHub will block pushes containing detected secrets

### Best Practices

1. **Use environment variables** for all secrets
2. **Never hardcode** sensitive information
3. **Regularly rotate** API keys as a security measure
4. **Use .env.local** for local development, never commit this file
5. **Review changes** carefully before committing

## Reporting Security Issues

If you discover a security vulnerability, please do not create a public issue. Instead, please report it directly to the repository owner.
