# FrontierMindLab · DSH 插件与实验仓

一个私有仓库，两块内容：

| 目录 | 内容 | 维护 |
| --- | --- | --- |
| [`plugins/dsh-quick-compact/`](plugins/dsh-quick-compact/) | DSH 插件本体：上下文小环 + 一键 `/compact`（MIT） | 插件线 |
| `experiments/` | 性能基准、A/B 对比、脱敏样例与聚合结果 | 实验线 |
| `.github/workflows/` | PR CI、tag 校验（不自动发布） | 实验线 |
| `scripts/` | 仓库自动化（脱敏检查、跑批、changelog 草稿） | 实验线 |

## 数据卫生红线

- `experiments/` 只放脚本与**聚合指标**，不放原始日志、本机绝对路径、凭据、会话原文。
- 提交前跑 `scripts/` 下的脱敏自查；发布前另由独立模型做一次令牌/隐私审查。
- 仓库暂不公开；公开前需所有者确认并完成发布检查。

## 插件安装（本地）

```sh
# 从仓库子目录安装（开发态）
dsh plugin --profile <profile> add ./plugins/dsh-quick-compact
```

详见 [plugins/dsh-quick-compact/README.md](plugins/dsh-quick-compact/README.md)。
