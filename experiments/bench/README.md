# bench · 性能基准

目的：量化 quick-compact 的开销与收益，避免"感觉变快了"。

## 指标（建议）
| 指标 | 说明 |
|---|---|
| `compact_ms` | 一次 /compact 从触发到完成的耗时（中位数，样本 ≥10） |
| `context_tokens_before/after` | 压缩前后上下文 token 数（同一会话同一任务） |
| `turn_ms_p50/p95` | 普通回合耗时（对照组 vs 实验组） |

## 运行
待接入 DSH 运行时后补 `bench.mjs`；先以"离线脚本 + 人工记录"方式跑，结果进 `../results/`。
