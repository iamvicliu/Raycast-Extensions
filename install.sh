#!/bin/bash
# 一行命令安装本仓库里的 Raycast 扩展，不需要事先安装 Node.js 或 Git。
#
#   curl -fsSL https://raw.githubusercontent.com/iamvicliu/Raycast-Extensions/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/iamvicliu/Raycast-Extensions/main/install.sh | bash -s <扩展目录>
#
# 过程：下载 Node.js 官方版本（校验 SHA-256，只在本次安装中临时使用）→ 下载扩展源码
# → 构建并装进 Raycast → 删除临时文件。重复运行就是更新，Raycast 里的设置会保留。
set -euo pipefail

EXTENSION="${1:-AgentHub-Search}"
REPO="iamvicliu/Raycast-Extensions"
NODE_VERSION="22.22.2"

say() { printf '\033[1m==> %s\033[0m\n' "$*"; }
fail() { printf '\033[31m安装失败：%s\033[0m\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = "Darwin" ] || fail "只支持 macOS。"
[ -d "/Applications/Raycast.app" ] || fail "没有找到 Raycast，请先从 https://www.raycast.com 安装。"

case "$(uname -m)" in
  arm64)  NODE_ARCH="arm64"; NODE_SHA256="db4b275b83736df67533529a18cc55de2549a8329ace6c7bcc68f8d22d3c9000" ;;
  x86_64) NODE_ARCH="x64";   NODE_SHA256="12a6abb9c2902cf48a21120da13f87fde1ed1b71a13330712949e8db818708ba" ;;
  *) fail "不支持的芯片架构：$(uname -m)" ;;
esac

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

say "下载 Node.js ${NODE_VERSION}（临时使用，不会装到系统里）"
NODE_TGZ="node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TGZ}" -o "$WORK/node.tgz"
echo "${NODE_SHA256}  $WORK/node.tgz" | shasum -a 256 -c --status || fail "Node.js 下载文件校验不通过，请稍后重试。"
mkdir "$WORK/node" && tar -xzf "$WORK/node.tgz" -C "$WORK/node" --strip-components 1
export PATH="$WORK/node/bin:$PATH"

say "下载扩展 ${EXTENSION}"
curl -fsSL "https://codeload.github.com/${REPO}/tar.gz/refs/heads/main" -o "$WORK/src.tgz"
mkdir "$WORK/src" && tar -xzf "$WORK/src.tgz" -C "$WORK/src" --strip-components 1
[ -f "$WORK/src/${EXTENSION}/package.json" ] || fail "仓库里没有扩展「${EXTENSION}」。"

say "构建并安装到 Raycast（第一次大约需要 1 分钟）"
cd "$WORK/src/${EXTENSION}"
npm ci --no-audit --no-fund --loglevel=error
npm run build --silent

say "安装完成。打开 Raycast 搜索扩展名称即可使用。"
