# Security Audit

Rheo uses a lightweight security audit layer alongside Dependabot.

## CI coverage

The `Security Audit` workflow runs on pull requests, pushes to `main`, and manual dispatch.

It contains three independent jobs:

1. **OSV Scanner**
   - Scans JavaScript lockfiles only:
     - `pnpm-lock.yaml`
     - `landing/pnpm-lock.yaml`
   - Rust is intentionally excluded from OSV recursive scanning because Rust dependency policy is handled by `cargo audit`.

2. **pnpm audit high-only**
   - Runs `pnpm audit --audit-level high` for the root app.
   - Runs `pnpm --dir landing audit --audit-level high` for the landing app.
   - Fails on high or critical JavaScript dependency advisories.

3. **cargo audit**
   - Runs from `src-tauri`.
   - Uses `src-tauri/.cargo/audit.toml` for RustSec policy.

## Current RustSec exception

`src-tauri/.cargo/audit.toml` currently ignores:

```toml
RUSTSEC-2023-0071
```

Reason:

- This is a transitive `rsa` advisory.
- `cargo audit` did not report a patched version for the current dependency path.
- The exception is documented and should be reviewed periodically.

Remove the exception when the upstream dependency path can move away from the vulnerable crate or to a patched version.

## Local commands

```bash
pnpm security:pnpm-audit
pnpm security:pnpm-audit:landing
pnpm security:cargo-audit
pnpm security:audit
```

## Dependency update policy

Preferred order:

1. Upgrade direct dependencies.
2. Refresh lockfiles.
3. Use `pnpm` overrides only for transitive dependencies when a patched version is known and compatible.
4. Use documented ignores only when there is no safe upgrade path.

Do not merge dependency or security changes unless CI and Security Audit are green.
