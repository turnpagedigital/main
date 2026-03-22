#!/bin/bash
# ═══════════════════════════════════════════════════════
# Turnpage Digital Markets — Deploy to Cloudflare Pages
# ═══════════════════════════════════════════════════════
# Prerequisites: npm, wrangler (Cloudflare CLI)
#   npm install -g wrangler
#   wrangler login
# ═══════════════════════════════════════════════════════

set -e

PROJECT_NAME="turnpagedigital"

echo "═══ Turnpage Digital Markets Deploy ═══"
echo ""

# Step 1: Install deps
echo "→ Installing dependencies..."
npm install

# Step 2: Build
echo "→ Building..."
npm run build

# Step 3: Deploy to Cloudflare Pages
echo "→ Deploying to Cloudflare Pages..."
npx wrangler pages project create "$PROJECT_NAME" --production-branch="main" 2>/dev/null || true
npx wrangler pages deploy dist --project-name="$PROJECT_NAME"

echo ""
echo "═══════════════════════════════════════════"
echo "✓ Deployed! Your site is live at:"
echo "  https://$PROJECT_NAME.pages.dev"
echo ""
echo "IMPORTANT — Set environment variables in Cloudflare dashboard:"
echo "  1. Go to dash.cloudflare.com → Pages → $PROJECT_NAME → Settings → Environment variables"
echo "  2. Add: RESEND_API_KEY = <your Resend API key>"
echo "  3. (Optional) NOTIFY_EMAIL = info@turnpagedigital.com"
echo "  4. (Optional) FROM_EMAIL = Turnpage Digital Markets <noreply@turnpagedigital.com>"
echo ""
echo "To connect your custom domain (turnpagedigital.com):"
echo "  1. Go to dash.cloudflare.com → Pages → $PROJECT_NAME → Custom domains"
echo "  2. Add 'turnpagedigital.com' and 'www.turnpagedigital.com'"
echo "═══════════════════════════════════════════"
