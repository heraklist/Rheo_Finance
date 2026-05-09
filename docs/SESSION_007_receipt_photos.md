# Session 007 — Receipt photos (skeleton)

> Prerequisite: Session 006 complete. Sync engine δουλεύει.

> ⚠️ **Skeleton only.** Full prompt γράφεται όταν φτάσουμε σε αυτό το session, με βάση το actual state και τα τρέχοντα Tauri plugin versions (ταχέως εξελίσσονται).

---

## Σκοπός

Λήψη φωτογραφίας απόδειξης από native camera (desktop webcam ή Android), αποθήκευση τοπικά, async upload σε Supabase Storage μέσω sync engine.

---

## Scope

1. **Tauri plugin setup**
   - Install `@tauri-apps/plugin-camera` (αν stable τότε) ή fallback `@tauri-apps/plugin-fs` με file picker
   - Update `src-tauri/Cargo.toml` + `src-tauri/capabilities/default.json` με νέα permissions
   - Configure στο `src-tauri/src/lib.rs`

2. **Photo capture flow**
   - Camera button στο `TransactionForm` opens native picker/camera
   - Image compression πριν αποθήκευση (max 1200px wide, JPEG q=85)
   - Save σε `app_data_dir/receipts/{uuid}.jpg`
   - Set `receipt_photo_path` στο transaction

3. **Supabase Storage setup** (Heraklis-side)
   - Δημιουργία bucket `receipts` (private)
   - RLS policy: users see only their own files
   - Folder structure: `{user_id}/{transaction_id}.jpg`

4. **Sync extension**
   - Νέο entity type `receipt_photo` στο sync_outbox
   - Push: read local file → upload σε Storage → update transaction με remote URL
   - Pull: αν transaction έχει photo URL αλλά τοπικά λείπει → download

5. **UI**
   - TransactionRow: thumbnail (ήδη placeholder υπάρχει)
   - TransactionDetail: full-size image με tap-to-zoom

---

## Key decisions στο runtime

- **Camera plugin maturity**: στο 2026-Q2 το `tauri-plugin-camera` ίσως δεν είναι σταθερό. Decision: native plugin ή fallback file picker;
- **Compression library**: `browser-image-compression` (npm) ή native via canvas;
- **Photo deletion**: όταν διαγράφεται transaction → διάγραψε και photo (cascade); ή keep για audit;

---

## Heraklis-side prerequisites

Πριν το session:
1. Supabase Storage → New bucket → `receipts`, **Private**
2. Edit RLS policy:
   ```sql
   CREATE POLICY "users_own_receipts" ON storage.objects
     FOR ALL USING (auth.uid()::text = (storage.foldername(name))[1]);
   ```
3. Test ότι αν δοκιμάσεις upload μέσω SQL editor χωρίς auth, αποτυγχάνει

---

## Expected effort: ~4-6 ώρες

---

## Manual test checklist (όταν τρέχει)

- [ ] Tap camera button → native picker ανοίγει
- [ ] Επέλεξε/τράβα φωτογραφία → thumbnail εμφανίζεται στο form
- [ ] Save transaction → photo αποθηκεύεται τοπικά
- [ ] Sync push → photo ανεβαίνει σε Supabase Storage
- [ ] Σε νέο device (ή clear cache + re-login) → photo κατεβαίνει
- [ ] TransactionDetail → tap photo → full-size view
- [ ] Delete transaction → file διαγράφεται και τοπικά + remote

---

*Full prompt to be written at runtime. Refer to project plan v1.1 Section 9 for full design considerations.*
