# experiments

实验线（基准、A/B、聚合结果）。红线：

- 不放原始日志、本机会话原文、绝对路径、凭据；
- `results/` 只提交聚合 JSON（`YYYYMMDD-*.json`），大文件走外部存储；
- 每个实验一个子目录，带 `README.md` 说明：动机、输入、指标、结论。
