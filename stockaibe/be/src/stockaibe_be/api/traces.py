"""Request trace logging API endpoints."""

from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select, delete, func, case

from ..core.security import get_current_user, get_db
from ..models import TraceLog, User
from ..schemas import TraceRead, FuncStatsRead

router = APIRouter()


@router.get("", response_model=List[TraceRead])
def traces(limit: int = 50, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Get recent trace logs."""
    statement = select(TraceLog).order_by(TraceLog.created_at.desc()).limit(limit)
    items = db.exec(statement).all()
    return items


@router.delete("/all")
def delete_all_traces(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Delete all trace logs."""
    statement = delete(TraceLog)
    result = db.exec(statement)
    db.commit()
    return {"message": f"已删除 {result.rowcount} 条记录", "deleted_count": result.rowcount}


@router.delete("/old")
def delete_old_traces(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Delete trace logs older than today."""
    # Get start of today in local time
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    statement = delete(TraceLog).where(TraceLog.created_at < today_start)
    result = db.exec(statement)
    db.commit()
    return {"message": f"已删除今天之前的 {result.rowcount} 条记录", "deleted_count": result.rowcount}


@router.get("/func-stats", response_model=List[FuncStatsRead])
def get_func_stats(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """获取每个限流函数的调用统计。
    
    按 func_id 分组统计：
    - 总调用次数
    - 成功次数（200）
    - 失败次数（500）
    - 被限流次数（429）
    - 平均延迟
    - 最后调用时间
    """
    # 使用原生 SQL 进行分组统计
    statement = select(
        TraceLog.func_id,
        TraceLog.func_name,
        TraceLog.quota_id,
        func.count(TraceLog.id).label("total_calls"),
        func.sum(case((TraceLog.status_code == 200, 1), else_=0)).label("success_calls"),
        func.sum(case((TraceLog.status_code == 500, 1), else_=0)).label("failed_calls"),
        func.sum(case((TraceLog.status_code == 429, 1), else_=0)).label("limited_calls"),
        func.avg(TraceLog.latency_ms).label("avg_latency_ms"),
        func.max(TraceLog.created_at).label("last_call_at"),
    ).where(
        TraceLog.func_id.isnot(None)  # 只统计有 func_id 的记录（限流函数）
    ).group_by(
        TraceLog.func_id, TraceLog.func_name, TraceLog.quota_id
    ).order_by(
        func.count(TraceLog.id).desc()  # 按调用次数降序
    )
    
    results = db.exec(statement).all()
    
    # 转换为 schema 格式
    stats = []
    for row in results:
        stats.append(FuncStatsRead(
            func_id=row[0],
            func_name=row[1],
            quota_id=row[2],
            total_calls=row[3] or 0,
            success_calls=row[4] or 0,
            failed_calls=row[5] or 0,
            limited_calls=row[6] or 0,
            avg_latency_ms=row[7],
            last_call_at=row[8],
        ))
    
    return stats
