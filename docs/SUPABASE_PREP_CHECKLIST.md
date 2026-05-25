# Supabase Prep Checklist

Πριν τρέξει το `SESSION_005_supabase_auth.md`, ετοίμασε τα παρακάτω.

## 1. Project

- [ ] Supabase → New Project
- [ ] Name: `rheo-finance`
- [ ] Region: Frankfurt / EU Central (`eu-central-1`)
- [ ] Strong database password σε password manager
- [ ] Περίμενε να ολοκληρωθεί το provisioning

## 2. Security

- [ ] 2FA enabled στο Supabase account
- [ ] 2FA enabled στο email που θα λαμβάνει magic links
- [ ] 2FA enabled στο GitHub
- [ ] Repo παραμένει private

## 3. API Keys

Από Project Settings → API:

- [ ] Project URL: `https://xxxxx.supabase.co`
- [ ] `anon` public key
- [ ] `service_role` secret key αποθηκευμένο μόνο σε password manager

Μην δώσεις ποτέ `service_role` key σε agent και μην το βάλεις σε `.env.local`.
Για το app και το `SESSION_005` χρειαζόμαστε μόνο Project URL + `anon` key.

## 4. Local Env

Δημιούργησε `.env.local` στο project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

Το `.env.local` είναι ήδη στο `.gitignore`.

## 5. Auth Settings

Στο Supabase Dashboard:

- [ ] Authentication → Providers → Email enabled
- [ ] Email/password sign-up enabled
- [ ] Site URL για desktop dev: `http://localhost:1420`
- [ ] Redirect URLs να περιλαμβάνουν `http://localhost:1420`

Το production/domain redirect (`https://finance.rheo.app`) μπαίνει αργότερα όταν χρειαστεί.

## Ready Signal

Όταν είναι έτοιμα, πες:

```text
Supabase ready: URL + anon key υπάρχουν στο .env.local
```

Μετά τρέχουμε `SESSION_005`.
