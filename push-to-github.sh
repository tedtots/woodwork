#!/bin/bash

# Script to push the carpentry task tracking app to GitHub
# Repository: https://github.com/tedtots/woodwork.git

set -e  # Exit on error

echo "🚀 Pushing project to GitHub..."
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed. Please install git first."
    exit 1
fi

# Initialize git repository if it doesn't exist
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Add remote (or update if it exists)
echo "🔗 Setting up remote repository..."
if git remote get-url origin &> /dev/null; then
    git remote set-url origin https://github.com/tedtots/woodwork.git
    echo "✅ Updated remote URL"
else
    git remote add origin https://github.com/tedtots/woodwork.git
    echo "✅ Added remote repository"
fi

# Add all files
echo "📝 Staging files..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit. Repository is up to date."
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "Initial commit: Carpentry production workshop task tracking app" || \
    git commit -m "Update: Carpentry production workshop task tracking app"
    echo "✅ Changes committed"
fi

# Set main branch
echo "🌿 Setting main branch..."
git branch -M main

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
echo ""
echo "⚠️  Note: You may be prompted for GitHub credentials."
echo "   If using HTTPS, you'll need a Personal Access Token (not your password)."
echo "   Get one at: https://github.com/settings/tokens"
echo ""

if git push -u origin main; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🔗 Repository: https://github.com/tedtots/woodwork"
else
    echo ""
    echo "❌ Push failed. Common issues:"
    echo "   1. Authentication required - use a Personal Access Token"
    echo "   2. Repository doesn't exist or you don't have access"
    echo "   3. Network connectivity issues"
    echo ""
    echo "💡 Tip: Try using SSH instead:"
    echo "   git remote set-url origin git@github.com:tedtots/woodwork.git"
    echo "   git push -u origin main"
    exit 1
fi
