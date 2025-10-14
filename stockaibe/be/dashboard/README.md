# Streamlit 限流监控面板

此目录收录原先 `stockaibe/fe` 中的 Streamlit 管控台，作为后端工程的附属可视化工具，方便排查限流、配额与追踪日志。

## 启动步骤

```bash
cd stockaibe/be
poetry install
poetry run streamlit run dashboard/app.py
```

> 💡 如需连接远程后端，可在 `dashboard/.streamlit/secrets.toml` 中设置：
>
> ```toml
> api_base = "http://your-backend:8000"
> ```

首次启动请在侧边栏输入后端创建的账号密码登录。
