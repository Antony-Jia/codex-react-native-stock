import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Calendar,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  List,
  message,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import apiClient from '../../api/client';
import type {
  ShanghaiAStock,
  ShanghaiAStockHistory,
  ShanghaiAStockHistoryCollectRequest,
} from '../../types/api';

const { RangePicker } = DatePicker;
const { Text } = Typography;

type PeriodType = 'daily' | 'weekly' | 'monthly';

const PERIOD_OPTIONS: { label: string; value: PeriodType }[] = [
  { label: '日线', value: 'daily' },
  { label: '周线', value: 'weekly' },
  { label: '月线', value: 'monthly' },
];

const getDefaultRange = (period: PeriodType): [Dayjs, Dayjs] => {
  const yesterday = dayjs().subtract(1, 'day').endOf('day');
  if (period === 'daily') {
    return [yesterday.subtract(6, 'day').startOf('day'), yesterday];
  }
  if (period === 'weekly') {
    return [yesterday.subtract(12, 'week').startOf('day'), yesterday];
  }
  return [yesterday.subtract(18, 'month').startOf('day'), yesterday];
};

const disableFutureDate = (current: Dayjs) =>
  !!current && current > dayjs().subtract(1, 'day').endOf('day');

const floatFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface HistoryFilters {
  period: PeriodType;
  range: [Dayjs, Dayjs];
}

const StockHistoryTab: React.FC = () => {
  const [stocks, setStocks] = useState<ShanghaiAStock[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string>();
  const [filters, setFilters] = useState<HistoryFilters>(() => ({
    period: 'daily',
    range: getDefaultRange('daily'),
  }));
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<ShanghaiAStockHistory[]>([]);
  const [calendarDates, setCalendarDates] = useState<Set<string>>(new Set());
  const [collecting, setCollecting] = useState(false);
  const [form] = Form.useForm<ShanghaiAStockHistoryCollectRequest & { dateRange: [Dayjs, Dayjs] }>();

  const filteredStocks = useMemo(() => {
    if (!stockSearch) {
      return stocks;
    }
    const keyword = stockSearch.trim().toLowerCase();
    return stocks.filter(
      (item) =>
        item.code.toLowerCase().includes(keyword) ||
        (item.name && item.name.toLowerCase().includes(keyword))
    );
  }, [stockSearch, stocks]);

  const loadStocks = async () => {
    setLoadingStocks(true);
    try {
      const data = await apiClient.getShanghaiAStocks({ is_active: true });
      setStocks(data);
      if (!selectedCode && data.length > 0) {
        setSelectedCode(data[0].code);
      }
    } catch (error) {
      console.error('Failed to load stock list:', error);
      message.error('加载采集股票列表失败');
    } finally {
      setLoadingStocks(false);
    }
  };

  const loadHistory = async (code: string, currentFilters: HistoryFilters) => {
    const [rangeStart, rangeEnd] = currentFilters.range;
    if (!rangeStart || !rangeEnd) {
      return;
    }
    setHistoryLoading(true);
    try {
      const [historyRows, calendarResponse] = await Promise.all([
        apiClient.getShanghaiAStockHistories(code, {
          period: currentFilters.period,
          start_date: rangeStart.format('YYYY-MM-DD'),
          end_date: rangeEnd.format('YYYY-MM-DD'),
          adjust: 'hfq',
          limit: 500,
        }),
        apiClient.getShanghaiAStockHistoryCalendar(code, {
          period: currentFilters.period,
          start_date: rangeStart.format('YYYY-MM-DD'),
          end_date: rangeEnd.format('YYYY-MM-DD'),
          adjust: 'hfq',
        }),
      ]);
      setHistoryData(historyRows);
      setCalendarDates(
        new Set(
          (calendarResponse?.dates_with_data || []).map((date) =>
            dayjs(date).format('YYYY-MM-DD')
          )
        )
      );
    } catch (error) {
      console.error('Failed to load stock history:', error);
      message.error('加载历史行情数据失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCode) {
      return;
    }
    loadHistory(selectedCode, filters);
  }, [selectedCode, filters]);

  const handleSelectStock = (code: string) => {
    setSelectedCode(code);
  };

  const handlePeriodChange = (nextPeriod: PeriodType) => {
    const nextRange = getDefaultRange(nextPeriod);
    setFilters({
      period: nextPeriod,
      range: nextRange,
    });
  };

  const handleRangeChange = (values: [Dayjs | null, Dayjs | null] | null) => {
    if (!values || !values[0] || !values[1]) {
      return;
    }
    setFilters((prev) => ({
      ...prev,
      range: [values[0], values[1]],
    }));
  };

  const handleRefresh = () => {
    if (selectedCode) {
      loadHistory(selectedCode, filters);
    }
  };

  const handleCollect = async (values: {
    stock_codes?: string[];
    period: PeriodType;
    dateRange: [Dayjs, Dayjs];
    adjust?: string;
  }) => {
    const [start, end] = values.dateRange;
    const payload: ShanghaiAStockHistoryCollectRequest = {
      start_date: start.format('YYYY-MM-DD'),
      end_date: end.format('YYYY-MM-DD'),
      period: values.period,
      stock_codes: values.stock_codes && values.stock_codes.length > 0 ? values.stock_codes : undefined,
      adjust: values.adjust ?? 'hfq',
    };
    setCollecting(true);
    try {
      const response = await apiClient.collectShanghaiAStockHistories(payload);
      message.success(response.message);
      // Refresh current view if the selected stock is included
      if (
        selectedCode &&
        (!payload.stock_codes || payload.stock_codes.includes(selectedCode))
      ) {
        loadHistory(selectedCode, filters);
      }
    } catch (error: any) {
      console.error('Manual history collection failed:', error);
      const detail = error?.response?.data?.detail;
      message.error(typeof detail === 'string' ? detail : '手动采集失败');
    } finally {
      setCollecting(false);
    }
  };

  const columns: ColumnsType<ShanghaiAStockHistory> = [
    {
      title: '日期',
      dataIndex: 'trade_date',
      key: 'trade_date',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD'),
      width: 120,
    },
    {
      title: '开盘',
      dataIndex: 'open',
      key: 'open',
      render: (value?: number) => (value != null ? floatFormatter.format(value) : '-'),
      width: 100,
    },
    {
      title: '收盘',
      dataIndex: 'close',
      key: 'close',
      render: (value?: number) => (value != null ? floatFormatter.format(value) : '-'),
      width: 100,
    },
    {
      title: '最高',
      dataIndex: 'high',
      key: 'high',
      render: (value?: number) => (value != null ? floatFormatter.format(value) : '-'),
      width: 100,
    },
    {
      title: '最低',
      dataIndex: 'low',
      key: 'low',
      render: (value?: number) => (value != null ? floatFormatter.format(value) : '-'),
      width: 100,
    },
    {
      title: '成交量(手)',
      dataIndex: 'volume',
      key: 'volume',
      render: (value?: number) => (value != null ? value.toLocaleString('zh-CN') : '-'),
      width: 140,
    },
    {
      title: '成交额(元)',
      dataIndex: 'amount',
      key: 'amount',
      render: (value?: number) =>
        value != null ? floatFormatter.format(value) : '-',
      width: 140,
    },
    {
      title: '振幅',
      dataIndex: 'amplitude',
      key: 'amplitude',
      render: (value?: number) =>
        value != null ? `${percentFormatter.format(value)}%` : '-',
      width: 100,
    },
    {
      title: '涨跌幅',
      dataIndex: 'pct_change',
      key: 'pct_change',
      render: (value?: number) =>
        value != null ? `${percentFormatter.format(value)}%` : '-',
      width: 100,
    },
    {
      title: '涨跌额',
      dataIndex: 'change_amount',
      key: 'change_amount',
      render: (value?: number) => (value != null ? floatFormatter.format(value) : '-'),
      width: 120,
    },
    {
      title: '换手率',
      dataIndex: 'turnover_rate',
      key: 'turnover_rate',
      render: (value?: number) =>
        value != null ? `${percentFormatter.format(value)}%` : '-',
      width: 100,
    },
  ];

  const tableData = useMemo(
    () =>
      historyData.map((item) => ({
        ...item,
        key: `${item.trade_date}-${item.period}`,
      })),
    [historyData]
  );

  const calendarValue = filters.range[1];
  const rangeStart = filters.range[0];
  const rangeEnd = filters.range[1];

  const dateCellRender = (value: Dayjs) => {
    if (value.month() !== calendarValue.month()) {
      return <div>{value.date()}</div>;
    }
    if (value.isBefore(rangeStart, 'day') || value.isAfter(rangeEnd, 'day')) {
      return <div>{value.date()}</div>;
    }
    const hasData = calendarDates.has(value.format('YYYY-MM-DD'));
    const style: React.CSSProperties = {
      backgroundColor: hasData ? '#e6f7ff' : '#fff1f0',
      borderRadius: 4,
      textAlign: 'center',
      padding: 2,
    };
    return <div style={style}>{value.date()}</div>;
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8} lg={6}>
        <Card
          title="采集股票列表"
          extra={
            <Input.Search
              placeholder="按代码或名称搜索"
              allowClear
              size="small"
              onSearch={setStockSearch}
            />
          }
          bodyStyle={{ padding: 0 }}
        >
          <List
            loading={loadingStocks}
            dataSource={filteredStocks}
            style={{ maxHeight: 480, overflowY: 'auto' }}
            renderItem={(item) => {
              const isActive = item.code === selectedCode;
              return (
                <List.Item
                  onClick={() => handleSelectStock(item.code)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#e6f7ff' : undefined,
                    paddingLeft: 16,
                    paddingRight: 16,
                  }}
                >
                  <List.Item.Meta
                    title={
                      <Space split={<Text type="secondary">|</Text>}>
                        <Text strong>{item.code}</Text>
                        <Text>{item.name || '-'}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>
      </Col>
      <Col xs={24} md={16} lg={18}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card
            title={
              <Space size="middle">
                <Text strong>历史行情数据</Text>
                {selectedCode && (
                  <Text type="secondary">当前股票：{selectedCode}</Text>
                )}
              </Space>
            }
            extra={
              <Space>
                <Radio.Group
                  options={PERIOD_OPTIONS}
                  optionType="button"
                  buttonStyle="solid"
                  value={filters.period}
                  onChange={(event) => handlePeriodChange(event.target.value)}
                />
                <RangePicker
                  value={filters.range}
                  onChange={handleRangeChange}
                  allowClear={false}
                  format="YYYY-MM-DD"
                  disabledDate={disableFutureDate}
                />
                <Button onClick={handleRefresh} disabled={!selectedCode}>
                  刷新
                </Button>
              </Space>
            }
          >
            <Table
              size="small"
              rowKey="key"
              columns={columns}
              loading={historyLoading}
              dataSource={tableData}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 900 }}
            />
          </Card>

          <Card
            title="日历视图"
            extra={
              <Space size="small">
                <Space size={4} align="center">
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: '#e6f7ff',
                      border: '1px solid #91d5ff',
                      borderRadius: 2,
                    }}
                  />
                  <Text type="secondary">有数据</Text>
                </Space>
                <Space size={4} align="center">
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      backgroundColor: '#fff1f0',
                      border: '1px solid #ffa39e',
                      borderRadius: 2,
                    }}
                  />
                  <Text type="secondary">无数据</Text>
                </Space>
              </Space>
            }
          >
            <Calendar
              fullscreen={false}
              value={calendarValue}
              dateCellRender={dateCellRender}
            />
          </Card>

          <Card title="手动采集">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                period: 'daily' as PeriodType,
                adjust: 'hfq',
                dateRange: getDefaultRange('daily'),
              }}
              onFinish={(values) =>
                handleCollect({
                  stock_codes: values.stock_codes,
                  period: values.period,
                  dateRange: values.dateRange,
                  adjust: values.adjust,
                })
              }
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="采集股票列表" name="stock_codes">
                    <Select
                      mode="multiple"
                      placeholder="不选择则使用当前采集列表"
                      allowClear
                      options={stocks.map((item) => ({
                        label: `${item.code} ${item.name ?? ''}`,
                        value: item.code,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item label="采集周期" name="period" rules={[{ required: true }]}>
                    <Select
                      options={PERIOD_OPTIONS.map((item) => ({
                        label: item.label,
                        value: item.value,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item label="复权方式" name="adjust">
                    <Select
                      options={[
                        { label: '后复权 (hfq)', value: 'hfq' },
                        { label: '前复权 (qfq)', value: 'qfq' },
                        { label: '不复权', value: '' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="日期范围"
                    name="dateRange"
                    rules={[{ required: true, message: '请选择日期范围' }]}
                  >
                    <RangePicker
                      format="YYYY-MM-DD"
                      disabledDate={disableFutureDate}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={collecting}
                >
                  开始采集
                </Button>
                <Button
                  onClick={() => form.resetFields()}
                  disabled={collecting}
                >
                  重置
                </Button>
              </Space>
            </Form>
          </Card>
        </Space>
      </Col>
    </Row>
  );
};

export default StockHistoryTab;
