"""Shanghai A-share data collection tasks powered by AkShare."""

from __future__ import annotations

import datetime as dt
import math
from typing import Dict, Iterable, Optional

import akshare as ak
import pandas as pd
from sqlmodel import Session, select

from ..core.logging_config import get_logger
from ..models import ShanghaiAMarketFundFlow, ShanghaiAStock, ShanghaiAStockFundFlow
from ..services.task_decorators import LimitCallTask, SchedulerTask

logger = get_logger(__name__)

# Quota used for AkShare calls (needs to exist in quota management)
AKSHARE_DAILY_QUOTA = "akshare_daily"


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _to_float(value: object) -> Optional[float]:
    """Convert a raw value (possibly string with %, commas) into float."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip()
        if not cleaned or cleaned in {"-", "--"}:
            return None
        cleaned = cleaned.replace(",", "")
        cleaned = cleaned.lstrip("+")

        multiplier = 1.0
        unit_map = [
            ("万亿", 1e12),
            ("亿元", 1e8),
            ("亿", 1e8),
            ("萬元", 1e4),  # Traditional character fallback
            ("万元", 1e4),
            ("万", 1e4),
            ("元", 1.0),
        ]
        for suffix, factor in unit_map:
            if cleaned.endswith(suffix):
                cleaned = cleaned[: -len(suffix)].strip()
                multiplier = factor
                break
        if cleaned.endswith("%"):
            cleaned = cleaned[:-1].strip()
        try:
            return float(cleaned) * multiplier
        except ValueError:
            return None
    return None


def _to_percent(value: object) -> Optional[float]:
    """Convert a percentage string to a numeric percentage value."""
    return _to_float(value)


def _ensure_stock(session: Session, code: str, name: str) -> ShanghaiAStock:
    """Ensure a Shanghai A stock master record exists and is active."""
    stock = session.get(ShanghaiAStock, code)
    utc_now = dt.datetime.now(dt.timezone.utc)

    if stock is None:
        stock = ShanghaiAStock(
            code=code,
            name=name or code,
            short_name=name or code,
            is_active=True,
            exchange="SH",
        )
        session.add(stock)
        logger.debug("Created Shanghai A stock master: %s - %s", code, stock.name)
    else:
        updated = False
        if name and stock.name != name:
            stock.name = name
            updated = True
        if not stock.is_active:
            stock.is_active = True
            updated = True
        if updated:
            stock.updated_at = utc_now
    return stock


def _upsert_market_fund_flow(
    session: Session,
    trade_date: dt.date,
    payload: Dict[str, object],
) -> None:
    """Insert or update the market-wide fund flow row."""
    record = session.exec(
        select(ShanghaiAMarketFundFlow).where(
            ShanghaiAMarketFundFlow.trade_date == trade_date
        )
    ).first()
    if record is None:
        record = ShanghaiAMarketFundFlow(trade_date=trade_date)
        session.add(record)

    record.shanghai_close = _to_float(
        payload.get("上证-收盘价") or payload.get("上证-收盘")
    )
    record.shanghai_pct_change = _to_percent(payload.get("上证-涨跌幅"))
    record.shenzhen_close = _to_float(
        payload.get("深证-收盘价") or payload.get("深证-收盘")
    )
    record.shenzhen_pct_change = _to_percent(payload.get("深证-涨跌幅"))
    record.main_net_inflow = _to_float(payload.get("主力净流入-净额"))
    record.main_net_ratio = _to_percent(payload.get("主力净流入-净占比"))
    record.super_large_net_inflow = _to_float(payload.get("超大单净流入-净额"))
    record.super_large_net_ratio = _to_percent(payload.get("超大单净流入-净占比"))
    record.large_net_inflow = _to_float(payload.get("大单净流入-净额"))
    record.large_net_ratio = _to_percent(payload.get("大单净流入-净占比"))
    record.medium_net_inflow = _to_float(payload.get("中单净流入-净额"))
    record.medium_net_ratio = _to_percent(payload.get("中单净流入-净占比"))
    record.small_net_inflow = _to_float(payload.get("小单净流入-净额"))
    record.small_net_ratio = _to_percent(payload.get("小单净流入-净占比"))


def _upsert_stock_fund_flow(
    session: Session,
    code: str,
    trade_date: dt.date,
    payload: Dict[str, object],
) -> None:
    """Insert or update an individual stock fund flow summary."""
    record = session.exec(
        select(ShanghaiAStockFundFlow).where(
            ShanghaiAStockFundFlow.stock_code == code,
            ShanghaiAStockFundFlow.trade_date == trade_date,
        )
    ).first()
    if record is None:
        record = ShanghaiAStockFundFlow(stock_code=code, trade_date=trade_date)
        session.add(record)

    record.latest_price = _to_float(
        payload.get("最新价")
        or payload.get("收盘价")
        or payload.get("今日收盘价")
    )
    record.pct_change = _to_percent(
        payload.get("涨跌幅") or payload.get("今日涨跌幅")
    )
    record.turnover_rate = _to_percent(
        payload.get("换手率") or payload.get("今日换手率")
    )
    record.inflow = _to_float(
        payload.get("流入资金")
        or payload.get("主力净流入")
        or payload.get("今日主力净流入")
    )
    record.outflow = _to_float(payload.get("流出资金") or payload.get("主力净流出"))
    record.net_inflow = _to_float(
        payload.get("净额")
        or payload.get("主力净流入-净额")
        or payload.get("今日主力净流入")
        or payload.get("主力净流入")
    )
    record.amount = _to_float(payload.get("成交额") or payload.get("今日成交额"))


# ---------------------------------------------------------------------------
# AkShare wrappers with rate limiting
# ---------------------------------------------------------------------------

@LimitCallTask(
    id="akshare_market_fund_flow",
    name="Market fund flow",
    quota_name=AKSHARE_DAILY_QUOTA,
    description="Fetch Shanghai & Shenzhen market fund flow via ak.stock_market_fund_flow",
)
def fetch_market_fund_flow() -> pd.DataFrame:
    return ak.stock_market_fund_flow()


@LimitCallTask(
    id="akshare_sh_a_fund_flow_rank",
    name="Shanghai A fund flow rank",
    quota_name=AKSHARE_DAILY_QUOTA,
    description="Fetch Shanghai A-share fund flow ranking via ak.stock_fund_flow_individual",
)
def fetch_shanghai_a_fund_flow_rank() -> pd.DataFrame:
    # Use 今日榜单（收盘后更新），若接口字段异常则自动切换即时榜单
    expected_columns = [
        "序号",
        "股票代码",
        "股票简称",
        "最新价",
        "涨跌幅",
        "换手率",
        "流入资金",
        "流出资金",
        "净额",
        "成交额",
    ]

    def _fetch(symbol: str) -> pd.DataFrame:
        df = ak.stock_fund_flow_individual(symbol=symbol)
        if df is None or df.empty:
            return pd.DataFrame()
        columns = expected_columns[: len(df.columns)]
        df = df.copy()
        df.columns = columns
        return df

    try:
        df = _fetch("今日")
        if df.empty:
            raise ValueError("Empty dataframe for 今日")
        return df
    except Exception as exc:
        logger.warning("今日资金榜单获取失败，改用即时榜单: %s", exc)
        return _fetch("即时")


@LimitCallTask(
    id="akshare_stock_individual_info",
    name="Stock individual info",
    quota_name=AKSHARE_DAILY_QUOTA,
    description="Fetch per-stock metadata via ak.stock_individual_info_em",
)
def fetch_stock_individual_info(symbol: str) -> pd.DataFrame:
    return ak.stock_individual_info_em(symbol=symbol)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def run_shanghai_a_daily_pipeline(
    session: Session,
    trade_date: Optional[dt.date] = None,
    stock_codes: Optional[Iterable[str]] = None,
) -> Dict[str, int]:
    """Run the Shanghai A-share fund flow collection workflow."""
    trade_date = trade_date or dt.date.today()
    summary = {
        "fund_flow_rows_upserted": 0,
        "market_flow_updated": 0,
    }

    logger.info("Running Shanghai A fund flow pipeline for %s", trade_date)

    # Market-wide fund flow (latest row)
    try:
        market_df = fetch_market_fund_flow()
        if market_df.empty:
            logger.warning("Market fund flow dataframe is empty")
        elif "日期" not in market_df.columns:
            logger.warning("Market fund flow dataframe is missing the '日期' column")
        else:
            market_df["日期"] = pd.to_datetime(market_df["日期"]).dt.date
            target_row = market_df.loc[market_df["日期"] == trade_date]
            if target_row.empty:
                target_row = market_df.head(1)
            if not target_row.empty:
                _upsert_market_fund_flow(session, trade_date, target_row.iloc[0].to_dict())
                summary["market_flow_updated"] = 1
                logger.info("Stored market fund flow for %s", trade_date)
            else:
                logger.warning("No market fund flow row found for %s", trade_date)
    except Exception as exc:
        session.rollback()
        logger.exception("Market fund flow collection failed: %s", exc)
        raise

    # Individual stock fund flow ranking
    try:
        fund_flow_df = fetch_shanghai_a_fund_flow_rank()
        if fund_flow_df.empty:
            logger.warning("Shanghai A fund flow ranking dataframe is empty")
        else:
            fund_flow_df = fund_flow_df.copy()
            code_column = None
            for candidate in ("代码", "股票代码"):
                if candidate in fund_flow_df.columns:
                    code_column = candidate
                    break

            if code_column:
                fund_flow_df[code_column] = (
                    fund_flow_df[code_column].astype(str).str.strip()
                )
                if stock_codes:
                    fund_flow_df = fund_flow_df[
                        fund_flow_df[code_column].isin(list(stock_codes))
                    ]
                else:
                    sh_prefixes = ("60", "68", "688", "689")
                    fund_flow_df = fund_flow_df[
                        fund_flow_df[code_column].str.startswith(sh_prefixes)
                    ]
            else:
                logger.warning(
                    "Shanghai A fund flow dataframe missing stock code column, proceeding without filter"
                )

            for _, row in fund_flow_df.iterrows():
                code = str(row.get(code_column) or row.get("代码") or row.get("股票代码") or "").strip()
                name = str(row.get("名称") or row.get("股票简称") or "").strip()
                if not code:
                    continue
                _ensure_stock(session, code, name)
                _upsert_stock_fund_flow(session, code, trade_date, row.to_dict())
                summary["fund_flow_rows_upserted"] += 1
            logger.info(
                "Shanghai A fund flow ranking stored with %d rows",
                len(fund_flow_df),
            )
    except Exception as exc:
        session.rollback()
        logger.exception("Shanghai A fund flow ranking collection failed: %s", exc)
        raise

    session.commit()
    logger.info("Shanghai A fund flow pipeline summary: %s", summary)
    return summary


@SchedulerTask(
    id="akshare_shanghai_a_daily_1700",
    name="Shanghai A fund flow update",
    cron="0 17 * * *",
    description="Daily 17:00 task: refresh market and stock-level fund flow data",
)
def scheduled_shanghai_a_daily(session: Session) -> None:
    """Scheduler entrypoint for the Shanghai A fund flow pipeline."""
    run_shanghai_a_daily_pipeline(session)
