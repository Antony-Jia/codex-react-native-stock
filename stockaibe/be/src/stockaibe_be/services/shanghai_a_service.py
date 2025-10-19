"""Shanghai A-share data service layer."""

from __future__ import annotations

import datetime as dt
import hashlib
import math
from typing import Dict, List, Optional, Tuple

from sqlmodel import Session, delete, func, select

from ..core.logging_config import get_logger
from ..models import (
    ShanghaiACompanyNews,
    ShanghaiAMarketFundFlow,
    ShanghaiAStock,
    ShanghaiAStockBalanceSheet,
    ShanghaiAStockFundFlow,
    ShanghaiAStockInfo,
    ShanghaiAStockPerformance,
)
from ..schemas import (
    ShanghaiAStockBalanceSheetSummary,
    ShanghaiAStockFundFlowRead,
    ShanghaiAStockPerformanceSummary,
)

logger = get_logger(__name__)

_INFO_KEY_CANDIDATES: Tuple[str, ...] = ("item", "指标", "字段", "名称", "项目")
_VALUE_KEY_CANDIDATES: Tuple[str, ...] = ("value", "数值", "内容", "取值", "value_new")


def _normalize_info_value(value: object) -> Optional[str]:
    """Normalize info value to string or None."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none"}:
        return None
    return text


def _extract_info_records(info_df) -> List[Tuple[str, Optional[str]]]:
    """Extract info records from DataFrame."""
    if info_df is None or info_df.empty:
        return []

    records: List[Tuple[str, Optional[str]]] = []
    for _, row in info_df.iterrows():
        key = None
        for candidate in _INFO_KEY_CANDIDATES:
            raw_key = row.get(candidate)
            if isinstance(raw_key, str):
                candidate_key = raw_key.strip()
                if candidate_key:
                    key = candidate_key
                    break
        if not key:
            continue

        value = None
        for candidate in _VALUE_KEY_CANDIDATES:
            if candidate in row:
                value = row.get(candidate)
                break
        records.append((key[:100], _normalize_info_value(value)))
    return records


def _truncate_and_hash(text: str, max_len: int = 255) -> Tuple[str, str]:
    """Truncate text and return both truncated text and its MD5 hash."""
    truncated = text[:max_len] if len(text) > max_len else text
    md5_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    return truncated, md5_hash


class ShanghaiAService:
    """Service for Shanghai A-share data operations."""

    # ---------------------------------------------------------------------------
    # Stock master data
    # ---------------------------------------------------------------------------

    @staticmethod
    def list_stocks(
        db: Session,
        is_active: Optional[bool] = None,
        keyword: Optional[str] = None,
    ) -> List[ShanghaiAStock]:
        """List Shanghai A stocks with optional filters."""
        statement = select(ShanghaiAStock)
        if is_active is not None:
            statement = statement.where(ShanghaiAStock.is_active == is_active)
        if keyword:
            like = f"%{keyword}%"
            statement = statement.where(
                (ShanghaiAStock.code.ilike(like))
                | (ShanghaiAStock.name.ilike(like))
                | (ShanghaiAStock.short_name.ilike(like))
            )
        statement = statement.order_by(ShanghaiAStock.code)
        return list(db.exec(statement).all())

    @staticmethod
    def get_stock(db: Session, code: str) -> Optional[ShanghaiAStock]:
        """Get a stock by code."""
        return db.get(ShanghaiAStock, code)

    @staticmethod
    def create_stock(db: Session, stock_data: dict) -> ShanghaiAStock:
        """Create a new stock."""
        stock = ShanghaiAStock(**stock_data)
        db.add(stock)
        db.commit()
        db.refresh(stock)
        return stock

    @staticmethod
    def update_stock(db: Session, code: str, update_data: dict) -> Optional[ShanghaiAStock]:
        """Update a stock."""
        stock = db.get(ShanghaiAStock, code)
        if not stock:
            return None
        for key, value in update_data.items():
            setattr(stock, key, value)
        db.commit()
        db.refresh(stock)
        return stock

    @staticmethod
    def delete_stock(db: Session, code: str) -> bool:
        """Delete a stock if it has no related data. Returns True if deleted."""
        stock = db.get(ShanghaiAStock, code)
        if not stock:
            return False

        # Check for related fund flow data
        related_flow = db.exec(
            select(ShanghaiAStockFundFlow).where(ShanghaiAStockFundFlow.stock_code == code).limit(1)
        ).first()
        if related_flow:
            return False

        # Delete related info and stock
        db.exec(delete(ShanghaiAStockInfo).where(ShanghaiAStockInfo.stock_code == code))
        db.delete(stock)
        db.commit()
        return True

    @staticmethod
    def get_stock_info(db: Session, code: str) -> List[ShanghaiAStockInfo]:
        """Get detailed info for a stock."""
        statement = (
            select(ShanghaiAStockInfo)
            .where(ShanghaiAStockInfo.stock_code == code)
            .order_by(ShanghaiAStockInfo.info_key.asc())
        )
        return list(db.exec(statement).all())

    @staticmethod
    def refresh_stock_info(db: Session, stock_code: str, fetch_func) -> None:
        """Refresh stock info from external source."""
        try:
            info_df = fetch_func(stock_code)
        except Exception as exc:
            logger.warning("Failed to fetch stock info for %s: %s", stock_code, exc)
            return

        records = _extract_info_records(info_df)
        if not records:
            logger.warning("Stock info dataset empty for %s", stock_code)
            return

        try:
            db.exec(delete(ShanghaiAStockInfo).where(ShanghaiAStockInfo.stock_code == stock_code))
            for info_key, info_value in records:
                db.add(
                    ShanghaiAStockInfo(
                        stock_code=stock_code,
                        info_key=info_key,
                        info_value=info_value,
                    )
                )
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning("Failed to persist stock info for %s: %s", stock_code, exc)

    # ---------------------------------------------------------------------------
    # Financial datasets
    # ---------------------------------------------------------------------------

    @staticmethod
    def list_balance_sheet_summary(
        db: Session,
        start_period: Optional[dt.date] = None,
        end_period: Optional[dt.date] = None,
        announcement_date: Optional[dt.date] = None,
        start_announcement_date: Optional[dt.date] = None,
        end_announcement_date: Optional[dt.date] = None,
        stock_code: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ShanghaiAStockBalanceSheetSummary], int]:
        """List balance sheet summary with pagination. Returns (items, total)."""
        # Step 1: Build base query for stock codes
        stock_code_statement = select(ShanghaiAStockBalanceSheet.stock_code).distinct()

        if announcement_date is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockBalanceSheet.announcement_date == announcement_date
            )
        if start_announcement_date is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockBalanceSheet.announcement_date >= start_announcement_date
            )
        if end_announcement_date is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockBalanceSheet.announcement_date <= end_announcement_date
            )
        if start_period is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockBalanceSheet.report_period >= start_period
            )
        if end_period is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockBalanceSheet.report_period <= end_period
            )
        if stock_code:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockBalanceSheet.stock_code == stock_code
            )

        # Get total count
        total_count_statement = select(func.count()).select_from(stock_code_statement.subquery())
        total = db.exec(total_count_statement).one()

        # Apply pagination
        stock_code_statement = stock_code_statement.order_by(ShanghaiAStockBalanceSheet.stock_code.asc())
        offset = (page - 1) * page_size
        stock_code_statement = stock_code_statement.offset(offset).limit(page_size)

        stock_codes = list(db.exec(stock_code_statement).all())

        if not stock_codes:
            return [], total

        # Step 2: Get all records for these stocks
        statement = (
            select(ShanghaiAStockBalanceSheet, ShanghaiAStock)
            .join(ShanghaiAStock, ShanghaiAStockBalanceSheet.stock_code == ShanghaiAStock.code, isouter=True)
            .where(ShanghaiAStockBalanceSheet.stock_code.in_(stock_codes))
        )

        # Apply the same date filters
        if announcement_date is not None:
            statement = statement.where(ShanghaiAStockBalanceSheet.announcement_date == announcement_date)
        if start_announcement_date is not None:
            statement = statement.where(
                ShanghaiAStockBalanceSheet.announcement_date >= start_announcement_date
            )
        if end_announcement_date is not None:
            statement = statement.where(ShanghaiAStockBalanceSheet.announcement_date <= end_announcement_date)
        if start_period is not None:
            statement = statement.where(ShanghaiAStockBalanceSheet.report_period >= start_period)
        if end_period is not None:
            statement = statement.where(ShanghaiAStockBalanceSheet.report_period <= end_period)

        statement = statement.order_by(
            ShanghaiAStockBalanceSheet.stock_code.asc(),
            ShanghaiAStockBalanceSheet.report_period.desc(),
        )

        results = db.exec(statement).all()
        response: List[ShanghaiAStockBalanceSheetSummary] = []
        for sheet, stock in results:
            response.append(
                ShanghaiAStockBalanceSheetSummary(
                    stock_code=sheet.stock_code,
                    stock_name=stock.name if stock else None,
                    short_name=stock.short_name if stock else None,
                    report_period=sheet.report_period,
                    announcement_date=sheet.announcement_date,
                    currency_funds=sheet.currency_funds,
                    accounts_receivable=sheet.accounts_receivable,
                    inventory=sheet.inventory,
                    total_assets=sheet.total_assets,
                    total_assets_yoy=sheet.total_assets_yoy,
                    accounts_payable=sheet.accounts_payable,
                    advance_receipts=sheet.advance_receipts,
                    total_liabilities=sheet.total_liabilities,
                    total_liabilities_yoy=sheet.total_liabilities_yoy,
                    debt_to_asset_ratio=sheet.debt_to_asset_ratio,
                    total_equity=sheet.total_equity,
                    created_at=sheet.created_at,
                    updated_at=sheet.updated_at,
                )
            )
        return response, total

    @staticmethod
    def list_performance_summary(
        db: Session,
        start_period: Optional[dt.date] = None,
        end_period: Optional[dt.date] = None,
        announcement_date: Optional[dt.date] = None,
        start_announcement_date: Optional[dt.date] = None,
        end_announcement_date: Optional[dt.date] = None,
        stock_code: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ShanghaiAStockPerformanceSummary], int]:
        """List performance summary with pagination. Returns (items, total)."""
        # Step 1: Build base query for stock codes
        stock_code_statement = select(ShanghaiAStockPerformance.stock_code).distinct()

        if announcement_date is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockPerformance.announcement_date == announcement_date
            )
        if start_announcement_date is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockPerformance.announcement_date >= start_announcement_date
            )
        if end_announcement_date is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockPerformance.announcement_date <= end_announcement_date
            )
        if start_period is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockPerformance.report_period >= start_period
            )
        if end_period is not None:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockPerformance.report_period <= end_period
            )
        if stock_code:
            stock_code_statement = stock_code_statement.where(
                ShanghaiAStockPerformance.stock_code == stock_code
            )

        # Get total count
        total_count_statement = select(func.count()).select_from(stock_code_statement.subquery())
        total = db.exec(total_count_statement).one()

        # Apply pagination
        stock_code_statement = stock_code_statement.order_by(ShanghaiAStockPerformance.stock_code.asc())
        offset = (page - 1) * page_size
        stock_code_statement = stock_code_statement.offset(offset).limit(page_size)

        stock_codes = list(db.exec(stock_code_statement).all())

        if not stock_codes:
            return [], total

        # Step 2: Get all records for these stocks
        statement = (
            select(ShanghaiAStockPerformance, ShanghaiAStock)
            .join(ShanghaiAStock, ShanghaiAStockPerformance.stock_code == ShanghaiAStock.code, isouter=True)
            .where(ShanghaiAStockPerformance.stock_code.in_(stock_codes))
        )

        # Apply the same date filters
        if announcement_date is not None:
            statement = statement.where(ShanghaiAStockPerformance.announcement_date == announcement_date)
        if start_announcement_date is not None:
            statement = statement.where(
                ShanghaiAStockPerformance.announcement_date >= start_announcement_date
            )
        if end_announcement_date is not None:
            statement = statement.where(ShanghaiAStockPerformance.announcement_date <= end_announcement_date)
        if start_period is not None:
            statement = statement.where(ShanghaiAStockPerformance.report_period >= start_period)
        if end_period is not None:
            statement = statement.where(ShanghaiAStockPerformance.report_period <= end_period)

        statement = statement.order_by(
            ShanghaiAStockPerformance.stock_code.asc(),
            ShanghaiAStockPerformance.report_period.desc(),
        )

        results = db.exec(statement).all()
        response: List[ShanghaiAStockPerformanceSummary] = []
        for perf, stock in results:
            response.append(
                ShanghaiAStockPerformanceSummary(
                    stock_code=perf.stock_code,
                    stock_name=stock.name if stock else None,
                    short_name=stock.short_name if stock else None,
                    report_period=perf.report_period,
                    announcement_date=perf.announcement_date,
                    eps=perf.eps,
                    revenue=perf.revenue,
                    revenue_yoy=perf.revenue_yoy,
                    revenue_qoq=perf.revenue_qoq,
                    net_profit=perf.net_profit,
                    net_profit_yoy=perf.net_profit_yoy,
                    net_profit_qoq=perf.net_profit_qoq,
                    bps=perf.bps,
                    roe=perf.roe,
                    operating_cash_flow_ps=perf.operating_cash_flow_ps,
                    gross_margin=perf.gross_margin,
                    industry=perf.industry,
                    created_at=perf.created_at,
                    updated_at=perf.updated_at,
                )
            )
        return response, total

    @staticmethod
    def list_stock_balance_sheets(
        db: Session, code: str, limit: int = 12
    ) -> List[ShanghaiAStockBalanceSheet]:
        """List balance sheets for a specific stock."""
        statement = (
            select(ShanghaiAStockBalanceSheet)
            .where(ShanghaiAStockBalanceSheet.stock_code == code)
            .order_by(ShanghaiAStockBalanceSheet.report_period.desc())
            .limit(limit)
        )
        return list(db.exec(statement).all())

    @staticmethod
    def list_stock_performances(
        db: Session, code: str, limit: int = 12
    ) -> List[ShanghaiAStockPerformance]:
        """List performances for a specific stock."""
        statement = (
            select(ShanghaiAStockPerformance)
            .where(ShanghaiAStockPerformance.stock_code == code)
            .order_by(ShanghaiAStockPerformance.report_period.desc())
            .limit(limit)
        )
        return list(db.exec(statement).all())

    # ---------------------------------------------------------------------------
    # Fund flow views
    # ---------------------------------------------------------------------------

    @staticmethod
    def list_market_fund_flow(db: Session, limit: int = 30) -> List[ShanghaiAMarketFundFlow]:
        """List market-wide fund flow rows."""
        statement = (
            select(ShanghaiAMarketFundFlow)
            .order_by(ShanghaiAMarketFundFlow.trade_date.desc())
            .limit(limit)
        )
        return list(db.exec(statement).all())

    @staticmethod
    def list_stock_fund_flow(
        db: Session,
        trade_date: Optional[dt.date] = None,
        stock_code: Optional[str] = None,
        limit: int = 100,
    ) -> List[ShanghaiAStockFundFlowRead]:
        """List stock-level fund flow summary."""
        if trade_date is None:
            trade_date = db.exec(
                select(ShanghaiAStockFundFlow.trade_date)
                .order_by(ShanghaiAStockFundFlow.trade_date.desc())
                .limit(1)
            ).first()
            if trade_date is None:
                return []

        statement = (
            select(ShanghaiAStockFundFlow, ShanghaiAStock)
            .join(ShanghaiAStock, ShanghaiAStockFundFlow.stock_code == ShanghaiAStock.code)
            .where(ShanghaiAStockFundFlow.trade_date == trade_date)
        )
        if stock_code:
            statement = statement.where(ShanghaiAStockFundFlow.stock_code == stock_code)
        statement = statement.order_by(ShanghaiAStockFundFlow.net_inflow.desc()).limit(limit)

        results = db.exec(statement).all()
        response: List[ShanghaiAStockFundFlowRead] = []
        for flow, stock in results:
            response.append(
                ShanghaiAStockFundFlowRead(
                    stock_code=flow.stock_code,
                    stock_name=stock.name if stock else None,
                    trade_date=flow.trade_date,
                    latest_price=flow.latest_price,
                    pct_change=flow.pct_change,
                    turnover_rate=flow.turnover_rate,
                    inflow=flow.inflow,
                    outflow=flow.outflow,
                    net_inflow=flow.net_inflow,
                    amount=flow.amount,
                )
            )
        return response

    # ---------------------------------------------------------------------------
    # Company News
    # ---------------------------------------------------------------------------

    @staticmethod
    def refresh_company_news(db: Session, fetch_func) -> int:
        """Fetch daily company news, deduplicate, and store new items."""
        try:
            news_df = fetch_func(dt.date.today().strftime("%Y%m%d"))
            if news_df is None or news_df.empty:
                logger.info("No company news found for today.")
                return 0
        except Exception as exc:
            logger.warning("Failed to fetch company news: %s", exc)
            return 0

        new_items_count = 0
        for _, row in news_df.iterrows():
            specific_matters = row.get("具体事项", "")
            if not specific_matters:
                continue

            _, md5_hash = _truncate_and_hash(specific_matters)

            # Check if news with this hash already exists
            existing_news = db.exec(
                select(ShanghaiACompanyNews).where(ShanghaiACompanyNews.md5_hash == md5_hash)
            ).first()
            if existing_news:
                continue

            try:
                trade_date_str = row.get("交易日")
                trade_date = (
                    dt.datetime.strptime(trade_date_str, "%Y-%m-%d").date()
                    if trade_date_str
                    else dt.date.today()
                )

                news_item = ShanghaiACompanyNews(
                    code=row.get("代码", "")[:12],
                    name=row.get("简称", "")[:100],
                    event_type=row.get("事件类型", "")[:100],
                    specific_matters=specific_matters,
                    trade_date=trade_date,
                    md5_hash=md5_hash,
                )
                db.add(news_item)
                new_items_count += 1

            except Exception as exc:
                logger.warning("Failed to process news item: %s. Row: %s", exc, row.to_dict())
                db.rollback()

        if new_items_count > 0:
            db.commit()
            logger.info("Successfully added %d new company news items.", new_items_count)

        return new_items_count

    @staticmethod
    def list_company_news(
        db: Session,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ShanghaiACompanyNews], int]:
        """List company news with pagination. Returns (items, total)."""
        total_count_statement = select(func.count()).select_from(select(ShanghaiACompanyNews).subquery())
        total = db.exec(total_count_statement).one()

        statement = (
            select(ShanghaiACompanyNews)
            .order_by(ShanghaiACompanyNews.trade_date.desc(), ShanghaiACompanyNews.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list(db.exec(statement).all())
        return items, total
