#!/bin/sh
# 提交前自查（只读）：绝对路径 / 常见凭据形态 / 可疑大文件。
# 用法：sh scripts/check-hygiene.sh   （在仓库根执行；失败返回 1）
set -eu
fail=0
echo "== 绝对路径 =="
if git grep -nE '/(Users|home)/[A-Za-z0-9._-]+' -- . ':!*.png' ':!*.jpg' ':!*.webp'; then
  echo "FAIL: 发现绝对路径" >&2; fail=1
else
  echo "ok"
fi
echo "== 凭据形态（gh/co/ovo/私钥头/长 hex） =="
if git grep -nE '(gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY)' -- .; then
  echo "FAIL: 疑似凭据" >&2; fail=1
else
  echo "ok"
fi
echo "== 大文件（>1MB 的已跟踪文件） =="
big=$(git ls-files -z | xargs -0 -I{} sh -c 'test -f "{}" && wc -c < "{}" | tr -d " " | sed "s|^|{} |"' | awk '$2>1048576 {print $1}')
if [ -n "$big" ]; then
  echo "$big" >&2; echo "WARN: 大文件（确认非二进制日志）" >&2
else
  echo "ok"
fi
[ "$fail" -eq 0 ] && echo "PASS" || echo "NO PASS" >&2
exit "$fail"
