# Branch Protection

Recommended protection for `main`.

## Required status checks

Require pull requests before merging and require these checks to pass:

- `CI / quality`
- `CI / landing`
- `CI / supabase`
- `Security Audit / OSV Scanner`
- `Security Audit / pnpm audit high-only`
- `Security Audit / cargo audit`

## Recommended settings

Enable:

- Require a pull request before merging.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Do not allow force pushes to `main`.
- Do not allow deletions of `main`.

Optional for solo development:

- Require at least one approval.

## Manual CI run

The `CI` workflow supports `workflow_dispatch` and can be run manually from:

```text
Actions → CI → Run workflow → main
```

Use this after changing workflow configuration, dependency policy, or repository settings.
