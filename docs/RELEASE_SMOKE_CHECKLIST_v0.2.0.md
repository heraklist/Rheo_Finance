# Release Smoke Checklist v0.2.0

Run this against the native Tauri app, not the browser-only Vite page.

## Install/start

- Install `src-tauri/target/release/bundle/nsis/Evochia Finance_0.2.0_x64-setup.exe`.
- Open the installed app.
- Confirm the app starts without a blank screen.
- Confirm Settings shows `Finance v0.2.0`.

## Auth + Stronghold

- Sign in with email/password.
- Complete MFA/TOTP.
- Close the app.
- Reopen the app.
- Expected: session is restored without logging in again.
- Sign out.
- Sign in again.
- Expected: no auth/localStorage error is shown.

## Transactions

- Create an expense transaction with no description.
- Expected: save succeeds and list/detail use category fallback copy.
- Edit the transaction amount/category/payment method.
- Expected: edited values persist after leaving and returning to detail.
- Delete the transaction.
- Expected: transaction disappears from list and no stale detail page remains.

## Books + VAT

- Switch default book to Personal.
- Create/open transaction form.
- Expected: VAT field is hidden.
- Switch default book to Business.
- Create/open income transaction form.
- Expected: VAT label is `ΦΠΑ (εκροών)`.
- Create/open expense transaction form.
- Expected: VAT label is `ΦΠΑ (εισροών)`.

## Sync

- Create one transaction while signed in.
- Run Settings -> Sync now.
- Expected: success message and pending count returns to `0`.
- Restart app.
- Expected: transaction remains visible.

## Recurring

- Create a recurring template in the current book.
- Toggle it disabled/enabled.
- Expected: state persists after leaving and returning to Recurring.

## Receipt file

- Attach a receipt/photo to a transaction.
- Open/download the receipt from detail.
- Expected: file opens and no permission error appears.

## Backup/export

- Run manual JSON backup.
- Expected: backup appears under `Documents/Evochia_Backups`.
- Run Excel export for the current quarter.
- Expected: export succeeds or cancellation is handled cleanly.

## Updater

- In Settings, click `Έλεγχος ενημερώσεων`.
- Before GitHub release assets are uploaded, expected: update check may report endpoint/release JSON failure.
- Upload `latest.json`, `Evochia Finance_0.2.0_x64-setup.exe`, and its `.sig` to the GitHub release.
- Expected: v0.2.0 reports no update for v0.2.0 clients.
- Expected for future v0.2.1+: an older client sees the GitHub-hosted update and verifies the signature before install.
