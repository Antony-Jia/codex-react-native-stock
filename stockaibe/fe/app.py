"""Streamlit dashboard for StockCrawler Limiter Admin."""
from __future__ import annotations

from typing import Any

import httpx
import pandas as pd
import plotly.express as px
import streamlit as st

API_BASE = st.secrets.get("api_base", "http://localhost:8000")


@st.cache_data(ttl=30)
def fetch_metrics(token: str) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    resp = httpx.get(f"{API_BASE}/api/metrics/current", headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


@st.cache_data(ttl=30)
def fetch_series(token: str, quota_id: str | None = None) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    params = {"quota_id": quota_id} if quota_id else {}
    resp = httpx.get(f"{API_BASE}/api/metrics/series", headers=headers, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()["items"]


@st.cache_data(ttl=30)
def fetch_quotas(token: str) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    resp = httpx.get(f"{API_BASE}/api/quotas", headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


@st.cache_data(ttl=30)
def fetch_traces(token: str, limit: int = 50) -> list[dict[str, Any]]:
    headers = {"Authorization": f"Bearer {token}"}
    resp = httpx.get(
        f"{API_BASE}/api/traces",
        headers=headers,
        params={"limit": limit},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


st.set_page_config(page_title="Limiter Dashboard", layout="wide")
st.title("📊 StockCrawler 限流监控控制台")

with st.sidebar:
    st.header("认证")
    username = st.text_input("用户名", value=st.session_state.get("username", ""))
    password = st.text_input("密码", type="password")
    login_btn = st.button("登录", use_container_width=True)
    if login_btn:
        try:
            resp = httpx.post(
                f"{API_BASE}/api/auth/login",
                data={"username": username, "password": password},
                timeout=10,
            )
            resp.raise_for_status()
            token = resp.json()["access_token"]
            st.session_state["token"] = token
            st.session_state["username"] = username
            st.success("登录成功")
        except httpx.HTTPError as exc:
            st.error(f"登录失败: {exc}")

if "token" not in st.session_state:
    st.info("请在侧边栏登录以继续。首次使用请通过后端注册接口创建账号。")
    st.stop()

token = st.session_state["token"]

try:
    quotas = fetch_quotas(token)
except httpx.HTTPError as exc:
    st.error(f"无法加载配额数据: {exc}")
    st.stop()

metrics = fetch_metrics(token)
metric_df = pd.DataFrame(metrics)

col1, col2, col3 = st.columns(3)
with col1:
    st.metric("活跃配额", len(quotas))
with col2:
    st.metric("总成功数", metric_df["ok"].sum())
with col3:
    st.metric("总拒绝数", metric_df["r429"].sum())

st.subheader("配额详情")
st.dataframe(pd.DataFrame(quotas))

selected_quota = st.selectbox(
    "选择配额以查看时间序列",
    options=["全部"] + [quota["id"] for quota in quotas],
)

series_quota_id = None if selected_quota == "全部" else selected_quota
series = fetch_series(token, series_quota_id)
if series:
    series_df = pd.DataFrame(series)
    series_df["ts"] = pd.to_datetime(series_df["ts"])
    fig_ok = px.line(series_df, x="ts", y="ok", color="quota_id", title="成功次数趋势")
    fig_r429 = px.line(series_df, x="ts", y="r429", color="quota_id", title="429次数趋势")
    st.plotly_chart(fig_ok, use_container_width=True)
    st.plotly_chart(fig_r429, use_container_width=True)
else:
    st.info("暂无时间序列数据")

st.subheader("最新请求追踪")
traces = fetch_traces(token)
if traces:
    trace_df = pd.DataFrame(traces)
    if "created_at" in trace_df.columns:
        trace_df["created_at"] = pd.to_datetime(trace_df["created_at"])
    st.dataframe(trace_df)
else:
    st.info("暂无追踪记录")
