"""
任务模块包

在此目录下创建任务文件，使用装饰器定义任务：

示例：
    @SchedulerTask(id="task_001", name="每日报告", cron="0 9 * * *")
    def daily_report(session: Session) -> None:
        pass
    
    @LimitTask(id="task_002", name="API调用", quota_name="api_quota")
    def api_call(session: Session) -> None:
        pass
"""
