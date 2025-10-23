"""Shanghai A-share data collection tasks powered by AkShare."""

from __future__ import annotations

import datetime as dt
import math
from typing import Dict, Iterable, List, Optional, Set

import akshare as ak
import pandas as pd
from sqlmodel import Session, select

from ..core.logging_config import get_logger
from ..models import (
    ShanghaiAMarketFundFlow,
    ShanghaiAStock,
    ShanghaiAStockBalanceSheet,
    ShanghaiAStockHistory,
    ShanghaiAStockFundFlow,
    ShanghaiAStockPerformance,
)
from ..services.shanghai_a_service import ShanghaiAService
from ..services.task_decorators import LimitCallTask, SchedulerTask

logger = get_logger(__name__)

# Quota used for AkShare calls (needs to exist in quota management)
AKSHARE_DAILY_QUOTA = "akshare_daily"
MAX_FINANCIAL_QUARTERS = 40
CODE_COLUMN_CANDIDATES = ("股票代码", "代码", "证券代码")
NAME_COLUMN_CANDIDATES = ("股票简称", "名称", "股票名称", "简称", "证券简称")


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


def _parse_date(value: object) -> Optional[dt.date]:
    """Parse a string-like date into a Python date."""
    if value in (None, "", "-", "--"):
        return None
    try:
        ts = pd.to_datetime(value, errors="coerce")
    except Exception:
        return None
    if pd.isna(ts):
        return None
    if isinstance(ts, pd.Timestamp):
        return ts.date()
    if isinstance(ts, dt.datetime):
        return ts.date()
    if isinstance(ts, dt.date):
        return ts
    return None


def _normalize_stock_code(value: object) -> str:
    """Normalize various stock code representations to 6-digit format."""
    if value is None:
        return ""
    text = str(value).strip().upper().replace(".", "")
    if not text:
        return ""
    for prefix in ("SH", "SZ", "BJ", "HK"):
        if text.startswith(prefix):
            text = text[len(prefix) :]
            break
    text = text.strip()
    if text.isdigit():
        return text.zfill(6)
    return text


def _extract_stock_row(df: pd.DataFrame, stock_code: str) -> Optional[pd.Series]:
    """Return the first row that matches the given stock code."""
    if df is None or df.empty:
        return None
    normalized_target = _normalize_stock_code(stock_code)
    for column in ("股票代码", "代码", "证券代码"):
        if column in df.columns:
            normalized_codes = df[column].apply(_normalize_stock_code)
            matched = df.loc[normalized_codes == normalized_target]
            if not matched.empty:
                return matched.iloc[0]
    return None


def _normalize_quarter_end(date_value: dt.date) -> dt.date:
    """Return the quarter-end date for the provided date."""
    quarter = ((date_value.month - 1) // 3) + 1
    quarter_end_month = quarter * 3
    day_map = {3: 31, 6: 30, 9: 30, 12: 31}
    day = day_map[quarter_end_month]
    return dt.date(date_value.year, quarter_end_month, day)


def _iter_quarters(start: dt.date, end: dt.date):
    """Yield quarter-end dates between start and end (inclusive)."""
    current = _normalize_quarter_end(start)
    target_end = _normalize_quarter_end(end)
    processed = 0
    while current <= target_end:
        yield current
        processed += 1
        if processed > MAX_FINANCIAL_QUARTERS:
            raise ValueError(
                f"Requested range exceeds limit of {MAX_FINANCIAL_QUARTERS} quarters"
            )
        if current.month == 12:
            current = dt.date(current.year + 1, 3, 31)
        else:
            next_month = current.month + 3
            day_map = {3: 31, 6: 30, 9: 30, 12: 31}
            current = dt.date(current.year, next_month, day_map[next_month])


def _upsert_balance_sheet(
    session: Session,
    stock_code: str,
    report_period: dt.date,
    payload: Dict[str, object],
) -> None:
    """Persist a balance sheet row."""
    record = session.exec(
        select(ShanghaiAStockBalanceSheet).where(
            ShanghaiAStockBalanceSheet.stock_code == stock_code,
            ShanghaiAStockBalanceSheet.report_period == report_period,
        )
    ).first()
    if record is None:
        record = ShanghaiAStockBalanceSheet(
            stock_code=stock_code,
            report_period=report_period,
        )
        session.add(record)

    record.announcement_date = _parse_date(payload.get("公告日期"))
    record.currency_funds = _to_float(payload.get("资产-货币资金"))
    record.accounts_receivable = _to_float(payload.get("资产-应收账款"))
    record.inventory = _to_float(payload.get("资产-存货"))
    record.total_assets = _to_float(payload.get("资产-总资产"))
    record.total_assets_yoy = _to_percent(payload.get("资产-总资产同比"))
    record.accounts_payable = _to_float(payload.get("负债-应付账款"))
    record.advance_receipts = _to_float(payload.get("负债-预收账款"))
    record.total_liabilities = _to_float(payload.get("负债-总负债"))
    record.total_liabilities_yoy = _to_percent(payload.get("负债-总负债同比"))
    record.debt_to_asset_ratio = _to_percent(payload.get("资产负债率"))
    record.total_equity = _to_float(payload.get("股东权益合计"))


def _upsert_performance(
    session: Session,
    stock_code: str,
    report_period: dt.date,
    payload: Dict[str, object],
) -> None:
    """Persist an earnings performance row."""
    record = session.exec(
        select(ShanghaiAStockPerformance).where(
            ShanghaiAStockPerformance.stock_code == stock_code,
            ShanghaiAStockPerformance.report_period == report_period,
        )
    ).first()
    if record is None:
        record = ShanghaiAStockPerformance(
            stock_code=stock_code,
            report_period=report_period,
        )
        session.add(record)

    record.announcement_date = _parse_date(payload.get("最新公告日期"))
    record.eps = _to_float(payload.get("每股收益"))
    record.revenue = _to_float(payload.get("营业总收入-营业总收入"))
    record.revenue_yoy = _to_percent(payload.get("营业总收入-同比增长"))
    record.revenue_qoq = _to_percent(payload.get("营业总收入-季度环比增长"))
    record.net_profit = _to_float(payload.get("净利润-净利润"))
    record.net_profit_yoy = _to_percent(payload.get("净利润-同比增长"))
    record.net_profit_qoq = _to_percent(payload.get("净利润-季度环比增长"))
    record.bps = _to_float(payload.get("每股净资产"))
    record.roe = _to_percent(payload.get("净资产收益率"))
    record.operating_cash_flow_ps = _to_float(payload.get("每股经营现金流量"))
    record.gross_margin = _to_percent(payload.get("销售毛利率"))
    industry_value = payload.get("所处行业")
    record.industry = str(industry_value).strip() if industry_value not in (None, "-", "--") else None
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


def _upsert_stock_history(
    session: Session,
    stock_code: str,
    period: str,
    adjust: str,
    payload: Dict[str, object],
) -> tuple[bool, bool]:
    """Insert or update a historical OHLCV row. Returns (created, changed)."""
    trade_date = _parse_date(payload.get("日期"))
    if trade_date is None:
        logger.debug(
            "Skipping history row for %s - missing trade date in payload: %s",
            stock_code,
            payload,
        )
        return False, False

    record = session.exec(
        select(ShanghaiAStockHistory).where(
            ShanghaiAStockHistory.stock_code == stock_code,
            ShanghaiAStockHistory.period == period,
            ShanghaiAStockHistory.trade_date == trade_date,
            ShanghaiAStockHistory.adjust == adjust,
        )
    ).first()

    if record is None:
        record = ShanghaiAStockHistory(
            stock_code=stock_code,
            trade_date=trade_date,
            period=period,
            adjust=adjust,
        )
        session.add(record)
        created = True
    else:
        created = False

    field_values = {
        "open": _to_float(payload.get("开盘")),
        "close": _to_float(payload.get("收盘")),
        "high": _to_float(payload.get("最高")),
        "low": _to_float(payload.get("最低")),
        "volume": _to_float(payload.get("成交�?)),
        "amount": _to_float(payload.get("成交�?)),
        "amplitude": _to_percent(payload.get("振幅")),
        "pct_change": _to_percent(payload.get("涨跌�?)),
        "change_amount": _to_float(payload.get("涨跌�?)),
        "turnover_rate": _to_percent(payload.get("换手�?)),
    }

    volume_value = field_values.get("volume")
    if volume_value is not None:
        try:
            field_values["volume"] = int(volume_value)
        except (TypeError, ValueError):
            field_values["volume"] = None

    changed = False
    utc_now = dt.datetime.now(dt.timezone.utc)
    for attr, value in field_values.items():
        current = getattr(record, attr)
        if value is None and current is None:
            continue
        if value != current:
            setattr(record, attr, value)
            changed = True

    if changed and not created:
        record.updated_at = utc_now

    return created, changed


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


@LimitCallTask(
    id="akshare_stock_balance_sheet_quarterly",
    name="Stock balance sheet (quarterly)",
    quota_name=AKSHARE_DAILY_QUOTA,
    description="Fetch quarterly balance sheet data via ak.stock_zcfz_em",
)
def fetch_stock_balance_sheet(raw_date: str) -> pd.DataFrame:
    """Wrapper around ak.stock_zcfz_em."""
    return ak.stock_zcfz_em(date=raw_date)


@LimitCallTask(
    id="akshare_stock_performance_quarterly",
    name="Stock performance (quarterly)",
    quota_name=AKSHARE_DAILY_QUOTA,
    description="Fetch quarterly earnings performance data via ak.stock_yjbb_em",
)
def fetch_stock_performance(raw_date: str) -> pd.DataFrame:
    """Wrapper around ak.stock_yjbb_em."""
    return ak.stock_yjbb_em(date=raw_date)


@LimitCallTask(
    id="akshare_stock_history",
    name="Stock history (daily/weekly/monthly)",
    quota_name=AKSHARE_DAILY_QUOTA,
    description="Fetch Shanghai A-share historical quotes via ak.stock_zh_a_hist",
)
def fetch_stock_history(
    symbol: str,
    period: str,
    start_date: str,
    end_date: str,
    adjust: str = "hfq",
) -> pd.DataFrame:
    """Wrapper around ak.stock_zh_a_hist."""
    return ak.stock_zh_a_hist(
        symbol=symbol,
        period=period,
        start_date=start_date,
        end_date=end_date,
        adjust=adjust,
    )


@LimitCallTask(
    id="akshare_company_news",
    name="Company news",
    quota_name=AKSHARE_DAILY_QUOTA,
    description="Fetch company news via ak.stock_gsrl_gsdt_em",
)
def fetch_company_news(date: str) -> pd.DataFrame:
    """Wrapper around ak.stock_gsrl_gsdt_em."""
    return ak.stock_gsrl_gsdt_em(date=date)


@LimitCallTask(
    id="akshare_stock_bid_ask",
    name="Stock bid ask quote",
    quota_name=AKSHARE_DAILY_QUOTA,
    description="Fetch real-time stock bid/ask quote via ak.stock_bid_ask_em",
)
def fetch_stock_bid_ask(symbol: str) -> pd.DataFrame:
    """Wrapper around ak.stock_bid_ask_em for real-time quote data."""
    return ak.stock_bid_ask_em(symbol=symbol)


def _resolve_history_stock_codes(
    session: Session,
    stock_codes: Optional[Iterable[str]],
) -> List[str]:
    """Normalize and deduplicate stock codes for history collection."""
    if stock_codes:
        normalized: List[str] = []
        seen: Set[str] = set()
        for raw_code in stock_codes:
            code = _normalize_stock_code(raw_code)
            if not code or code in seen:
                continue
            normalized.append(code)
            seen.add(code)
        return normalized
    return ShanghaiAService.get_active_stock_codes(session)


def collect_stock_history(
    session: Session,
    stock_codes: Iterable[str],
    start_date: dt.date,
    end_date: dt.date,
    period: str,
    adjust: str = "hfq",
) -> Dict[str, int]:
    """Collect historical OHLC data for the provided stocks."""
    if start_date > end_date:
        raise ValueError("start_date must not be later than end_date")
    normalized_period = period.lower()
    if normalized_period not in {"daily", "weekly", "monthly"}:
        raise ValueError(f"Unsupported period: {period}")

    summary: Dict[str, int] = {
        "stocks_processed": 0,
        "rows_inserted": 0,
        "rows_updated": 0,
        "rows_skipped": 0,
    }

    start_str = start_date.strftime("%Y%m%d")
    end_str = end_date.strftime("%Y%m%d")

    for raw_code in stock_codes:
        code = _normalize_stock_code(raw_code)
        if not code:
            logger.debug("Skipping invalid stock code: %s", raw_code)
            continue

        summary["stocks_processed"] += 1
        logger.info(
            "Collecting %s history for %s (%s -> %s, adjust=%s)",
            normalized_period,
            code,
            start_str,
            end_str,
            adjust,
        )

        try:
            df = fetch_stock_history(
                symbol=code,
                period=normalized_period,
                start_date=start_str,
                end_date=end_str,
                adjust=adjust,
            )
        except Exception as exc:
            session.rollback()
            logger.exception(
                "History fetch failed for %s (%s, %s-%s): %s",
                code,
                normalized_period,
                start_str,
                end_str,
                exc,
            )
            continue

        if df is None or df.empty:
            logger.info(
                "No history rows returned for %s (%s, %s-%s)",
                code,
                normalized_period,
                start_str,
                end_str,
            )
            continue

        df = df.copy()
        stock_name: Optional[str] = None
        for candidate in ("股票名称", "名称"):
            if candidate in df.columns:
                raw_name = df.iloc[0].get(candidate)
                if isinstance(raw_name, str) and raw_name.strip():
                    stock_name = raw_name.strip()
                    break

        existing_stock = session.get(ShanghaiAStock, code)
        if stock_name is None and existing_stock is not None:
            stock_name = existing_stock.name

        _ensure_stock(session, code, stock_name or code)

        inserted = updated = skipped = 0
        for _, row in df.iterrows():
            created, changed = _upsert_stock_history(
                session,
                stock_code=code,
                period=normalized_period,
                adjust=adjust,
                payload=row.to_dict(),
            )
            if created:
                inserted += 1
            elif changed:
                updated += 1
            else:
                skipped += 1

        try:
            session.commit()
        except Exception:
            session.rollback()
            logger.exception(
                "Failed to persist history rows for %s (%s, %s-%s)",
                code,
                normalized_period,
                start_str,
                end_str,
            )
            continue

        summary["rows_inserted"] += inserted
        summary["rows_updated"] += updated
        summary["rows_skipped"] += skipped

    return summary


def trigger_stock_history_collection(
    session: Session,
    start_date: dt.date,
    end_date: dt.date,
    period: str,
    stock_codes: Optional[Iterable[str]] = None,
    adjust: str = "hfq",
) -> Dict[str, int]:
    """Resolve stock list and collect historical OHLC data."""
    codes = _resolve_history_stock_codes(session, stock_codes)
    if not codes:
        logger.info("No stock codes available for history collection (period=%s)", period)
        return {
            "stocks_processed": 0,
            "rows_inserted": 0,
            "rows_updated": 0,
            "rows_skipped": 0,
        }
    return collect_stock_history(
        session=session,
        stock_codes=codes,
        start_date=start_date,
        end_date=end_date,
        period=period,
        adjust=adjust,
    )


def _default_history_range(period: str, end_date: dt.date) -> tuple[dt.date, dt.date]:
    """Return (start, end) date range for scheduled history collection."""
    normalized_period = period.lower()
    if normalized_period == "daily":
        return end_date, end_date
    if normalized_period == "weekly":
        return end_date - dt.timedelta(days=14), end_date
    if normalized_period == "monthly":
        return end_date - dt.timedelta(days=62), end_date
    raise ValueError(f"Unsupported period: {period}")


def _run_scheduled_history_task(session: Session, period: str, adjust: str = "hfq") -> None:
    """Helper for scheduler entries to collect history data."""
    today = dt.date.today()
    end_date = today - dt.timedelta(days=1)
    if end_date < dt.date(1990, 1, 1):
        end_date = today
    start_date, actual_end = _default_history_range(period, end_date)
    codes = _resolve_history_stock_codes(session, None)
    if not codes:
        logger.info("Skipped %s history task: no active stock codes", period)
        return
    summary = collect_stock_history(
        session=session,
        stock_codes=codes,
        start_date=start_date,
        end_date=actual_end,
        period=period,
        adjust=adjust,
    )
    logger.info("History %s task summary: %s", period, summary)


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


def collect_shanghai_a_financials(
    session: Session,
    start_period: dt.date,
    end_period: dt.date,
    include_balance_sheet: bool = True,
    include_performance: bool = True,
) -> Dict[str, object]:
    """Collect quarterly financial datasets for all Shanghai A stocks within the range."""
    if not include_balance_sheet and not include_performance:
        raise ValueError("At least one dataset must be requested")
    if start_period > end_period:
        raise ValueError("start_period must be earlier than or equal to end_period")

    summary: Dict[str, object] = {
        "quarters_processed": [],
        "balance_sheet_rows": 0,
        "balance_sheet_stocks": 0,
        "performance_rows": 0,
        "performance_stocks": 0,
    }

    balance_codes: Set[str] = set()
    performance_codes: Set[str] = set()

    try:
        for quarter_end in _iter_quarters(start_period, end_period):
            summary["quarters_processed"].append(quarter_end.isoformat())
            quarter_key = quarter_end.strftime("%Y%m%d")

            if include_balance_sheet:
                try:
                    balance_df = fetch_stock_balance_sheet(quarter_key)
                except Exception as exc:
                    logger.warning("Balance sheet fetch failed at %s: %s", quarter_key, exc)
                else:
                    if balance_df is None or balance_df.empty:
                        logger.info("Balance sheet dataset empty for %s", quarter_key)
                    else:
                        for _, row in balance_df.iterrows():
                            code = None
                            for candidate in CODE_COLUMN_CANDIDATES:
                                value = row.get(candidate)
                                if value:
                                    code = _normalize_stock_code(value)
                                    if code:
                                        break
                            if not code:
                                continue
                            name = None
                            for candidate in NAME_COLUMN_CANDIDATES:
                                raw_name = row.get(candidate)
                                if isinstance(raw_name, str) and raw_name.strip():
                                    name = raw_name.strip()
                                    break
                            _ensure_stock(session, code, name or code)
                            _upsert_balance_sheet(session, code, quarter_end, row.to_dict())
                            summary["balance_sheet_rows"] += 1
                            balance_codes.add(code)

            if include_performance:
                try:
                    performance_df = fetch_stock_performance(quarter_key)
                except Exception as exc:
                    logger.warning("Performance fetch failed at %s: %s", quarter_key, exc)
                else:
                    if performance_df is None or performance_df.empty:
                        logger.info("Performance dataset empty for %s", quarter_key)
                    else:
                        for _, row in performance_df.iterrows():
                            code = None
                            for candidate in CODE_COLUMN_CANDIDATES:
                                value = row.get(candidate)
                                if value:
                                    code = _normalize_stock_code(value)
                                    if code:
                                        break
                            if not code:
                                continue
                            name = None
                            for candidate in NAME_COLUMN_CANDIDATES:
                                raw_name = row.get(candidate)
                                if isinstance(raw_name, str) and raw_name.strip():
                                    name = raw_name.strip()
                                    break
                            _ensure_stock(session, code, name or code)
                            _upsert_performance(session, code, quarter_end, row.to_dict())
                            summary["performance_rows"] += 1
                            performance_codes.add(code)

        session.commit()
    except Exception:
        session.rollback()
        raise

    summary["balance_sheet_stocks"] = len(balance_codes)
    summary["performance_stocks"] = len(performance_codes)

    logger.info("Financial collection summary: %s", summary)
    return summary


@SchedulerTask(
    id="akshare_stock_history_daily_0100",
    name="Stock history daily sync",
    cron="0 1 * * *",
    description="Daily 01:00 task: collect previous-day HFQ daily history for active stocks",
)
def scheduled_stock_history_daily(session: Session) -> None:
    """Scheduler entrypoint for daily period history collection."""
    _run_scheduled_history_task(session, period="daily")


@SchedulerTask(
    id="akshare_stock_history_weekly_0100",
    name="Stock history weekly sync",
    cron="0 1 * * 1",
    description="Weekly Monday 01:00 task: collect HFQ weekly history for active stocks",
)
def scheduled_stock_history_weekly(session: Session) -> None:
    """Scheduler entrypoint for weekly period history collection."""
    _run_scheduled_history_task(session, period="weekly")


@SchedulerTask(
    id="akshare_stock_history_monthly_0100",
    name="Stock history monthly sync",
    cron="0 1 1 * *",
    description="Monthly day-1 01:00 task: collect HFQ monthly history for active stocks",
)
def scheduled_stock_history_monthly(session: Session) -> None:
    """Scheduler entrypoint for monthly period history collection."""
    _run_scheduled_history_task(session, period="monthly")


@SchedulerTask(
    id="akshare_shanghai_a_daily_1700",
    name="Shanghai A fund flow update",
    cron="0 17 * * *",
    description="Daily 17:00 task: refresh market and stock-level fund flow data",
)
def scheduled_shanghai_a_daily(session: Session) -> None:
    """Scheduler entrypoint for the Shanghai A fund flow pipeline."""
    run_shanghai_a_daily_pipeline(session)


@SchedulerTask(
    id="akshare_company_news_hourly",
    name="Company news update",
    cron="0 * * * *",
    description="Hourly task: refresh company news data",
)
def scheduled_company_news_hourly(session: Session) -> None:
    """Scheduler entrypoint for the company news pipeline."""
    ShanghaiAService.refresh_company_news(session, fetch_company_news)
