# Production Preview Screenshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the latest landing-page screenshot at Cloudflare's stable `/preview.png` URL with every deployment.

**Architecture:** The existing deployment workflow builds the Vite app, runs a local preview of that build, and writes a screenshot directly into `apps/web/dist/preview.png`. Cloudflare Pages deploys that same directory, so the image and web version are published atomically.

**Tech Stack:** GitHub Actions, npm, Vite, Playwright, Cloudflare Pages.

---

### Task 1: Publish the generated screenshot with the deployment artifact

**Files:**
- Modify: `.github/workflows/deploy.yml:18-52, 161-205`
- Delete: `.github/workflows/screenshot.yml`
- Test: `.github/workflows/deploy.yml` (static workflow assertions)

- [ ] **Step 1: Write the failing workflow regression check**

Run this command before editing the workflow. It must fail because the separate screenshot workflow exists:

```bash
test ! -e .github/workflows/screenshot.yml
```

Expected: exit status `1` because the obsolete workflow exists.

- [ ] **Step 2: Generate the image in the Vite deployment output**

After building the web app and copying `_worker.js`, start `vite preview`, wait until it accepts HTTP requests, and run Playwright against it. Write the screenshot to `apps/web/dist/preview.png`, not `apps/web/public/preview.png`.

```yaml
      - name: Generate production preview image
        run: |
          npm -w @wordbase/web run preview -- --host 127.0.0.1 --port 4173 > /tmp/wordbase-preview.log 2>&1 &
          # Poll http://127.0.0.1:4173/ before taking the screenshot.
          npx --yes playwright@1.54.0 screenshot --device="Desktop Chrome" --viewport-size="1200,630" --wait-for-timeout=1000 http://127.0.0.1:4173/ apps/web/dist/preview.png
```

Delete `.github/workflows/screenshot.yml`, because it is no longer part of the deployment path. Add `check_status "/preview.png" "200"` to the Cloudflare verification condition.

- [ ] **Step 3: Run the regression check and YAML parse check**

```bash
test ! -e .github/workflows/screenshot.yml
node -e "const fs=require('fs'); const text=fs.readFileSync('.github/workflows/deploy.yml','utf8'); if (!text.includes('apps/web/dist/preview.png') || !text.includes('check_status \"/preview.png\" \"200\"')) process.exit(1)"
```

Expected: both commands exit `0`; no standalone screenshot workflow remains and the deployment pipeline includes the generated image and its health check.

- [ ] **Step 4: Inspect the focused diff**

```bash
git diff --check
git diff -- .github/workflows/deploy.yml .github/workflows/screenshot.yml
```

Expected: no whitespace errors; the only behavior change is moving screenshot publication into the Cloudflare deployment output.

- [ ] **Step 5: Commit the workflow fix**

```bash
git add .github/workflows/deploy.yml .github/workflows/screenshot.yml docs/superpowers
git commit -m "fix(ci): publish preview image with Cloudflare deploy"
```
