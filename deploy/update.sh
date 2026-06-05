#!/usr/bin/env bash
# OWFC Harris — one-command update for the Hetzner server.
# Pulls the latest code and makes it live. Static site, so no build/restart needed.
#
#   ssh root@YOUR_SERVER_IP
#   /var/www/harris/deploy/update.sh
#
set -euo pipefail

SITE_DIR="/var/www/harris"

echo "→ Updating OWFC Harris site..."
cd "$SITE_DIR"
git fetch --quiet origin
git reset --hard origin/main      # take exactly what's in the repo's main branch
echo "✓ Files updated to $(git rev-parse --short HEAD)"

# nginx serves files directly, so the new version is already live.
# Reload only to pick up any nginx config changes (harmless otherwise):
nginx -t && systemctl reload nginx
echo "✓ Done — https://harris.football is up to date."
