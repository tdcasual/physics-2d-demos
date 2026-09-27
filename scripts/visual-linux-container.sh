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
#   ./scripts/visual-linux-container.sh verify --grep 'desktop field-lines' --output /tmp/visual-out
#
# --grep 仅诊断；默认 verify 仍跑完整 covered 清单。
# --output 把容器 test-results（含 actual/expected/diff）挂到宿主机目录。
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO_ROOT/tests/visual/visual-regression.spec.ts-snapshots"
MODE="verify"
GREP=""
OUTPUT_DIR=""

usage() {
  echo "usage: $0 [verify|update] [--grep <playwright-grep>] [--output <host-dir>]" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    verify|update)
      MODE="$1"
      shift
      ;;
    --grep)
      [[ $# -ge 2 ]] || usage
      GREP="$2"
      shift 2
      ;;
    --output)
      [[ $# -ge 2 ]] || usage
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage
      ;;
  esac
done

grep_ok='^[A-Za-z0-9_.:*| ()-]+$'
if [[ -n "$GREP" && ! "$GREP" =~ $grep_ok ]]; then
  echo "refusing unsafe --grep value" >&2
  exit 2
fi

if [[ -n "$OUTPUT_DIR" ]]; then
  if [[ "$OUTPUT_DIR" == *..* ]]; then
    echo "refusing unsafe --output path" >&2
    exit 2
  fi
  mkdir -p "$OUTPUT_DIR"
fi

DOCKER_OUTPUT_ARGS=()
if [[ -n "$OUTPUT_DIR" ]]; then
  DOCKER_OUTPUT_ARGS+=(-v "$OUTPUT_DIR":/work/test-results)
fi

docker run --rm \
  --shm-size=1g \
  -e VISUAL_MODE="$MODE" \
  -e VISUAL_LINUX_AUTHORITY=1 \
  -e VISUAL_GREP="$GREP" \
  -v "$REPO_ROOT":/src:ro \
  -v "$OUT":/out \
  "${DOCKER_OUTPUT_ARGS[@]}" \
  ubuntu:24.04 bash -c '
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null
apt-get install -y -qq curl ca-certificates >/dev/null
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs fonts-noto-cjk >/dev/null
npm install -g pnpm@10 >/dev/null 2>&1

mkdir -p /work
cp -a /src/. /work/
rm -rf /work/node_modules /work/dist /work/coverage
useradd -m builder
mkdir -p /work/test-results
chown -R builder:builder /work

su builder -s /bin/bash -c "cd /work && pnpm config set store-dir /work/.pnpm-store && pnpm install --frozen-lockfile"
/work/node_modules/.bin/playwright install-deps chromium >/dev/null
su builder -s /bin/bash -c "export VISUAL_LINUX_AUTHORITY=1; cd /work && pnpm exec playwright install chromium"

export PLAYWRIGHT_JSON_OUTPUT_FILE=/tmp/visual-regression.json
cat > /tmp/assert-visual-linux-json.js <<ENDJS
const fs = require("fs");
const manifest = JSON.parse(
  fs.readFileSync("/work/tests/visual/baseline-coverage.json", "utf8")
);
const data = JSON.parse(fs.readFileSync("/tmp/visual-regression.json", "utf8"));
const specs = [];
(function walk(s) {
  for (const spec of s.specs || []) specs.push(spec);
  for (const ch of s.suites || []) walk(ch);
})({ suites: data.suites || [] });
const shots = specs.filter((s) => /^(desktop|mobile) /.test(s.title));
const canary = specs.find((s) => s.title.includes("linux PNG authority"));
if (!process.env.VISUAL_GREP) {
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
}
const expected = manifest.screenshotSpecCount;
if (typeof expected !== "number" || expected < 38) {
  console.error("manifest screenshotSpecCount must be >= 38, got", expected);
  process.exit(1);
}
if (!process.env.VISUAL_GREP) {
  if (shots.length !== expected) {
    console.error("expected", expected, "screenshot specs, got", shots.length);
    process.exit(1);
  }
  if (shots.length !== manifest.coveredSceneIds.length * 2) {
    console.error(
      "screenshot spec count must equal 2 * coveredSceneIds",
      shots.length,
      manifest.coveredSceneIds.length
    );
    process.exit(1);
  }
} else if (shots.length < 1) {
  console.error("grep selected no screenshot specs");
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

cat > /tmp/write-grep.cjs <<ENDGREP
require("fs").writeFileSync(
  "/tmp/visual-grep.dat",
  process.env.VISUAL_GREP || ""
);
ENDGREP
node /tmp/write-grep.cjs
cat > /tmp/run-visual.mjs <<ENDJS
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const args = [
  "exec",
  "playwright",
  "test",
  "tests/visual/visual-regression.spec.ts",
  "--reporter=line",
  "--reporter=json"
];
if (process.argv.includes("--update-snapshots")) {
  args.push("--update-snapshots");
}
let grep = "";
try {
  grep = readFileSync("/tmp/visual-grep.dat", "utf8");
} catch {
  grep = "";
}
if (grep) args.push("--grep", grep);

const result = spawnSync("pnpm", args, {
  cwd: "/work",
  env: {
    ...process.env,
    VISUAL_LINUX_AUTHORITY: "1",
    PLAYWRIGHT_JSON_OUTPUT_FILE: "/tmp/visual-regression.json"
  },
  encoding: "utf8"
});
const combined = (result.stdout || "") + (result.stderr || "");
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
mkdirSync("/work/test-results", { recursive: true });
writeFileSync("/work/test-results/visual-filtered.log", combined);
try {
  writeFileSync(
    "/work/test-results/visual-regression.json",
    readFileSync("/tmp/visual-regression.json")
  );
} catch {
  /* reporter file may be absent on spawn failure */
}
process.exit(result.status == null ? 1 : result.status);
ENDJS

run_visual_regression() {
  local extra="${1:-}"
  set +e
  su builder -s /bin/bash -c "export VISUAL_LINUX_AUTHORITY=1; cd /work && node /tmp/run-visual.mjs ${extra}"
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
