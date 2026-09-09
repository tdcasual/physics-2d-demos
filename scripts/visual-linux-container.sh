#!/usr/bin/env bash
# Linux 像素权威（SoT）：在 ubuntu:24.04 + fonts-noto-cjk 容器内跑
# visual-regression。CI 调用本脚本（verify / update），不要在
# ubuntu-latest runner 上裸跑 PNG 比对或 --update-snapshots。
#
# 像素只在同一渲染栈内可复现（Chromium 构建 + CJK 字体 + fontconfig）。
# 开发机宿主与 runner 裸跑都不是权威。
#
# 用法：
#   ./scripts/visual-linux-container.sh            # 校验已提交的 linux 基线
#   ./scripts/visual-linux-container.sh update     # 重生成 linux 基线到宿主机
#
# 需要：docker。每次约 5 分钟（apt/pnpm/chromium）；本波不缓存镜像层。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/tests/visual/visual-regression.spec.ts-snapshots"
MODE="${1:-verify}"

docker run --rm \
  --shm-size=1g \
  -e VISUAL_MODE="$MODE" \
  -e VISUAL_LINUX_AUTHORITY=1 \
  -v "$REPO_ROOT":/src:ro \
  -v "$OUT":/out \
  ubuntu:24.04 bash -c '
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null
apt-get install -y -qq curl ca-certificates >/dev/null
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs fonts-noto-cjk >/dev/null
npm install -g pnpm@10 >/dev/null 2>&1

cp -r /src /work
rm -rf /work/node_modules /work/dist /work/test-results /work/coverage
useradd -m builder
chown -R builder:builder /work

su builder -s /bin/bash -c "cd /work && pnpm config set store-dir /work/.pnpm-store && pnpm install --frozen-lockfile"
/work/node_modules/.bin/playwright install-deps chromium >/dev/null
su builder -s /bin/bash -c "export VISUAL_LINUX_AUTHORITY=1; cd /work && pnpm exec playwright install chromium"

export PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/visual-regression.json
cat > /tmp/assert-visual-linux-json.js <<ENDJS
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("/tmp/visual-regression.json", "utf8"));
const specs = [];
(function walk(s) {
  for (const spec of s.specs || []) specs.push(spec);
  for (const ch of s.suites || []) walk(ch);
})({ suites: data.suites || [] });
const shots = specs.filter((s) => /^(desktop|mobile) /.test(s.title));
const canary = specs.find((s) => s.title.includes("linux PNG authority"));
if (!canary || canary.ok !== true) {
  console.error("canary missing or not ok");
  process.exit(1);
}
const canarySkipped = (canary.tests || []).some((t) =>
  (t.results || []).some((r) => r.status === "skipped")
);
if (canarySkipped) {
  console.error("canary skipped");
  process.exit(1);
}
if (shots.length < 36) {
  console.error("expected >=36 screenshot specs, got", shots.length);
  process.exit(1);
}
const skipped = shots.filter((s) =>
  (s.tests || []).some((t) =>
    (t.results || []).some((r) => r.status === "skipped")
  )
);
if (skipped.length) {
  console.error("screenshot specs skipped:", skipped.map((s) => s.title).join(", "));
  process.exit(1);
}
ENDJS

run_visual_regression() {
  local extra="${1:-}"
  set +e
  su builder -s /bin/bash -c "export VISUAL_LINUX_AUTHORITY=1; export PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/visual-regression.json; cd /work && pnpm exec playwright test tests/visual/visual-regression.spec.ts --reporter=line --reporter=json $extra"
  local pw_ec=$?
  set -e
  node /tmp/assert-visual-linux-json.js
  return "$pw_ec"
}

set +e
if [ "$VISUAL_MODE" = update ]; then
  run_visual_regression --update-snapshots
else
  run_visual_regression
fi
pw_ec=$?
set -e
if [ "$pw_ec" -ne 0 ]; then
  exit "$pw_ec"
fi
if [ "$VISUAL_MODE" = update ]; then
  cp /work/tests/visual/visual-regression.spec.ts-snapshots/*-linux.png /out/
  echo "Linux baselines written into tests/visual/visual-regression.spec.ts-snapshots/ — review and commit."
else
  echo "Linux baseline verification PASSED (container SoT)."
fi
'
