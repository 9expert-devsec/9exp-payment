# 9exp-payment — Project Rules for Claude Code

## Version control
- **NEVER run git commands.** Do not `git add`, `git commit`, `git push`, or create branches.
- The developer handles all version control manually.
- When a change reaches a natural stopping point, **say so and suggest a commit message** — do not execute it.

## Language
- All code, comments, commit message suggestions, and identifiers: **English only**.
- Thai text appears only inside user-facing UI strings and PDF content.

## Stack (locked)
- Next.js 15 (App Router) · **JavaScript + JSX only — no TypeScript**
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