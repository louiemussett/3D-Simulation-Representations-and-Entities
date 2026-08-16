# GitHub Guide for Local Files — Windows PowerShell

This guide explains how to put files from your Windows computer onto GitHub by using PowerShell and Git.

## The basic idea

Git uses three main steps:

1. **Add** — select the local changes that you want to include.
2. **Commit** — record those changes in your local Git repository.
3. **Push** — send the commits from your computer to GitHub.

The usual command sequence is:

```powershell
git add --all
git commit -m "Describe the change"
git push origin main
```

## Your repository

Your local repository is:

```text
C:\Users\louie_000\Documents\3D-Simulation-Representations-and-Entities
```

Its GitHub repository is:

```text
https://github.com/louiemussett/3D-Simulation-Representations-and-Entities
```

## Important PowerShell correction

Use `$env:USERPROFILE`, with no backslash after `env`:

```powershell
cd "$env:USERPROFILE\Documents\3D-Simulation-Representations-and-Entities"
```

Do not write:

```powershell
$env\:USERPROFILE
```

The correct form is always:

```powershell
$env:USERPROFILE
```

## Routine method: upload changes already inside the repository

Use this method after you edit, add, rename, or delete files inside the repository folder.

### 1. Open the repository

```powershell
cd "$env:USERPROFILE\Documents\3D-Simulation-Representations-and-Entities"
```

### 2. Confirm the branch

```powershell
git branch --show-current
```

For your normal public version, the result should be:

```text
main
```

### 3. Inspect the changes

```powershell
git status --short
git diff
```

Common symbols from `git status --short`:

| Symbol | Meaning |
| --- | --- |
| `M` | A tracked file was modified |
| `??` | A new file is not yet tracked |
| `D` | A tracked file was deleted |
| `R` | A tracked file was renamed |

If the command prints nothing, Git cannot see any changes inside the repository.

### 4. Stage the changes

To stage every change inside the repository:

```powershell
git add --all
```

Then inspect exactly what will be committed:

```powershell
git diff --cached --stat
```

For a detailed staged diff:

```powershell
git diff --cached
```

### 5. Commit the changes locally

```powershell
git commit -m "Describe what changed"
```

Example:

```powershell
git commit -m "Fix local and GitHub Pages startup"
```

The message should briefly state what the commit changes.

### 6. Push the commit to GitHub

```powershell
git push origin main
```

This is the step that sends the commit to GitHub.

### 7. Verify the result

```powershell
git status
git log -1 --oneline
```

A successful, fully synchronized result looks like:

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

The latest commit should also show both `HEAD -> main` and `origin/main`, for example:

```text
f048571 (HEAD -> main, origin/main, origin/HEAD) Fix local and GitHub Pages startup
```

## How to know whether a push succeeded

A successful push normally includes a line like:

```text
ce91523..f048571  main -> main
```

This means:

- GitHub previously had commit `ce91523`.
- Your new commit was `f048571`.
- GitHub's `main` branch was updated to the new commit.

Your supplied transcript therefore confirms that the files **were sent to GitHub successfully**.

The following lines confirm the same result:

```text
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
f048571 (HEAD -> main, origin/main, origin/HEAD) Fix local and GitHub Pages startup
```

## Copy files from another folder, then upload them

Git only tracks files inside the repository folder. If Codex or another program creates files elsewhere, copy them into the repository first.

Example source and destination variables:

```powershell
$sourceRoot = "$env:USERPROFILE\Documents\Codex\2026-07-30"
$repoRoot = "$env:USERPROFILE\Documents\3D-Simulation-Representations-and-Entities"
```

Copy one file:

```powershell
Copy-Item -LiteralPath "$sourceRoot\index.html" `
  -Destination "$repoRoot\index.html" -Force
```

Copy a folder and everything inside it:

```powershell
Copy-Item -LiteralPath "$sourceRoot\vendor\three" `
  -Destination "$repoRoot\vendor" -Recurse -Force
```

Then enter the repository and inspect the result:

```powershell
Set-Location $repoRoot
git status --short
```

If the correct changes appear, continue with:

```powershell
git add --all
git diff --cached --stat
git commit -m "Describe what changed"
git push origin main
git status
git log -1 --oneline
```

## The safest reusable upload block

After placing your changed files inside the repository, paste this:

```powershell
cd "$env:USERPROFILE\Documents\3D-Simulation-Representations-and-Entities"

git branch --show-current
git status --short
git diff

git add --all
git diff --cached --stat
git commit -m "Describe what changed"
git push origin main

git status
git log -1 --oneline
```

Replace `Describe what changed` with a real description.

## What common messages mean

### `nothing to commit, working tree clean`

Git sees no uncommitted changes inside the repository. Possible reasons:

- You already committed the changes.
- You edited a different copy of the files.
- You did not copy the changed files into the repository.
- The files are excluded by `.gitignore`.
- The new files are identical to the tracked versions.

### `Everything up-to-date`

Your local branch has no new commits to send. This is normal if you already pushed. If you expected a new upload, check whether the changed files were copied, staged, and committed.

### `Your branch is up to date with 'origin/main'`

Your local `main` branch and GitHub's last known `main` branch point to the same commit.

### `LF will be replaced by CRLF`

This is usually a Windows line-ending warning, not an upload failure. Your commit and push can still succeed.

### `fatal: not a git repository`

PowerShell is in the wrong folder. Return to the repository:

```powershell
cd "$env:USERPROFILE\Documents\3D-Simulation-Representations-and-Entities"
```

### Push rejected because GitHub contains newer work

First download and integrate the remote changes:

```powershell
git pull --rebase origin main
```

If that completes successfully, push again:

```powershell
git push origin main
```

If Git reports a merge conflict, stop and inspect the named files. Do not use a forced push merely to bypass the conflict.

## Check GitHub in a browser

After pushing:

1. Open the repository on GitHub.
2. Select the `main` branch.
3. Look for the latest commit message near the file list.
4. Open the commit history if necessary.
5. Confirm that the latest commit ID starts with the same characters shown by `git log -1 --oneline`.

For your successful upload, those characters are:

```text
f048571
```

## GitHub Pages after a push

GitHub Pages may need a few minutes to deploy a newly pushed commit. After waiting:

1. Open the Pages website.
2. Press `Ctrl+F5` to bypass the browser cache.
3. If it still shows the old version, open the repository's **Actions** tab and inspect the latest Pages deployment.

Pushing to GitHub and deploying GitHub Pages are related but separate events. A successful Git push does not by itself prove that the Pages deployment completed successfully.

## Files that should usually not be uploaded

Avoid committing generated or private material such as:

- `node_modules/`
- passwords, API keys, or access tokens
- `.env` files containing secrets
- large temporary output
- test caches and logs
- build artifacts that your project does not deliberately publish

Use a `.gitignore` file to exclude unwanted files. Your particular Pages fix deliberately included `vendor/three`, so that folder was appropriate for that commit.

## Quick reference

| Goal | Command |
| --- | --- |
| Enter repository | `cd "$env:USERPROFILE\Documents\3D-Simulation-Representations-and-Entities"` |
| Show current branch | `git branch --show-current` |
| Show changed files | `git status --short` |
| Show unstaged details | `git diff` |
| Stage everything | `git add --all` |
| Show staged summary | `git diff --cached --stat` |
| Create a commit | `git commit -m "Message"` |
| Send commits to GitHub | `git push origin main` |
| Download remote updates | `git pull --rebase origin main` |
| Show latest commit | `git log -1 --oneline` |
| Confirm synchronization | `git status` |

## One-sentence memory aid

**Put the files inside the repository, inspect them, add them, commit them, push them, and then verify that `main` and `origin/main` point to the same commit.**
