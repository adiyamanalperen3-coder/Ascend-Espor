---
name: pnpm workspace normalization
description: Avoid unrelated workspace-config churn after adding package dependencies.
---

Package installation with the workspace's active pnpm version can rewrite the layout and comments in `pnpm-workspace.yaml`, even when only adding one package dependency.

**Why:** Workspace-level policies and package overrides are easy to lose in a broad normalization diff, and the lockfile can also adjust catalog specifiers independently.

**How to apply:** After installing a dependency, inspect both `pnpm-workspace.yaml` and `pnpm-lock.yaml`; keep the intended importer/lockfile changes and revert unrelated workspace policy or comment changes.
