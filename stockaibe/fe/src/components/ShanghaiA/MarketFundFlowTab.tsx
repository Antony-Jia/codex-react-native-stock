import React from 'react';
import { Button, Card, DatePicker, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarChartOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { ShanghaiAMarketFundFlow } from '../../types/api';
import { formatNumber, formatAmount } from './utils';
import { formatPercentTag } from './renders';

interface MarketFundFlowTabProps {
  data: ShanghaiAMarketFundFlow[];
  loading: boolean;
  manualUpdateDate: Dayjs | null;
  manualUpdateLoading: boolean;
  onLoad: () => void;
  onSetManualUpdateDate: (date: Dayjs | null) => void;
  onManualUpdate: () => void;
}

const MarketFundFlowTab: React.FC<MarketFundFlowTabProps> = ({
  data,
  loading,
  manualUpdateDate,
  manualUpdateLoading,
  onLoad,
  onSetManualUpdateDate,
  onManualUpdate,
}) => {
  const columns: ColumnsType<ShanghaiAMarketFundFlow> = [
    { title: '日期', dataIndex: 'trade_date', width: 120 },
    {
      title: '上证收盘',
      dataIndex: 'shanghai_close',
      width: 120,
      render: (value?: number) => formatNumber(value, 2),
    },
    {
      title: '上证涨跌幅',
      dataIndex: 'shanghai_pct_change',
      width: 140,
      render: (value?: number) => formatPercentTag(value),
    },
    {
      title: '深证收盘',
      dataIndex: 'shenzhen_close',
      width: 120,
      render: (value?: number) => formatNumber(value, 2),
    },
    {
      title: '深证涨跌幅',
      dataIndex: 'shenzhen_pct_change',
      width: 140,
      render: (value?: number) => formatPercentTag(value),
    },
    {
      title: '主力净流入',
      dataIndex: 'main_net_inflow',
      width: 160,
      render: (value?: number) => formatAmount(value),
    },
    {
      title: '主力净占比',
      dataIndex: 'main_net_ratio',
      width: 140,
      render: (value?: number) => formatPercentTag(value),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker
          value={manualUpdateDate}
          onChange={onSetManualUpdateDate}
          placeholder="选择更新日期（默认今日）"
        />
        <Button
          icon={<PlayCircleOutlined />}
          type="primary"
          onClick={onManualUpdate}
          loading={manualUpdateLoading}
        >
          手动触发更新
        </Button>
        <Button icon={<ReloadOutlined />} onClick={onLoad} loading={loading}>
          刷新数据
        </Button>
      </Space>
      <Table<ShanghaiAMarketFundFlow>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(record) => record.trade_date}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1000 }}
      />
    </Card>
  );
};

export default MarketFundFlowTab;
