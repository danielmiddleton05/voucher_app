# Voucher Lookup App - Contributor Guide

This guide is for people who have little or no coding experience.

If you can follow checklists and copy/paste commands, you can safely update this app.

## What this app does

- Students enter an email address in a web page.
- The backend checks MongoDB for that email.
- If found, it returns the voucher code.

## Where things live

- Frontend page: frontend/index.html
- Main backend server (production and standard startup): backend/https-server.js
- Local fallback backend (works even if Mongo auth fails): backend/simple-server.js
- Backend package config and scripts: backend/package.json
- Backend environment template: backend/.env.example
- Git ignore rules: .gitignore

## Big picture architecture

- Browser opens the frontend page.
- Frontend sends a request to backend API endpoint.
- Backend reads MONGODB_URI from environment variables.
- Backend queries vouchers collection in voucher-system database.
- Backend sends voucher code or a friendly error.

Production hosting:

- Frontend on AWS S3
- Backend on AWS EC2

## Before you start (required tools)

Install these on your computer:

- Git
- Node.js LTS (recommended version 18 or 20)
- VS Code (recommended)

## First-time setup

1. Clone the repo

- Open terminal in a folder where you want the project.
- Run:

  git clone https://github.com/danielmiddleton05/voucher_app.git
  cd voucher_app

2. Install backend dependencies

cd backend
npm install

3. Create local environment file

- Copy backend/.env.example to backend/.env
- Put your MongoDB URI into backend/.env

Example content:

- PORT=3000
- MONGODB_URI=your-real-uri-here

Important:

- Never commit backend/.env
- Never paste real secrets in chat, screenshots, or pull requests

## How to run locally

### Option A: Normal app mode (uses MongoDB)

From backend folder:

- npm start

Expected:

- Server starts on port 3000
- API route available at /api/voucher-lookup

### Option B: Fallback mode (for testing UI when Mongo fails)

From backend folder:

- npm run start-local-fallback

Expected:

- App starts even if Mongo login is failing
- Lookup returns a test voucher response

## How to update common parts safely

### 1) Change frontend wording, title, or styling

File:

- frontend/index.html

Safe edits:

- Headline text
- Subtitle text
- Colors and spacing in CSS

Do not break:

- Form id values
- JavaScript fetch logic unless you know what you are doing

### 2) Change frontend API target URL

File:

- frontend/index.html

Find API_URL in script section.
Update to your desired backend endpoint.

Tip:

- Keep one production URL for deployment and one localhost URL for local testing.

### 3) Change backend response text

Files:

- backend/https-server.js
- backend/simple-server.js

Look for messages like:

- Voucher found successfully
- Please contact student support

You can change wording without changing logic.

### 4) Add debugging output while testing

Add temporary console.log lines.
After testing, remove noisy logs before pushing.

## Golden rules for non-coders (anti-break checklist)

Before editing:

- Create a new branch
- Make one small change at a time

After editing:

- Start backend and confirm no crash
- Test one known email that should work
- Test one fake email that should fail

Before pushing:

- Run git status
- Confirm no secret files are included
- Confirm backend/.env is not staged

## Git workflow (copy/paste)

From project root:

1. Create branch

- git checkout -b yourname-short-description

2. Stage changes

- git add .

3. Commit

- git commit -m "Describe what you changed"

4. Push branch

- git push -u origin yourname-short-description

5. Open Pull Request in GitHub

## Deploy notes (high level)

Frontend (S3):

- Upload updated frontend/index.html to S3 bucket

Backend (EC2):

- Pull latest code on EC2
- Ensure MONGODB_URI is set in runtime environment
- Restart process manager (PM2)

If app is managed by PM2, common sequence on EC2:

- git pull
- npm install (if dependencies changed)
- pm2 restart voucher-app
- pm2 logs voucher-app

## Secrets and security (must read)

- Do not hardcode MongoDB credentials in code files.
- Keep secrets only in environment variables.
- If a secret was exposed, rotate it immediately.
- Keep cert/key files out of git.

## Troubleshooting

### Error: bad auth : authentication failed (Mongo code 8000)

Meaning:

- Username/password in MONGODB_URI is wrong, outdated, or not authorized.

Fix:

- Verify backend/.env MONGODB_URI
- Reset Atlas DB user password if needed
- Ensure URI password is URL-encoded if it has special characters

### Error: Cannot find path ... backend/backend

Meaning:

- You are already in backend folder and ran cd backend again.

Fix:

- Just run npm start directly in current folder.

### App starts but frontend cannot reach backend

Check:

- API URL in frontend/index.html
- CORS settings in backend server file
- Correct port and protocol (http vs https)

## File map for contributors

- frontend/index.html: Web page UI and fetch call
- backend/https-server.js: Main backend startup path (production and standard startup)
- backend/simple-server.js: Local fallback runner
- backend/package.json: npm scripts
- backend/.env.example: Template for env variables
- .gitignore: Prevents secrets and local artifacts from being committed

## Suggested editing strategy for vibecoding

- Make tiny changes.
- Run after each tiny change.
- If broken, undo the last tiny change only.
- Commit often with clear messages.
- Never mix style changes and behavior changes in one commit.

## Quick pre-push checklist

- App starts
- Health endpoint works
- Voucher lookup still works
- backend/.env not staged
- No .pem, .key, or .crt files staged
- Commit message explains the change clearly

## Who to ask when stuck

If something fails and you are unsure:

- Share the exact terminal error text
- Share what file you changed
- Share what command you ran

With those three things, debugging is usually fast.
