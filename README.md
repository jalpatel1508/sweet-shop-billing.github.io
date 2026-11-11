
# Sweet Shop Billing

Free, offline-first billing app for a Gujarati sweet shop.
Bills are stored locally and optionally backed up to GitHub for a Telegram bot.

## Run locally
Just open `index.html` in a browser. No server, no build step.

## Deploy free & permanent
1. Create a **public** GitHub repo `sweet-shop-billing`.
2. Push these files.
3. Settings → Pages → Source: `main` / root → Save.
4. Your app is at `https://<user>.github.io/sweet-shop-billing/`.

## Cloud backup (for the Telegram bot)
1. Create a **private** repo `sweet-shop-bills`.
2. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories** → `sweet-shop-bills`
   - Permissions → **Contents: Read and write** (nothing else)
   - Expiration: **No expiration**
3. In the app → ⚙ Settings → fill username, repo, token → **Test connection** → Save.

Bills land at `bills/YYYY/MM/YYYYMMDD-NNN.json`.

## Keyboard shortcuts
| Key | Action |
|---|---|
| `/` | Focus search |
| `S` | Settings |
| `P` | Print |
| `Ctrl/⌘ + Enter` | Save bill |
| `Esc` | Close modal / collapse cart |
