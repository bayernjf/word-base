# Preview Screenshot Artifact Design

## Goal

Keep the preview screenshot workflow, but prevent it from creating temporary Git branches, commits, or pull requests.

## Workflow behavior

On pushes to `main` or `dev`, and when manually dispatched, the workflow builds the web app, captures the 1200×630 landing-page screenshot, and uploads `apps/web/public/preview.png` as a GitHub Actions artifact.

The screenshot remains available from the workflow run for inspection or download. It is not written back into the repository, so the deployed Open Graph image only changes when a developer intentionally updates and commits the tracked image.

## Implementation

Replace the current "Commit preview image to feature branch" step with `actions/upload-artifact`. Remove permissions that are only needed for pushing commits and opening pull requests; the workflow retains read-only repository access.

## Failure behavior

If the web build, preview server, or screenshot capture fails, the workflow fails. No repository state is changed in either success or failure cases.

## Verification

Validate the workflow YAML structure and confirm it contains no `git checkout -b`, `git push`, or `gh pr create` commands. Review the diff to ensure the artifact path is the generated PNG.
