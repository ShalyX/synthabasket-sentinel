# SynthaBasket Sentinel: lightweight VPS QA over the existing authorized SSH alias.
# Never copies .env files, keys, local wallet data or executable signing material.
# Uses a dedicated isolated checkout; does not stop or modify the VPS application services.
$ErrorActionPreference = 'Stop'
$ssh = 'C:\Program Files\Git\usr\bin\ssh.exe'
if (-not (Test-Path $ssh)) { throw 'Git SSH is required for the existing caraxes-vps alias.' }
$remote = @'
set -eu
mkdir -p "$HOME/sentinel-qa"
cd "$HOME/sentinel-qa"
if test -d .git; then
  git fetch --quiet --depth 1 origin main
  git reset --hard --quiet FETCH_HEAD
else
  git clone --quiet --depth 1 https://github.com/ShalyX/synthabasket-sentinel.git .
fi
printf 'VPS_COMMIT='
git rev-parse --short HEAD
nice -n 10 npm ci --ignore-scripts --no-audit --no-fund --loglevel=error
nice -n 10 node --import tsx --test --test-concurrency=2 src/lib/sentinel/*.test.ts
nice -n 10 env NODE_OPTIONS=--max-old-space-size=768 ./node_modules/.bin/tsc --noEmit
echo VPS_UNIT_AND_TYPECHECK_PASS
if curl -fsS -o /dev/null --max-time 12 https://synthabasket-sentinel.vercel.app/api/sentinel/markets; then
  echo PRODUCTION_MARKET_FEED_HTTP_OK
else
  echo PRODUCTION_MARKET_FEED_UNAVAILABLE
fi
'@
& $ssh -o BatchMode=yes -o ConnectTimeout=8 caraxes-vps $remote
if ($LASTEXITCODE -ne 0) { throw "Sentinel VPS QA failed with exit code $LASTEXITCODE." }
