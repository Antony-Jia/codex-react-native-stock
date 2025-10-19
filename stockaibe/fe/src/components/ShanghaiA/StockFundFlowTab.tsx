import React from 'react';
import { Button, Card, DatePicker, Input, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FundOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { ShanghaiAStockFundFlow } from '../../types/api';
import { formatAmount } from './utils';
import { formatPercentTag } from './renders';

interface StockFundFlowTabProps {
  data: ShanghaiAStockFundFlow[];
  loading: boolean;
  date: Dayjs | null;
  code?: string;
  manualUpdateDate: Dayjs | null;
  manualUpdateLoading: boolean;
  onLoad: () => void;
  onSetDate: (date: Dayjs | null) => void;
  onSetCode: (code?: string) => void;
  onSetManualUpdateDate: (date: Dayjs | null) => void;
  onManualUpdate: () => void;
}

const StockFundFlowTab: React.FC<StockFundFlowTabProps> = ({
  data,
  loading,
  date,
  code,
  manualUpdateDate,
  manualUpdateLoading,
  onLoad,
  onSetDate,
  onSetCode,
  onSetManualUpdateDate,
  onManualUpdate,
}) => {
  const columns: ColumnsType<ShanghaiAStockFundFlow> = [
    { title: '代码', dataIndex: 'stock_code', width: 100 },
    { title: '名称', dataIndex: 'stock_name', width: 160, render: (value) => value || '-' },
    { title: '净流入', dataIndex: 'net_inflow', width: 140, render: (value?: number) => formatAmount(value) },
    { title: '流入', dataIndex: 'inflow', width: 140, render: (value?: number) => formatAmount(value) },
    { title: '流出', dataIndex: 'outflow', width: 140, render: (value?: number) => formatAmount(value) },
    { title: '涨跌幅', dataIndex: 'pct_change', width: 120, render: (value?: number) => formatPercentTag(value) },
    {
      title: '换手率',
      dataIndex: 'turnover_rate',
      width: 120,
      render: (value?: number) => formatPercentTag(value),
    },
    { title: '成交额', dataIndex: 'amount', width: 140, render: (value?: number) => formatAmount(value) },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker value={date} onChange={onSetDate} placeholder="选择交易日期" />
        <Input
          placeholder="股票代码"
          value={code}
          onChange={(e) => onSetCode(e.target.value || undefined)}
          style={{ width: 150 }}
          allowClear
        />
        <Button icon={<ReloadOutlined />} onClick={onLoad} loading={loading}>
          查询
        </Button>
        <DatePicker
          value={manualUpdateDate}
          onChange={onSetManualUpdateDate}
          placeholder="更新日期（默认今日）"
        />
        <Button
          icon={<PlayCircleOutlined />}
          type="primary"
          onClick={onManualUpdate}
          loading={manualUpdateLoading}
        >
          手动触发更新
        </Button>
      </Space>
      <Table<ShanghaiAStockFundFlow>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(record) => `${record.trade_date}-${record.stock_code}`}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};

export default StockFundFlowTab;
