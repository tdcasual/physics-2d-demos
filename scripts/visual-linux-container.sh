#!/usr/bin/env bash
# 在与 CI 同构的 ubuntu:24.04 容器内运行 visual-regression 截图测试。
#
# 背景：像素级截图对比只在相同渲染栈内可复现（浏览器构建 + CJK 字体 +
# fontconfig 默认值）。开发机宿主环境（任意 Linux 发行版/Mac）与 CI 的
# ubuntu runner 无法保证逐像素一致，因此 *-linux.png 基线的验证与重生成
# 都应在本容器（或 CI 的 workflow_dispatch update_snapshots）中进行。
#
# 用法：
#   ./scripts/visual-linux-container.sh            # 校验已提交的 linux 基线
#   ./scripts/visual-linux-container.sh update     # 重生成 linux 基线到宿主机
#
# 需要：docker。首次运行约 5 分钟（apt/pnpm/chromium），后续依赖 docker 层缓存。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/tests/visual/visual-regression.spec.ts-snapshots"
MODE="${1:-verify}"

docker run --rm \
  -e VISUAL_MODE="$MODE" \
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
su builder -s /bin/bash -c "cd /work && pnpm exec playwright install chromium"

if [ "$VISUAL_MODE" = update ]; then
  su builder -s /bin/bash -c "cd /work && pnpm exec playwright test tests/visual/visual-regression.spec.ts --update-snapshots"
  cp /work/tests/visual/visual-regression.spec.ts-snapshots/*-linux.png /out/
  echo "Linux baselines written into tests/visual/visual-regression.spec.ts-snapshots/ — review and commit."
else
  su builder -s /bin/bash -c "cd /work && pnpm exec playwright test tests/visual/visual-regression.spec.ts"
  echo "Linux baseline verification PASSED (container, CI-parity stack)."
fi
'
