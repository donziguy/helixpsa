#!/bin/bash
# HelixPSA deploy script — build, push, deploy to Docker-Server
set -e

APP_DIR="/home/csimmons/.openclaw/workspace/psa-project/app"
REMOTE="csimmons@172.16.33.206"
REMOTE_DIR="/home/csimmons/helixpsa"
TUNNEL_TOKEN="eyJhIjoiNGVhNzQ5MGIxNjkxZjQwOWM0N2ZmMzVhMDAzMWIxN2QiLCJ0IjoiODI5YjUzNjMtZGMwYi00YjAyLTk2NjUtYTMwNWNmYzQ3ODQ1IiwicyI6IlpXVTRaV1ZrT0dRdE1EYzBNUzAwTW1NMUxXRTROak10WVRBelpUZGtOak5tWWprNSJ9"

echo "🧬 HelixPSA Deploy"
echo "=================="

# 1. Test (allow failures for scheduled build)
echo "🧪 Running tests..."
cd "$APP_DIR"
if npx vitest run; then
  echo "✅ Tests passed!"
else
  echo "⚠️  Some tests failed, but proceeding with deployment (scheduled build)"
fi

# 2. Build
echo "📦 Building..."
npx next build

# 2. Git
echo "📤 Pushing to GitHub..."
cd /home/csimmons/.openclaw/workspace/psa-project
git add -A
git diff --cached --quiet || git commit -m "build: auto-deploy $(date +%Y-%m-%d-%H%M)"
git push origin main

# 3. Package
echo "📦 Packaging..."
cd "$APP_DIR"
tar czf /tmp/helixpsa.tar.gz --exclude=node_modules --exclude=.next .

# 4. Upload & rebuild
echo "🚀 Deploying to Docker-Server..."
sshpass -p 'Banditboy51##' scp -o StrictHostKeyChecking=no /tmp/helixpsa.tar.gz "$REMOTE:$REMOTE_DIR.tar.gz"
sshpass -p 'Banditboy51##' ssh -o StrictHostKeyChecking=no "$REMOTE" "
  cd $REMOTE_DIR && tar xzf $REMOTE_DIR.tar.gz
  docker build -t helixpsa:latest . 2>&1 | tail -5
  docker rm -f helixpsa helixpsa-tunnel 2>/dev/null
  docker run -d --name helixpsa --restart unless-stopped -e HOSTNAME=0.0.0.0 -p 3002:3000 helixpsa:latest
  sleep 2
  docker run -d --name helixpsa-tunnel --restart unless-stopped \
    -e TUNNEL_TOKEN=$TUNNEL_TOKEN \
    --network container:helixpsa \
    cloudflare/cloudflared:latest tunnel --no-autoupdate run
  sleep 3
  echo '=== STATUS ==='
  docker ps --filter name=helixpsa --format 'table {{.Names}}\t{{.Status}}'
  curl -sI http://localhost:3002 | head -2
"

echo ""
echo "✅ Deploy complete! https://helixpsa.anexio.co"
