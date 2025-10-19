import React from 'react';
import { Button, Card, DatePicker, Input, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { LineChartOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { RangeValue } from 'rc-picker/lib/interface';
import QuarterPicker from '../QuarterPicker';
import type { PerformanceTableRow } from './types';
import { formatAmount, formatNumber, formatQuarterLabel, formatQuarterParam } from './utils';
import { formatPercentTag } from './renders';

interface PerformanceTabProps {
  data: PerformanceTableRow[];
  loading: boolean;
  announcementRange: RangeValue<Dayjs>;
  code?: string;
  page: number;
  total: number;
  collectVisible: boolean;
  collectLoading: boolean;
  collectStart: Dayjs | null;
  collectEnd: Dayjs | null;
  onLoad: () => void;
  onSetAnnouncementRange: (range: RangeValue<Dayjs>) => void;
  onSetCode: (code?: string) => void;
  onSetPage: (page: number) => void;
  onSetCollectVisible: (visible: boolean) => void;
  onSetCollectStart: (date: Dayjs | null) => void;
  onSetCollectEnd: (date: Dayjs | null) => void;
  onCollect: (startPeriod: string, endPeriod: string) => Promise<void>;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  data,
  loading,
  announcementRange,
  code,
  page,
  total,
  collectVisible,
  collectLoading,
  collectStart,
  collectEnd,
  onLoad,
  onSetAnnouncementRange,
  onSetCode,
  onSetPage,
  onSetCollectVisible,
  onSetCollectStart,
  onSetCollectEnd,
  onCollect,
}) => {
  const columns: ColumnsType<PerformanceTableRow> = [
    {
      title: '股票名称',
      dataIndex: 'stock_name',
      width: 180,
      fixed: 'left',
      render: (_value, record) =>
        record.isGroup
          ? `${record.stock_name ?? '-'} (${record.stock_code ?? '-'})`
          : record.stock_name ?? '-',
    },
    {
      title: '股票代码',
      dataIndex: 'stock_code',
      width: 120,
      render: (value) => value ?? '-',
    },
    {
      title: '报告期',
      dataIndex: 'report_period',
      width: 120,
      render: (value) => formatQuarterLabel(value),
    },
    {
      title: '公告日期',
      dataIndex: 'announcement_date',
      width: 130,
      render: (value) => value ?? '-',
    },
    {
      title: 'EPS',
      dataIndex: 'eps',
      width: 120,
      render: (value) => formatNumber(value, 4),
    },
    {
      title: '营业收入',
      dataIndex: 'revenue',
      width: 140,
      render: (value) => formatAmount(value),
    },
    {
      title: '收入同比',
      dataIndex: 'revenue_yoy',
      width: 120,
      render: (value) => formatPercentTag(value),
    },
    {
      title: '收入环比',
      dataIndex: 'revenue_qoq',
      width: 120,
      render: (value) => formatPercentTag(value),
    },
    {
      title: '净利润',
      dataIndex: 'net_profit',
      width: 140,
      render: (value) => formatAmount(value),
    },
    {
      title: '利润同比',
      dataIndex: 'net_profit_yoy',
      width: 120,
      render: (value) => formatPercentTag(value),
    },
    {
      title: '利润环比',
      dataIndex: 'net_profit_qoq',
      width: 120,
      render: (value) => formatPercentTag(value),
    },
    {
      title: 'BPS',
      dataIndex: 'bps',
      width: 120,
      render: (value) => formatNumber(value, 4),
    },
    {
      title: 'ROE',
      dataIndex: 'roe',
      width: 120,
      render: (value) => formatPercentTag(value),
    },
    {
      title: '经营现金流/股',
      dataIndex: 'operating_cash_flow_ps',
      width: 160,
      render: (value) => formatNumber(value, 4),
    },
    {
      title: '毛利率',
      dataIndex: 'gross_margin',
      width: 120,
      render: (value) => formatPercentTag(value),
    },
    {
      title: '行业',
      dataIndex: 'industry',
      width: 140,
      render: (value) => value ?? '-',
    },
  ];

  const handleCollect = async () => {
    const startParam = formatQuarterParam(collectStart);
    const endParam = formatQuarterParam(collectEnd);
    if (!startParam) {
      message.warning('请选择起始季度');
      return;
    }
    if (collectStart && collectEnd && collectEnd.isBefore(collectStart)) {
      message.warning('结束季度不能早于起始季度');
      return;
    }
    await onCollect(startParam, endParam ?? startParam);
  };

  return (
    <Card>
      <Space
        align="start"
        wrap
        style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}
      >
        <Space wrap>
          <DatePicker.RangePicker
            value={announcementRange ?? undefined}
            onChange={(values) => onSetAnnouncementRange(values)}
            placeholder={['公告开始日期', '公告结束日期']}
            style={{ width: 320 }}
            allowClear
            format="YYYY-MM-DD"
          />
          <Input
            placeholder="股票代码"
            value={code}
            onChange={(e) => onSetCode(e.target.value || undefined)}
            style={{ width: 160 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={onLoad} loading={loading}>
            查询
          </Button>
        </Space>
        <Space wrap align="center" style={{ justifyContent: 'flex-end' }}>
          {collectVisible && (
            <>
              <QuarterPicker
                value={collectStart}
                onChange={onSetCollectStart}
                placeholder="起始季度"
                style={{ width: 180 }}
              />
              <QuarterPicker
                value={collectEnd}
                onChange={onSetCollectEnd}
                placeholder="结束季度（可选）"
                style={{ width: 180 }}
              />
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleCollect}
                loading={collectLoading}
              >
                执行采集
              </Button>
              <Typography.Text type="secondary" style={{ maxWidth: 220 }}>
                注意：此操作将拉取所有股票的业绩快报数据
              </Typography.Text>
            </>
          )}
          <Button
            icon={<PlusOutlined />}
            type={collectVisible ? 'primary' : 'default'}
            onClick={() => onSetCollectVisible(!collectVisible)}
          >
            {collectVisible ? '收起采集' : '开始采集'}
          </Button>
        </Space>
      </Space>
      <Table<PerformanceTableRow>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(record) => record.key}
        pagination={{
          current: page,
          pageSize: 20,
          total: total,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 个股票`,
          onChange: (page) => onSetPage(page),
        }}
        expandable={{ expandRowByClick: true }}
        scroll={{ x: 1800 }}
      />
    </Card>
  );
};

export default PerformanceTab;
