# 股票AI应用接口规划（草案）

## 1. 市场总览（Market Overview）

- **GET `/api/market/index-snapshot`**  
  返回上证指数、上证50、科创50等基准指数的实时点位、涨跌幅与成交额。

- **GET `/api/market/capital-flow`**  
  提供主板、科创板、北向资金、两融余额等资金流向与净流入统计。

- **GET `/api/market/hot-sectors`**  
  拉取热点板块、龙头个股及资金热度信息，可附带热力值或排名。

- **GET `/api/market/top-movers`**  
  返回红盘领涨个股列表，包含涨幅、价格、驱动事件等提示。

- **GET `/api/market/intraday-comments`**  
  提供AI生成的盘面速递、风险提示等文字要点。

## 2. 个股分析（Stock Analysis）

- **GET `/api/stocks/favorites`**  
  根据用户自选列表返回个股概览：最新价、涨跌幅、主题标签、AI信号摘要。

- **GET `/api/stocks/{code}/kline`**  
  返回指定股票的K线数据（开、高、低、收、成交量），支持时间周期参数。

- **GET `/api/stocks/{code}/indicators`**  
  提供均线、MACD、量能等技术指标的最新计算结果。

- **GET `/api/stocks/{code}/insights`**  
  拉取AI风控提示、关键支撑压力位、仓位建议等文本策略。

- **GET `/api/stocks/{code}/news`**  
  关联最新资讯、公告或研报摘要，并标注时间与来源。

## 3. 智能问答（AI Q&A）

- **POST `/api/qa/query`**  
  入参包含对话上下文、用户问题或自然语言需求，返回AI生成的多模态答复内容（文本、图片、图表、资讯列表）。

- **GET `/api/qa/suggestions`**  
  返回热门问题模板或提示词，用于输入框联想。

- **POST `/api/qa/feedback`**  
  用户对回答进行点赞、踩或补充说明，为模型调优提供反馈。

- **GET `/api/qa/assets/chart`**  
  根据查询参数返回折线图、热力图等可视化数据（以图表配置或图像形式输出）。

## 4. 个人中心（Profile）

- **GET `/api/profile/overview`**  
  返回会员权益、策略偏好、风险等级等用户画像信息。

- **GET `/api/profile/performance`**  
  输出收益表现、命中率、回撤控制等关键指标。

- **GET `/api/profile/allocation`**  
  提供主题仓位建议和AI资产配置推荐。

- **GET `/api/profile/alerts`**  
  列出所有提醒项及当前开关状态。

- **PATCH `/api/profile/alerts/{alertId}`**  
  用户更新提醒配置，如开启或关闭短信、推送等渠道。

## 5. 基础支撑服务

- **GET `/api/meta/trading-calendar`**  
  返回交易日历与节假日安排，为策略和问答提供时效校验。

- **GET `/api/meta/config`**  
  输出主题色、提示语等全局配置，便于保持中国风格一致性。

- **WebSocket `/ws/market-stream`**  
  推送实时行情与资金流数据，支持市场总览与个股分析场景的秒级刷新。

> 以上接口为首阶段功能规划，可基于真实数据源或假数据模拟实现，后续可逐步对接行情、资讯、因子分析等服务。
