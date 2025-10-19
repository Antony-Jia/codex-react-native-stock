import React from 'react';
import { Button, Card, DatePicker, Input, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileTextOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';

type RangeValue<T> = [T | null, T | null] | null;

import QuarterPicker from '../QuarterPicker';
import type { BalanceSheetTableRow } from './types';
import { formatAmount, formatDateParam, formatQuarterLabel, formatQuarterParam } from './utils';
import { formatPercentTag } from './renders';

interface BalanceSheetTabProps {
  data: BalanceSheetTableRow[];
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

const BalanceSheetTab: React.FC<BalanceSheetTabProps> = ({
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
  const columns: ColumnsType<BalanceSheetTableRow> = [
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
      title: '货币资金',
      dataIndex: 'currency_funds',
      width: 120,
      render: (value) => formatAmount(value),
    },
    {
      title: '应收账款',
      dataIndex: 'accounts_receivable',
      width: 120,
      render: (value) => formatAmount(value),
    },
    {
      title: '存货',
      dataIndex: 'inventory',
      width: 120,
      render: (value) => formatAmount(value),
    },
    {
      title: '总资产',
      dataIndex: 'total_assets',
      width: 140,
      render: (value) => formatAmount(value),
    },
    {
      title: '资产同比',
      dataIndex: 'total_assets_yoy',
      width: 120,
      render: (value) => formatPercentTag(value),
    },
    {
      title: '应付账款',
      dataIndex: 'accounts_payable',
      width: 120,
      render: (value) => formatAmount(value),
    },
    {
      title: '预收款项',
      dataIndex: 'advance_receipts',
      width: 120,
      render: (value) => formatAmount(value),
    },
    {
      title: '总负债',
      dataIndex: 'total_liabilities',
      width: 140,
      render: (value) => formatAmount(value),
    },
    {
      title: '负债同比',
      dataIndex: 'total_liabilities_yoy',
      width: 120,
      render: (value) => formatPercentTag(value),
    },
    {
      title: '资产负债率',
      dataIndex: 'debt_to_asset_ratio',
      width: 130,
      render: (value) => formatPercentTag(value),
    },
    {
      title: '所有者权益',
      dataIndex: 'total_equity',
      width: 140,
      render: (value) => formatAmount(value),
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
                注意：此操作将拉取所有股票的资产负债表数据
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
      <Table<BalanceSheetTableRow>
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

export default BalanceSheetTab;
