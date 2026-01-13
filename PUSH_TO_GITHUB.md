# Push to GitHub Instructions

## Option 1: Use the Automated Script (Recommended)

Simply run the provided script:

```bash
cd "/Users/ted/Desktop/TED/Task App"
./push-to-github.sh
```

The script will:
- Initialize git if needed
- Set up the remote repository
- Stage all files
- Commit changes
- Push to GitHub

## Option 2: Manual Commands

If you prefer to run commands manually:

## Steps to Push to GitHub

1. **Navigate to the project directory:**
   ```bash
   cd "/Users/ted/Desktop/TED/Task App"
   ```

2. **Initialize git (if not already initialized):**
   ```bash
   git init
   ```

3. **Add the remote repository:**
   ```bash
   git remote add origin https://github.com/tedtots/woodwork.git
   ```
   (If the remote already exists, use: `git remote set-url origin https://github.com/tedtots/woodwork.git`)

4. **Add all files:**
   ```bash
   git add .
   ```

5. **Commit the changes:**
   ```bash
   git commit -m "Initial commit: Carpentry production workshop task tracking app"
   ```

6. **Set the main branch:**
   ```bash
   git branch -M main
   ```

7. **Push to GitHub:**
   ```bash
   git push -u origin main
   ```

## Note

If you encounter authentication issues, you may need to:
- Use a personal access token instead of password
- Set up SSH keys for GitHub
- Or use GitHub CLI (`gh auth login`)

The `.gitignore` file has been updated to exclude:
- `node_modules/` directories
- `server/database.sqlite` (database file)
- `.env` files (environment variables)
- `client/build/` (production build - can be regenerated)
- Build artifacts and logs
