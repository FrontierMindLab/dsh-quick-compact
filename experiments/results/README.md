# results · 聚合结果

命名：`YYYYMMDD-<实验名>.json`。只放聚合指标，例如：

```json
{"date":"2026-11-05","experiment":"bench-compact","samples":12,"compact_ms_p50":180,"compact_ms_p95":320,"context_tokens_before":8420,"context_tokens_after":3100}
```

不放单条输入、日志、路径。提交前跑 `scripts/check-hygiene.sh`。
