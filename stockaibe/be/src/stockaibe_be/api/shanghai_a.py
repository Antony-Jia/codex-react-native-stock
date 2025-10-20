"""Shanghai A-share management API endpoints."""

from __future__ import annotations

import datetime as dt
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from ..core.logging_config import get_logger
from ..core.security import get_current_active_superuser, get_current_user, get_db
from ..models import User
from ..schemas import (
    PaginatedResponse,
    ShanghaiACompanyNewsRead,
    ShanghaiAFinancialCollectRequest,
    ShanghaiAFinancialCollectResponse,
    ShanghaiAManualUpdateRequest,
    ShanghaiAManualUpdateResponse,
    ShanghaiAMarketFundFlowRead,
    ShanghaiAStockBalanceSheetRead,
    ShanghaiAStockBalanceSheetSummary,
    ShanghaiAStockCreate,
    ShanghaiAStockFundFlowRead,
    ShanghaiAStockInfoRead,
    ShanghaiAStockPerformanceRead,
    ShanghaiAStockPerformanceSummary,
    ShanghaiAStockRead,
    ShanghaiAStockUpdate,
)
from ..services import ShanghaiAService
from ..tasks.aksharetest import (
    collect_shanghai_a_financials,
    fetch_stock_individual_info,
    run_shanghai_a_daily_pipeline,
)

router = APIRouter()
logger = get_logger(__name__)


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
    return ShanghaiAService.list_stocks(db, is_active=is_active, keyword=keyword)


@router.post("/stocks", response_model=ShanghaiAStockRead, status_code=status.HTTP_201_CREATED)
def create_shanghai_a_stock(
    stock_in: ShanghaiAStockCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Create a new Shanghai A stock master record."""
    existing = ShanghaiAService.get_stock(db, stock_in.code)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock already exists")
    stock = ShanghaiAService.create_stock(db, stock_in.model_dump())
    ShanghaiAService.refresh_stock_info(db, stock.code, fetch_stock_individual_info)
    return stock


@router.put("/stocks/{code}", response_model=ShanghaiAStockRead)
def update_shanghai_a_stock(
    code: str,
    stock_in: ShanghaiAStockUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Update a Shanghai A stock master record."""
    stock = ShanghaiAService.update_stock(db, code, stock_in.model_dump(exclude_unset=True))
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    return stock


@router.delete("/stocks/{code}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shanghai_a_stock(
    code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Delete a Shanghai A stock master record if it has no related data."""
    stock = ShanghaiAService.get_stock(db, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    
    deleted = ShanghaiAService.delete_stock(db, code)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete stock with existing fund flow data",
        )
    return None


@router.get("/stocks/{code}/info", response_model=List[ShanghaiAStockInfoRead])
def get_shanghai_a_stock_info(
    code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retrieve detailed stored info for a stock."""
    stock = ShanghaiAService.get_stock(db, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    return ShanghaiAService.get_stock_info(db, code)


@router.post("/stocks/{code}/sync", response_model=ShanghaiAStockRead)
def sync_shanghai_a_stock_info(
    code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Synchronize stock info for an existing Shanghai A stock."""
    stock = ShanghaiAService.get_stock(db, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    ShanghaiAService.refresh_stock_info(db, code, fetch_stock_individual_info)
    db.refresh(stock)
    return stock


# ---------------------------------------------------------------------------
# Financial datasets
# ---------------------------------------------------------------------------


@router.get(
    "/financials/balance-sheets",
    response_model=PaginatedResponse[ShanghaiAStockBalanceSheetSummary],
)
def list_shanghai_a_balance_sheet_summary(
    report_period: Optional[str] = Query(None, description="Quarter end date (deprecated, use start_period)"),
    start_period: Optional[str] = Query(None, description="Start quarter end date"),
    end_period: Optional[str] = Query(None, description="End quarter end date"),
    announcement_date: Optional[str] = Query(None, description="Announcement date"),
    start_announcement_date: Optional[str] = Query(None, description="Announcement start date"),
    end_announcement_date: Optional[str] = Query(None, description="Announcement end date"),
    stock_code: Optional[str] = Query(None, description="Filter by stock code"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
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

    items, total = ShanghaiAService.list_balance_sheet_summary(
        db,
        start_period=target_start,
        end_period=target_end,
        announcement_date=target_announcement,
        start_announcement_date=target_announcement_start,
        end_announcement_date=target_announcement_end,
        stock_code=normalized_code,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/financials/performances",
    response_model=PaginatedResponse[ShanghaiAStockPerformanceSummary],
)
def list_shanghai_a_performance_summary(
    report_period: Optional[str] = Query(None, description="Quarter end date (deprecated, use start_period)"),
    start_period: Optional[str] = Query(None, description="Start quarter end date"),
    end_period: Optional[str] = Query(None, description="End quarter end date"),
    announcement_date: Optional[str] = Query(None, description="Announcement date"),
    start_announcement_date: Optional[str] = Query(None, description="Announcement start date"),
    end_announcement_date: Optional[str] = Query(None, description="Announcement end date"),
    stock_code: Optional[str] = Query(None, description="Filter by stock code"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
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

    items, total = ShanghaiAService.list_performance_summary(
        db,
        start_period=target_start,
        end_period=target_end,
        announcement_date=target_announcement,
        start_announcement_date=target_announcement_start,
        end_announcement_date=target_announcement_end,
        stock_code=normalized_code,
        page=page,
        page_size=page_size,
    )
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


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
    stock = ShanghaiAService.get_stock(db, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    return ShanghaiAService.list_stock_balance_sheets(db, code, limit)


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
    stock = ShanghaiAService.get_stock(db, code)
    if not stock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stock not found")
    return ShanghaiAService.list_stock_performances(db, code, limit)


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
    return ShanghaiAService.list_market_fund_flow(db, limit)


@router.get("/stock-fund-flow", response_model=List[ShanghaiAStockFundFlowRead])
def list_stock_fund_flow(
    trade_date: Optional[dt.date] = Query(None, description="If omitted, uses the latest available date"),
    stock_code: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return stock-level fund flow summary for the given date."""
    return ShanghaiAService.list_stock_fund_flow(db, trade_date, stock_code, limit)


# ---------------------------------------------------------------------------
# Company News
# ---------------------------------------------------------------------------


@router.get("/company-news", response_model=PaginatedResponse[ShanghaiACompanyNewsRead])
def list_company_news(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return company news with pagination."""
    items, total = ShanghaiAService.list_company_news(db, page=page, page_size=page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/company-news/collect")
def collect_company_news(
    target_date: Optional[str] = Query(None, description="Target date in YYYY-MM-DD format, defaults to today"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    """Manually trigger company news collection for a specific date."""
    from ..tasks.aksharetest import fetch_company_news
    
    parsed_date = None
    if target_date:
        try:
            parsed_date = dt.date.fromisoformat(target_date)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: {target_date}. Expected YYYY-MM-DD",
            ) from exc
    
    try:
        new_items_count = ShanghaiAService.refresh_company_news(db, fetch_company_news, parsed_date)
        actual_date = parsed_date or dt.date.today()
        return {
            "message": "Company news collection completed",
            "date": actual_date.isoformat(),
            "new_items": new_items_count,
        }
    except Exception as exc:
        logger.error("Failed to collect company news: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to collect company news: {str(exc)}",
        ) from exc


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
