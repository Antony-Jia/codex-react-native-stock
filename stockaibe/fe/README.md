# StockCrawler Limiter Admin Frontend

基于 Streamlit 的可视化控制台，展示限流指标、配额列表与追踪日志。

## 启动步骤

```bash
cd stockaibe/fe
poetry install
poetry run streamlit run app.py
```

> 💡 如需连接远程后端，可在 `.streamlit/secrets.toml` 中设置：
>
> ```toml
> api_base = "http://your-backend:8000"
> ```

首次启动请在侧边栏输入后端创建的账号密码登录。
