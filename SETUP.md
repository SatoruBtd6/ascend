# Ascend — website setup

Do this on a computer. About 30 minutes. After it's done, everyone just opens one link on their phones and signs in once.

You'll create three free accounts (GitHub, Supabase, Vercel) and one paid-per-use key (Anthropic). Keep a notes file open to paste keys into as you go.

The live site is **https://www.ascendfit.site**. Code lives in the public GitHub repo **https://github.com/SatoruBtd6/ascend**, branch `main`. Vercel deploys on every commit to `main`.

---

## 1. Get the code (Git, not web upload)

1. Install [Git for Windows](https://git-scm.com) if you don't have it (include Git Credential Manager).
2. Clone the repo:

   ```
   git clone https://github.com/SatoruBtd6/ascend.git
   ```

3. Copy `.env.example` to `.env.local` and fill in your keys. **Never commit `.env`, `.env.local`, `dist/`, or `node_modules/`.**
4. Do not drag files onto GitHub's "upload" page. Updates go through `git commit` and `git push origin main`.

---

## 2. Create the database on Supabase (7 min)

1. Go to https://supabase.com → **Start your project** → sign up.
2. **New project**. Name: `ascend`. Set a database password (save it somewhere; you won't need it again). Region: closest to you. **Create new project** and wait about a minute.
3. Left sidebar → **SQL Editor** → **New query**. Open `supabase.sql` from the repo, paste all of it in, click **Run**. You should see "Success".
4. Left sidebar → **Project Settings** (gear) → **API**. Copy these two into your notes:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **anon public** key (long string under "Project API keys")
5. Left sidebar → **Authentication** → **Providers** → make sure **Email** is enabled (it is by default). Nothing else to change.

---

## 3. Get an Anthropic API key (3 min)

1. Go to https://console.anthropic.com → sign up → add a payment method under **Billing** (put $5–10 on it; that lasts a long time for a few people).
2. **API Keys** → **Create Key** → name it `ascend` → copy it into your notes. It starts with `sk-ant-`. You can only see it once.

---

## 4. Deploy on Vercel (first time, 7 min)

1. Go to https://vercel.com → sign up **with GitHub** (easiest).
2. **Add New…** → **Project** → find `ascend` in the list → **Import**.
3. Before clicking Deploy, open **Environment Variables** and add these three (name on the left, value on the right):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |
   | `ANTHROPIC_API_KEY` | your `sk-ant-…` key |

4. Click **Deploy**. Wait about a minute. You'll get a link like `https://ascend-xyz.vercel.app`. Copy it.

After this first import, **do not re-upload files**. Every push to `main` deploys. `dist/` is never committed; Vercel builds it.

---

## 5. Tell Supabase your site's address (2 min)

Sign-in links need to know where to send people back to.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**: paste your live link (e.g. `https://www.ascendfit.site` or the Vercel URL).
3. **Redirect URLs** → **Add URL** → paste the same link again. Save.

---

## 6. Try it

Open the live link on your phone, type your email, tap the link in the email. You're in. Send the same link to your cousins.

- **Add to home screen** (Share → Add to Home Screen on iPhone) so it feels like a real app.
- To bring over progress from the Claude version: make a save code there (Settings), then paste it into the website's Settings → Load save.
- Sign-in emails: Supabase's free email sender allows only a few sign-in emails per hour. Each phone only signs in once, so that's fine, but if a few people sign up at the same time, wait an hour and try again.

---

## Updating the app (Git rules)

Follow these in every phase. The owner pushes; Cursor / the coding agent does not.

- **Before starting a phase:** `git status` must be clean. If it isn't, stop and report. Then tag the starting point `pre-<phase>` (e.g. `pre-7d`).
- **During a phase:** commit at each part/checkpoint with a clear message. Never commit `.env*`, `dist/` or `node_modules/`.
- **Handover:** instead of a zip, report the commit hashes, `git diff --stat pre-<phase>..HEAD`, and the usual verification results. Tag the release `v<version>` once the owner approves.
- **Never, without the owner's explicit OK:** `git push` (the owner pushes), `push --force`, `reset --hard`, `clean`, rewriting history, or deleting tags/branches.
- **Undo** (owner-approved): discard uncommitted edits with `git restore .`; return to a tag with `git reset --hard <tag>`.
- **Deploy** (owner): `git push origin main` and `git push origin v<version>`. Vercel builds from `main`. `dist/` is never committed.

---

## Costs

- GitHub, Supabase, Vercel: free at this size.
- Anthropic: pay per use. Sterling replies and meal estimates are about a cent each; mog-off judging and restaurant lookups a few cents. A handful of people using it daily is a few dollars a month. You can set a spending limit in the Anthropic console.

## If something breaks

- **"Almost there" screen on the site**: the two `VITE_SUPABASE_*` variables are missing in Vercel. Add them, then Vercel → Deployments → ⋯ → Redeploy.
- **Sign-in link goes to a broken page**: step 5 wasn't done, or the Site URL doesn't exactly match your live link.
- **Sterling / AI features say they can't connect**: `ANTHROPIC_API_KEY` is missing in Vercel, or your Anthropic account has no credit.
- **Leaderboard empty or "couldn't reach"**: the SQL in step 2 didn't run. Run it again.
