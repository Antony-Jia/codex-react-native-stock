"""Shanghai A-share management API endpoints."""

from __future__ import annotations

import datetime as dt
import math
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, delete, select

from ..core.logging_config import get_logger
from ..core.security import get_current_active_superuser, get_current_user, get_db
from ..models import (
    ShanghaiAMarketFundFlow,
    ShanghaiAStock,
    ShanghaiAStockBalanceSheet,
    ShanghaiAStockFundFlow,
    ShanghaiAStockInfo,
    ShanghaiAStockPerformance,
    User,
)
from ..schemas import (
    ShanghaiAManualUpdateRequest,
    ShanghaiAManualUpdateResponse,
    ShanghaiAMarketFundFlowRead,
    ShanghaiAStockCreate,
    ShanghaiAStockFundFlowRead,
    ShanghaiAStockInfoRead,
    ShanghaiAStockRead,
    ShanghaiAStockUpdate,
    ShanghaiAStockBalanceSheetRead,
    ShanghaiAStockPerformanceRead,
    ShanghaiAStockBalanceSheetSummary,
    ShanghaiAStockPerformanceSummary,
    ShanghaiAFinancialCollectRequest,
    ShanghaiAFinancialCollectResponse,
)
from ..tasks.aksharetest import (
    fetch_stock_individual_info,
    collect_shanghai_a_financials,
    run_shanghai_a_daily_pipeline,
)

router = APIRouter()
logger = get_logger(__name__)


_INFO_KEY_CANDIDATES: Tuple[str, ...] = ("item", "指标", "字段", "名称", "项目")
_VALUE_KEY_CANDIDATES: Tuple[str, ...] = ("value", "数值", "内容", "取值", "value_new")


def _normalize_info_value(value: object) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none"}:
        return None
    return text


def _parse_date_param(param_name: str, value: Optional[str]) -> Optional[dt.date]:
    """Parse a date query parameter supporting YYYY-MM-DD or YYYYMMDD formats."""
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        if len(text) == 8 and text.isdigit():
            return dt.datetime.strptime(text, "%Y%m%d").date()
        return dt.date.fromisoformat(text)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {param_name}: expected YYYY-MM-DD or YYYYMMDD format",
        ) from exc


def _extract_info_records(info_df) -> List[Tuple[str, Optional[str]]]:
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


def _refresh_stock_info(db: Session, stock_code: str) -> None:
    try:
        info_df = fetch_stock_individual_info(stock_code)
    except Exception as exc:  # pragma: no cover - AkShare runtime dependency
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
    except Exception as exc:  # pragma: no cover - database failure path
        db.rollback()
        logger.warning("Failed to persist stock info for %s: %s", stock_code, exc)


# ---------------------------------------------------------------------------
# Stock master data
# ---------------------------------------------------------------------------


@router.get("/stocks", response_model=List[ShanghaiAStockRead])
def list_shanghai_a_stocks(
    is_active: Optional[bool] = Query(None),
    keyword: Optional[str] = Query(None, description="Search by code or name"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return Shanghai A stock master records with optional filters."""
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
    stocks = db.exec(statement).all()
    return stocks


@router.post("/stocks", response_model=ShanghaiAStockRead, status_code=status.HTTP_201_CREATED)
def create_shanghai_a_stock(
    stock_in: ShanghaiAStockCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Create a new Shanghai A stock master record."""
    existing = db.get(ShanghaiAStock, stock_in.code)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock already exists")
    stock = ShanghaiAStock(**stock_in.model_dump())
    db.add(stock)
    db.commit()
    db.refresh(stock)
    _refresh_stock_info(db, stock.code)
    return stock


@router.put("/stocks/{code}", response_model=ShanghaiAStockRead)
def update_shanghai_a_stock(
    code: str,
    stock_in: ShanghaiAStockUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Update a Shanghai A stock master record."""
    stock = db.get(ShanghaiAStock, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    for key, value in stock_in.model_dump(exclude_unset=True).items():
        setattr(stock, key, value)
    db.commit()
    db.refresh(stock)
    return stock


@router.delete("/stocks/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shanghai_a_stock(
    code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Delete a Shanghai A stock master record if it has no related data."""
    stock = db.get(ShanghaiAStock, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")

    related_flow = db.exec(
        select(ShanghaiAStockFundFlow).where(ShanghaiAStockFundFlow.stock_code == code).limit(1)
    ).first()
    if related_flow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete stock with existing fund flow data",
        )

    db.exec(delete(ShanghaiAStockInfo).where(ShanghaiAStockInfo.stock_code == code))
    db.delete(stock)
    db.commit()
    return None


@router.get("/stocks/{code}/info", response_model=List[ShanghaiAStockInfoRead])
def get_shanghai_a_stock_info(
    code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retrieve detailed stored info for a stock."""
    stock = db.get(ShanghaiAStock, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    statement = (
        select(ShanghaiAStockInfo)
        .where(ShanghaiAStockInfo.stock_code == code)
        .order_by(ShanghaiAStockInfo.info_key.asc())
    )
    return list(db.exec(statement).all())


@router.post("/stocks/{code}/sync", response_model=ShanghaiAStockRead)
def sync_shanghai_a_stock_info(
    code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Synchronize stock info for an existing Shanghai A stock."""
    stock = db.get(ShanghaiAStock, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")

    _refresh_stock_info(db, code)
    db.refresh(stock)
    return stock


# ---------------------------------------------------------------------------
# Financial datasets
# ---------------------------------------------------------------------------


@router.get(
    "/financials/balance-sheets",
    response_model=List[ShanghaiAStockBalanceSheetSummary],
)
def list_shanghai_a_balance_sheet_summary(
    report_period: Optional[str] = Query(None, description="Quarter end date (deprecated, use start_period)"),
    start_period: Optional[str] = Query(None, description="Start quarter end date"),
    end_period: Optional[str] = Query(None, description="End quarter end date"),
    announcement_date: Optional[str] = Query(None, description="Announcement date"),
    start_announcement_date: Optional[str] = Query(None, description="Announcement start date"),
    end_announcement_date: Optional[str] = Query(None, description="Announcement end date"),
    stock_code: Optional[str] = Query(None, description="Filter by stock code"),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return balance sheet snapshot per stock for the given quarter or quarter range."""
    # Support both old single period and new range query
    target_start = _parse_date_param("start_period", start_period or report_period)
    target_end = _parse_date_param("end_period", end_period)
    target_announcement = _parse_date_param("announcement_date", announcement_date)
    target_announcement_start = _parse_date_param("start_announcement_date", start_announcement_date)
    target_announcement_end = _parse_date_param("end_announcement_date", end_announcement_date)

    if target_start and target_end and target_end < target_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_period must be greater than or equal to start_period",
        )

    if (
        target_announcement_start
        and target_announcement_end
        and target_announcement_end < target_announcement_start
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_announcement_date must be greater than or equal to start_announcement_date",
        )

    normalized_code = stock_code.strip() if stock_code else None

    # Step 1: Get distinct stock codes that match the criteria (apply limit to stock count)
    stock_code_statement = select(ShanghaiAStockBalanceSheet.stock_code).distinct()
    
    if target_announcement is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockBalanceSheet.announcement_date == target_announcement)
    if target_announcement_start is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockBalanceSheet.announcement_date >= target_announcement_start)
    if target_announcement_end is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockBalanceSheet.announcement_date <= target_announcement_end)
    if target_start is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockBalanceSheet.report_period >= target_start)
    if target_end is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockBalanceSheet.report_period <= target_end)
    if normalized_code:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockBalanceSheet.stock_code == normalized_code)
    
    stock_code_statement = stock_code_statement.order_by(ShanghaiAStockBalanceSheet.stock_code.asc())
    
    # Apply limit to number of stocks (not total rows)
    if not normalized_code:
        stock_code_statement = stock_code_statement.limit(limit)
    
    stock_codes = list(db.exec(stock_code_statement).all())
    
    if not stock_codes:
        return []
    
    # Step 2: Get all records for these stocks
    statement = (
        select(ShanghaiAStockBalanceSheet, ShanghaiAStock)
        .join(ShanghaiAStock, ShanghaiAStockBalanceSheet.stock_code == ShanghaiAStock.code, isouter=True)
        .where(ShanghaiAStockBalanceSheet.stock_code.in_(stock_codes))
    )
    
    # Apply the same date filters
    if target_announcement is not None:
        statement = statement.where(ShanghaiAStockBalanceSheet.announcement_date == target_announcement)
    if target_announcement_start is not None:
        statement = statement.where(ShanghaiAStockBalanceSheet.announcement_date >= target_announcement_start)
    if target_announcement_end is not None:
        statement = statement.where(ShanghaiAStockBalanceSheet.announcement_date <= target_announcement_end)
    if target_start is not None:
        statement = statement.where(ShanghaiAStockBalanceSheet.report_period >= target_start)
    if target_end is not None:
        statement = statement.where(ShanghaiAStockBalanceSheet.report_period <= target_end)
    
    statement = statement.order_by(
        ShanghaiAStockBalanceSheet.stock_code.asc(),
        ShanghaiAStockBalanceSheet.report_period.desc()
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
    return response


@router.get(
    "/financials/performances",
    response_model=List[ShanghaiAStockPerformanceSummary],
)
def list_shanghai_a_performance_summary(
    report_period: Optional[str] = Query(None, description="Quarter end date (deprecated, use start_period)"),
    start_period: Optional[str] = Query(None, description="Start quarter end date"),
    end_period: Optional[str] = Query(None, description="End quarter end date"),
    announcement_date: Optional[str] = Query(None, description="Announcement date"),
    start_announcement_date: Optional[str] = Query(None, description="Announcement start date"),
    end_announcement_date: Optional[str] = Query(None, description="Announcement end date"),
    stock_code: Optional[str] = Query(None, description="Filter by stock code"),
    limit: int = Query(500, ge=1, le=2000),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return performance snapshot per stock for the given quarter or quarter range."""
    # Support both old single period and new range query
    target_start = _parse_date_param("start_period", start_period or report_period)
    target_end = _parse_date_param("end_period", end_period)
    target_announcement = _parse_date_param("announcement_date", announcement_date)
    target_announcement_start = _parse_date_param("start_announcement_date", start_announcement_date)
    target_announcement_end = _parse_date_param("end_announcement_date", end_announcement_date)

    if target_start and target_end and target_end < target_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_period must be greater than or equal to start_period",
        )

    if (
        target_announcement_start
        and target_announcement_end
        and target_announcement_end < target_announcement_start
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="end_announcement_date must be greater than or equal to start_announcement_date",
        )

    normalized_code = stock_code.strip() if stock_code else None

    # Step 1: Get distinct stock codes that match the criteria (apply limit to stock count)
    stock_code_statement = select(ShanghaiAStockPerformance.stock_code).distinct()
    
    if target_announcement is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockPerformance.announcement_date == target_announcement)
    if target_announcement_start is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockPerformance.announcement_date >= target_announcement_start)
    if target_announcement_end is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockPerformance.announcement_date <= target_announcement_end)
    if target_start is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockPerformance.report_period >= target_start)
    if target_end is not None:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockPerformance.report_period <= target_end)
    if normalized_code:
        stock_code_statement = stock_code_statement.where(ShanghaiAStockPerformance.stock_code == normalized_code)
    
    stock_code_statement = stock_code_statement.order_by(ShanghaiAStockPerformance.stock_code.asc())
    
    # Apply limit to number of stocks (not total rows)
    if not normalized_code:
        stock_code_statement = stock_code_statement.limit(limit)
    
    stock_codes = list(db.exec(stock_code_statement).all())
    
    if not stock_codes:
        return []
    
    # Step 2: Get all records for these stocks
    statement = (
        select(ShanghaiAStockPerformance, ShanghaiAStock)
        .join(ShanghaiAStock, ShanghaiAStockPerformance.stock_code == ShanghaiAStock.code, isouter=True)
        .where(ShanghaiAStockPerformance.stock_code.in_(stock_codes))
    )
    
    # Apply the same date filters
    if target_announcement is not None:
        statement = statement.where(ShanghaiAStockPerformance.announcement_date == target_announcement)
    if target_announcement_start is not None:
        statement = statement.where(ShanghaiAStockPerformance.announcement_date >= target_announcement_start)
    if target_announcement_end is not None:
        statement = statement.where(ShanghaiAStockPerformance.announcement_date <= target_announcement_end)
    if target_start is not None:
        statement = statement.where(ShanghaiAStockPerformance.report_period >= target_start)
    if target_end is not None:
        statement = statement.where(ShanghaiAStockPerformance.report_period <= target_end)
    
    statement = statement.order_by(
        ShanghaiAStockPerformance.stock_code.asc(),
        ShanghaiAStockPerformance.report_period.desc()
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
    return response


@router.get(
    "/stocks/{code}/balance-sheets",
    response_model=List[ShanghaiAStockBalanceSheetRead],
)
def list_shanghai_a_stock_balance_sheets(
    code: str,
    limit: int = Query(12, ge=1, le=40),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return stored quarterly balance sheet rows for a stock."""
    stock = db.get(ShanghaiAStock, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    statement = (
        select(ShanghaiAStockBalanceSheet)
        .where(ShanghaiAStockBalanceSheet.stock_code == code)
        .order_by(ShanghaiAStockBalanceSheet.report_period.desc())
        .limit(limit)
    )
    return list(db.exec(statement).all())


@router.get(
    "/stocks/{code}/performances",
    response_model=List[ShanghaiAStockPerformanceRead],
)
def list_shanghai_a_stock_performances(
    code: str,
    limit: int = Query(12, ge=1, le=40),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return stored quarterly performance rows for a stock."""
    stock = db.get(ShanghaiAStock, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    statement = (
        select(ShanghaiAStockPerformance)
        .where(ShanghaiAStockPerformance.stock_code == code)
        .order_by(ShanghaiAStockPerformance.report_period.desc())
        .limit(limit)
    )
    return list(db.exec(statement).all())


@router.post(
    "/financials/collect",
    response_model=ShanghaiAFinancialCollectResponse,
)
def collect_shanghai_a_financials_endpoint(
    request: ShanghaiAFinancialCollectRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Trigger manual quarterly financial data collection for all stocks."""
    end_period = request.end_period or request.start_period
    try:
        summary = collect_shanghai_a_financials(
            db,
            request.start_period,
            end_period,
            include_balance_sheet=request.include_balance_sheet,
            include_performance=request.include_performance,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return ShanghaiAFinancialCollectResponse(
        message="Financial datasets collected successfully",
        quarters_processed=summary.get("quarters_processed", []),
        balance_sheet_rows=summary.get("balance_sheet_rows", 0),
        balance_sheet_stocks=summary.get("balance_sheet_stocks", 0),
        performance_rows=summary.get("performance_rows", 0),
        performance_stocks=summary.get("performance_stocks", 0),
    )


# ---------------------------------------------------------------------------
# Fund flow views
# ---------------------------------------------------------------------------


@router.get("/market-fund-flow", response_model=List[ShanghaiAMarketFundFlowRead])
def list_market_fund_flow(
    limit: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return market-wide fund flow rows (default: latest 30 days)."""
    statement = (
        select(ShanghaiAMarketFundFlow)
        .order_by(ShanghaiAMarketFundFlow.trade_date.desc())
        .limit(limit)
    )
    rows = db.exec(statement).all()
    return rows


@router.get("/stock-fund-flow", response_model=List[ShanghaiAStockFundFlowRead])
def list_stock_fund_flow(
    trade_date: Optional[dt.date] = Query(None, description="If omitted, uses the latest available date"),
    stock_code: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return stock-level fund flow summary for the given date."""
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
# Manual trigger
# ---------------------------------------------------------------------------


@router.post("/manual-update", response_model=ShanghaiAManualUpdateResponse)
def manual_update_shanghai_a(
    request: ShanghaiAManualUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Trigger the daily pipeline manually (optionally for a subset of stocks)."""
    try:
        summary = run_shanghai_a_daily_pipeline(
            db,
            trade_date=request.trade_date,
            stock_codes=request.stock_codes,
        )
    except Exception as exc:  # pragma: no cover - ensures HTTP response on failure
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

    return ShanghaiAManualUpdateResponse(
        message="Shanghai A fund flow pipeline executed successfully",
        summary=summary,
    )
