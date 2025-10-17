-- 为 TraceLog 表添加函数追踪字段
-- 用于记录是哪个限流函数（LimitTask/LimitCallTask）发起的调用

ALTER TABLE traces ADD COLUMN func_id VARCHAR(100);
ALTER TABLE traces ADD COLUMN func_name VARCHAR(100);

-- 为 func_id 添加索引以提高查询性能
CREATE INDEX idx_traces_func_id ON traces(func_id);

-- 查看修改结果
-- SELECT * FROM traces LIMIT 5;
