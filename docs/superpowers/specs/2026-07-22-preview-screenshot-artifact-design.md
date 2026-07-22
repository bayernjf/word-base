# Production Preview Screenshot Design

## Goal

Publish the current landing-page preview image with every Cloudflare Pages deployment, without creating Git branches, commits, pull requests, or separate CI runs.

## Workflow behavior

On pushes to `main` or `dev`, and when manually dispatched, the deployment workflow builds the web app, starts that build locally, and captures a 1200×630 landing-page screenshot into `apps/web/dist/preview.png`. The same `dist` directory is deployed to Cloudflare Pages.

The production deployment therefore serves the generated image at the stable address `/preview.png`. The `main` deployment makes it available as `https://word-base.pages.dev/preview.png`, which other projects can reference directly.

## Implementation

Move screenshot generation into the existing `Build Web (Vite)` job in `.github/workflows/deploy.yml`, after Vite writes `apps/web/dist`. Remove the separate `.github/workflows/screenshot.yml` workflow entirely. Add `/preview.png` to the Cloudflare deployment health checks.

## Failure behavior

If the web build, preview server, screenshot capture, or Cloudflare image check fails, the deployment fails. No repository state is changed in either success or failure cases.

## Verification

Validate that the screenshot workflow was removed, the deployment workflow writes `apps/web/dist/preview.png`, and the deployment health check requests `/preview.png`.
