#!/bin/sh
set -e

REPO_DIR="$(cd "$(dirname "$0")"/.. && pwd)"
cd "$REPO_DIR"

DATE_TAG=$(date +%Y-%m-%d)
BRANCH_NAME="chat-logs/$DATE_TAG"

# init repo if needed
if [ ! -d .git ]; then
  git init
fi

# set default user if missing
if ! git config user.name >/dev/null; then
  git config user.name "Chat Bot"
fi
if ! git config user.email >/dev/null; then
  git config user.email "chatbot@example.com"
fi

# ensure directory exists
mkdir -p docs/chat-logs

# create daily file if not exists
FILE="docs/chat-logs/chat-$DATE_TAG.md"
if [ ! -f "$FILE" ]; then
  printf "# Chat-Log %s\n\n## Einträge\n" "$DATE_TAG" > "$FILE"
fi

# add & commit
git add "$FILE" .gitignore
if ! git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
  git checkout -b "$BRANCH_NAME"
fi

if ! git diff --cached --quiet; then
  git commit -m "chore(chat): update chat log for $DATE_TAG"
fi

# stay on branch; pushing is manual to avoid credentials prompts

