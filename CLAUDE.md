# 9exp-payment — Project Rules for Claude Code

## Version control
- Claude Code **may commit** but must **NEVER push**. The developer pushes (a push to `main` deploys to Vercel).
- **Never create, rename, or delete a branch.** Work only on the branch named in the prompt.
- Stage files **by explicit path only** — never `git add -A` or `git add .`.
- Nothing under `prompts/` is ever staged or committed.

## Language
- All code, comments, commit message suggestions, and identifiers: **English only**.
- Thai text appears only inside user-facing UI strings and PDF content.

## Stack (locked)
- Next.js 16 (App Router) · **JavaScript + JSX only — no TypeScript**
- Tailwind CSS · MongoDB (Mongoose) · Vercel · Cloudinary
- Fonts: **PDF → DB Heavent** (accounting document, must stay stable).
  **Web UI → LINE Seed Sans TH (headings/Thai) + Google Sans (body/EN/numerals)**.

## Boundaries
- MSDB API (`9exp-sec.com/api/ai`) is **strictly read-only**. Never write back to it.
- From MSDB, use only: course id, course name, cover image.
  **Never use `o_course_price` or `o_course_netprice`** — all pricing lives in this app's own DB.

## Working style
- Explain the plan before making non-trivial changes; wait for approval.
- One feature at a time. Do not add unrequested features.
- Verify with real output — do not report success without checking.