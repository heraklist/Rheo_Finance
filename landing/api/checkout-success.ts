import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/checkout-success?session_id=...
 * Redirect target after successful Stripe checkout.
 * Shows a simple thank-you page and tells user to return to the app.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sessionId = req.query.session_id as string | undefined;

  // Simple success page — the webhook handles the actual subscription activation
  const html = `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Επιτυχής εγγραφή — Rheo Finance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, -apple-system, system-ui, sans-serif;
      background: #FAF8F2;
      color: #1A1818;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .card {
      max-width: 420px;
      text-align: center;
      background: white;
      border: 1px solid #DFD3C1;
      border-radius: 12px;
      padding: 3rem 2rem;
    }
    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #2D6A4F15;
      margin-bottom: 1.5rem;
    }
    .icon svg { color: #2D6A4F; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 0.75rem; }
    p { font-size: 15px; color: #6B6258; line-height: 1.6; margin-bottom: 1.5rem; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #1A1818;
      color: #FAF8F2;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
    }
    .btn:hover { background: #2A2828; }
    .note { font-size: 12px; color: #8F8678; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>Η συνδρομή ενεργοποιήθηκε!</h1>
    <p>
      Η Pro συνδρομή σου είναι ενεργή. Επέστρεψε στην εφαρμογή
      για να απολαύσεις sync, αποδείξεις και όλα τα Pro features.
    </p>
    <a href="/" class="btn">Επιστροφή στο Rheo</a>
    <p class="note">Η εφαρμογή θα αναγνωρίσει τη συνδρομή αυτόματα.</p>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
