# Ascend — Foundations 1: Git + deploy by `git push`

Requires 7c deployed and confirmed. **No app code changes in this phase** — no `APP_VERSION` or SW
cache bump. Four parts with stops. Cursor never enters credentials and never pushes; the owner does
every push.

## Environment reminders

- Workspace `C:\Users\rms76\ascend`, Windows, PowerShell, `npm.cmd` / `npx.cmd`.
- Remote: public repo `https://github.com/SatoruBtd6/ascend.git`, branch `main`. Vercel deploys on
  every commit to `main`.
- The repo is **public**: anything committed, including commit author emails, is visible forever.

---

# Part A — Install and configure (owner does the install)

**Owner:** install Git for Windows, either `winget install --id Git.Git -e` in PowerShell or the
installer from git-scm.com with default options (including "Git Credential Manager" and the default
line-ending setting). Close and reopen Cursor afterwards so `git` is on the PATH.

**Cursor:**

1. Confirm `git --version` works.
2. Set identity for this repo only (`git config`, not `--global` unless the owner asks):
   - `user.name` = `SatoruBtd6`
   - `user.email` = the owner's **GitHub noreply address** (GitHub → Settings → Emails, format
     `<id>+SatoruBtd6@users.noreply.github.com`). Ask the owner for it. Never use a personal email —
     it would be public.
3. Report `git config --list --show-origin` (redact nothing secret should be there; flag it if it is).

---

# Part B — Connect and audit (read-only — nothing is committed or pushed)

1. In the workspace: `git init -b main`, `git remote add origin <remote>`, `git fetch origin`
   (public repo — no sign-in needed).
2. `git reset origin/main` (**mixed**, never `--hard`). HEAD now points at what GitHub has; the
   working folder is untouched.
3. Confirm ignores **before** looking at anything else:
   - `git check-ignore -v .env.local node_modules dist` — all three ignored.
   - `git status --ignored` — no `.env*` file appears as untracked or modified.
4. Report the differences between GitHub and the workspace in three lists:
   - **On GitHub, not in the workspace** (`git status` "deleted") — these are stale files the web
     uploader never removed. **Flag anything under `api/` first**: every `.js`/`.mjs` there is a live
     Vercel endpoint.
   - **In the workspace, not on GitHub** (untracked).
   - **In both but different** (modified). Use `git diff --stat --ignore-cr-at-eol` so line-ending
     noise doesn't hide real changes; also report how many files differ **only** by line endings.
   GitHub should match the 7c zip, so real content differences outside the first list are a
   surprise — explain each one.
5. **History secret scan** (this closes the pending public-repo security check):
   - `git log origin/main -p` searched for `service_role`, `sk-ant-api`, `sk-proj-`, and `eyJ`
     tokens longer than 100 characters. For any `eyJ` hit, report whether it is the Supabase
     **anon** key (payload `"role":"anon"`) or anything else.
   - `git log origin/main --name-only --diff-filter=A` searched for any file whose name starts with
     `.env` ever having been committed.
   - Report file, commit and date for every hit, but **do not paste key values**. A service-role or
     Claude key found anywhere in history must be rotated by the owner — deleting the file does not
     remove it from history.

## B-checkpoint

Report the three lists, the line-ending count and the scan results. **Stop.** The owner decides
which GitHub-only files get deleted.

---

# Part C — Baseline commit and first push

1. Add a `.gitattributes` with `* text=auto` so line endings stay consistent from now on.
2. Apply the owner's decisions on the GitHub-only files (delete only what was approved).
3. `git add -A`, then `git status` — confirm again no `.env*`, `dist/` or `node_modules/` is staged.
4. Commit `7c baseline from local workspace`, tag `v7c`.
5. **Owner pushes**: `git push origin main` then `git push origin v7c`. The first push opens a browser
   sign-in (Git Credential Manager) — the owner completes it. Cursor does not handle this step.
6. After the push, verify:
   - Vercel deployment succeeds; `https://www.ascendfit.site` still reports 7c.
   - Sign in on localhost with chud still works; the owner confirms the live app loads and saves.
   - Any deleted `api/` file now returns 404 on the live site; `/api/steps`, `/api/claude`,
     `/api/support`, `/api/route` still respond as before.
   - GitHub's file list matches the workspace exactly.

## C-checkpoint

Report the commit hash, deployment result and the checks above. **Stop.**

---

# Part D — Working rules from now on

Add these rules to `SETUP.md` (replace the web-upload deploy section) and follow them in every future
phase:

- **Before starting a phase:** `git status` must be clean. If it isn't, stop and report. Then tag the
  starting point `pre-<phase>` (e.g. `pre-7d`).
- **During a phase:** commit at each part/checkpoint with a clear message. Never commit `.env*`,
  `dist/` or `node_modules/`.
- **Handover:** instead of a zip, report the commit hashes, `git diff --stat pre-<phase>..HEAD`, and
  the usual verification results. Tag the release `v<version>` once the owner approves.
- **Never, without the owner's explicit OK:** `git push` (the owner pushes), `push --force`,
  `reset --hard`, `clean`, rewriting history, or deleting tags/branches.
- **Undo** (owner-approved): discard uncommitted edits with `git restore .`; return to a tag with
  `git reset --hard <tag>`.
- **Deploy** (owner): `git push origin main` and `git push origin v<version>`. Vercel builds from
  `main`. `dist/` is never committed.
