import React from 'react';
import { Button, Card, Descriptions, Form, Input, Space, Spin, Statistic, Table, Typography, message } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ShanghaiAStockBidAskItem } from '../../types/api';

const { Title, Text } = Typography;

interface BidAskTabProps {
  loading: boolean;
  symbol: string;
  data: ShanghaiAStockBidAskItem[];
  onSetSymbol: (symbol: string) => void;
  onLoad: () => void;
}

export const BidAskTab: React.FC<BidAskTabProps> = ({
  loading,
  symbol,
  data,
  onSetSymbol,
  onLoad,
}) => {
  const [form] = Form.useForm();

  const handleSearch = () => {
    const values = form.getFieldsValue();
    if (!values.symbol || !values.symbol.trim()) {
      message.warning('请输入股票代码');
      return;
    }
    onSetSymbol(values.symbol.trim());
    onLoad();
  };

  // 分类数据
  const sellData = data.filter(item => item.item.startsWith('sell_'));
  const buyData = data.filter(item => item.item.startsWith('buy_'));
  const summaryData = data.filter(item => !item.item.startsWith('sell_') && !item.item.startsWith('buy_'));

  // 格式化显示名称
  const formatItemName = (item: string): string => {
    const nameMap: Record<string, string> = {
      'sell_5': '卖五', 'sell_5_vol': '卖五量',
      'sell_4': '卖四', 'sell_4_vol': '卖四量',
      'sell_3': '卖三', 'sell_3_vol': '卖三量',
      'sell_2': '卖二', 'sell_2_vol': '卖二量',
      'sell_1': '卖一', 'sell_1_vol': '卖一量',
      'buy_1': '买一', 'buy_1_vol': '买一量',
      'buy_2': '买二', 'buy_2_vol': '买二量',
      'buy_3': '买三', 'buy_3_vol': '买三量',
      'buy_4': '买四', 'buy_4_vol': '买四量',
      'buy_5': '买五', 'buy_5_vol': '买五量',
      '最新': '最新价', '均价': '均价', '涨幅': '涨幅(%)', '涨跌': '涨跌',
      '总手': '总手', '金额': '成交额', '换手': '换手率(%)', '量比': '量比',
      '最高': '最高', '最低': '最低', '今开': '今开', '昨收': '昨收',
      '涨停': '涨停', '跌停': '跌停', '外盘': '外盘', '内盘': '内盘',
    };
    return nameMap[item] || item;
  };

  // 格式化数值
  const formatValue = (item: string, value?: number): string => {
    if (value === undefined || value === null) return '-';
    
    // 成交额需要特殊处理（单位：元）
    if (item === '金额') {
      if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
      if (value >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
      return value.toFixed(2);
    }
    
    // 量相关的数据
    if (item.includes('vol') || item === '总手' || item === '外盘' || item === '内盘') {
      if (value >= 1e8) return `${(value / 1e8).toFixed(2)}亿`;
      if (value >= 1e4) return `${(value / 1e4).toFixed(2)}万`;
      return value.toFixed(0);
    }
    
    return value.toFixed(2);
  };

  // 获取涨跌颜色
  const getPriceColor = (item: string, value?: number): string => {
    if (value === undefined || value === null) return '';
    if (item === '涨幅' || item === '涨跌') {
      if (value > 0) return '#cf1322';
      if (value < 0) return '#3f8600';
    }
    return '';
  };

  const columns: ColumnsType<ShanghaiAStockBidAskItem> = [
    {
      title: '项目',
      dataIndex: 'item',
      width: 120,
      render: (item: string) => <Text strong>{formatItemName(item)}</Text>,
    },
    {
      title: '数值',
      dataIndex: 'value',
      align: 'right',
      render: (value: number | undefined, record) => {
        const color = getPriceColor(record.item, value);
        return (
          <Text style={{ color: color || undefined, fontWeight: color ? 'bold' : 'normal' }}>
            {formatValue(record.item, value)}
          </Text>
        );
      },
    },
  ];

  // 提取关键指标
  const getKeyMetric = (itemName: string): number | undefined => {
    const item = data.find(d => d.item === itemName);
    return item?.value;
  };

  const latestPrice = getKeyMetric('最新');
  const pctChange = getKeyMetric('涨幅');
  const priceChange = getKeyMetric('涨跌');

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Form form={form} layout="inline" onFinish={handleSearch}>
            <Form.Item name="symbol" label="股票代码" initialValue={symbol}>
              <Input
                placeholder="例如: 000001"
                style={{ width: 200 }}
                onPressEnter={handleSearch}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
              >
                查询
              </Button>
            </Form.Item>
            <Form.Item>
              <Button
                icon={<ReloadOutlined />}
                onClick={onLoad}
                loading={loading}
                disabled={!symbol}
              >
                刷新
              </Button>
            </Form.Item>
          </Form>

          {symbol && data.length > 0 && (
            <Card size="small" style={{ background: '#fafafa' }}>
              <Space size="large">
                <Statistic
                  title="最新价"
                  value={latestPrice}
                  precision={2}
                  valueStyle={{ color: pctChange && pctChange > 0 ? '#cf1322' : pctChange && pctChange < 0 ? '#3f8600' : undefined }}
                />
                <Statistic
                  title="涨跌"
                  value={priceChange}
                  precision={2}
                  prefix={priceChange && priceChange > 0 ? '+' : ''}
                  valueStyle={{ color: priceChange && priceChange > 0 ? '#cf1322' : priceChange && priceChange < 0 ? '#3f8600' : undefined }}
                />
                <Statistic
                  title="涨跌幅"
                  value={pctChange}
                  precision={2}
                  suffix="%"
                  prefix={pctChange && pctChange > 0 ? '+' : ''}
                  valueStyle={{ color: pctChange && pctChange > 0 ? '#cf1322' : pctChange && pctChange < 0 ? '#3f8600' : undefined }}
                />
              </Space>
            </Card>
          )}
        </Space>
      </Card>

      {loading && !data.length ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>加载中...</div>
          </div>
        </Card>
      ) : data.length > 0 ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card title={<Title level={5} style={{ margin: 0 }}>卖盘</Title>} size="small">
            <Table
              columns={columns}
              dataSource={sellData}
              rowKey="item"
              pagination={false}
              size="small"
              showHeader={false}
            />
          </Card>

          <Card title={<Title level={5} style={{ margin: 0 }}>买盘</Title>} size="small">
            <Table
              columns={columns}
              dataSource={buyData}
              rowKey="item"
              pagination={false}
              size="small"
              showHeader={false}
            />
          </Card>

          <Card title={<Title level={5} style={{ margin: 0 }}>行情概要</Title>} size="small">
            <Descriptions bordered size="small" column={4}>
              {summaryData.map(item => (
                <Descriptions.Item
                  key={item.item}
                  label={formatItemName(item.item)}
                  span={1}
                >
                  <Text style={{ color: getPriceColor(item.item, item.value) || undefined }}>
                    {formatValue(item.item, item.value)}
                  </Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Space>
      ) : symbol ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            暂无数据，请输入股票代码并点击查询
          </div>
        </Card>
      ) : null}
    </Space>
  );
};
