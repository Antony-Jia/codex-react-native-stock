import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BarChartOutlined, DatabaseOutlined, FundOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

import apiClient from '../api/client';
import type {
  ShanghaiAManualUpdateResponse,
  ShanghaiAMarketFundFlow,
  ShanghaiAStock,
  ShanghaiAStockCreate,
  ShanghaiAStockFundFlow,
  ShanghaiAStockInfo,
  ShanghaiAStockUpdate,
} from '../types/api';

const { Title } = Typography;

type StockFormValues = ShanghaiAStockCreate & { listing_date?: Dayjs; is_active?: boolean };

const ShanghaiA: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('stocks');

  // Stock list state
  const [stockLoading, setStockLoading] = useState(false);
  const [stocks, setStocks] = useState<ShanghaiAStock[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingStock, setEditingStock] = useState<ShanghaiAStock | null>(null);
  const [stockForm] = Form.useForm<StockFormValues>();
  const [stockKeyword, setStockKeyword] = useState<string>();
  const [onlyActive, setOnlyActive] = useState<boolean>(true);

  // Fund flow state
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [manualUpdateLoading, setManualUpdateLoading] = useState(false);
  const [fundFlowLoading, setFundFlowLoading] = useState(false);
  const [marketFundFlow, setMarketFundFlow] = useState<ShanghaiAMarketFundFlow[]>([]);
  const [stockFundFlow, setStockFundFlow] = useState<ShanghaiAStockFundFlow[]>([]);

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStock, setDetailStock] = useState<ShanghaiAStock | null>(null);
  const [detailInfo, setDetailInfo] = useState<ShanghaiAStockInfo[]>([]);
  const [detailTab, setDetailTab] = useState<string>('basic');

  const formatNumber = (value?: number, digits: number = 2) =>
    value === null || value === undefined ? '-' : value.toFixed(digits);

  const formatPercentTag = (value?: number) => {
    if (value === null || value === undefined) {
      return '-';
    }
    const color = value >= 0 ? 'success' : 'error';
    return <Tag color={color}>{`${value.toFixed(2)}%`}</Tag>;
  };

  const formatAmount = (value?: number) => {
    if (value === null || value === undefined) return '-';
    if (Math.abs(value) >= 1e8) {
      return `${(value / 1e8).toFixed(2)} 亿`;
    }
    if (Math.abs(value) >= 1e4) {
      return `${(value / 1e4).toFixed(2)} 万`;
    }
    return value.toFixed(2);
  };

  const loadStocks = async () => {
    setStockLoading(true);
    try {
      const data = await apiClient.getShanghaiAStocks({
        is_active: onlyActive ? true : undefined,
        keyword: stockKeyword,
      });
      setStocks(data);
    } catch (error) {
      console.error('Failed to load Shanghai A stocks:', error);
      message.error('加载沪A股票列表失败');
    } finally {
      setStockLoading(false);
    }
  };

  const loadFundFlow = async () => {
    setFundFlowLoading(true);
    try {
      const [market, stockFlow] = await Promise.all([
        apiClient.getShanghaiAMarketFundFlow(30),
        apiClient.getShanghaiAStockFundFlow({ limit: 200 }),
      ]);
      setMarketFundFlow(market);
      setStockFundFlow(stockFlow);
    } catch (error) {
      console.error('Failed to load fund flow data:', error);
      message.error('加载资金流向数据失败');
    } finally {
      setFundFlowLoading(false);
    }
  };

  useEffect(() => {
    loadFundFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive, stockKeyword]);

  const handleViewDetails = async (stock: ShanghaiAStock) => {
    setDetailStock(stock);
    setDetailVisible(true);
    setDetailTab('basic');
    setDetailInfo([]);
    setDetailLoading(true);
    try {
      const info = await apiClient.getShanghaiAStockInfo(stock.code);
      setDetailInfo(info);
    } catch (error) {
      console.error('Failed to load stock info:', error);
      message.error('加载股票信息失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDetailClose = () => {
    setDetailVisible(false);
    setDetailStock(null);
    setDetailInfo([]);
    setDetailTab('basic');
  };

  const handleOpenCreateModal = () => {
    setEditingStock(null);
    stockForm.resetFields();
    setShowStockModal(true);
  };

  const handleEditStock = (stock: ShanghaiAStock) => {
    setEditingStock(stock);
    stockForm.setFieldsValue({
      ...stock,
      listing_date: stock.listing_date ? dayjs(stock.listing_date) : undefined,
    });
    setShowStockModal(true);
  };

  const handleSubmitStock = async () => {
    try {
      const values = await stockForm.validateFields();
      const payloadBase = {
        ...values,
        listing_date: values.listing_date ? values.listing_date.format('YYYY-MM-DD') : undefined,
      };
      if (editingStock) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { code: _ignored, ...updatePayload } = payloadBase;
        await apiClient.updateShanghaiAStock(editingStock.code, updatePayload);
        message.success('更新沪A股票成功');
      } else {
        await apiClient.createShanghaiAStock(payloadBase as ShanghaiAStockCreate);
        message.success('创建沪A股票成功');
      }
      setShowStockModal(false);
      loadStocks();
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
      }
    }
  };

  const handleManualUpdate = async () => {
    try {
      setManualUpdateLoading(true);
      const tradeDate = selectedDate ? selectedDate.format('YYYY-MM-DD') : undefined;
      const result: ShanghaiAManualUpdateResponse = await apiClient.manualUpdateShanghaiA({
        trade_date: tradeDate,
      });
      message.success(`手动更新成功: ${JSON.stringify(result.summary)}`);
      await loadFundFlow();
    } catch (error) {
      console.error('Manual update failed:', error);
      message.error('手动更新失败');
    } finally {
      setManualUpdateLoading(false);
    }
  };

  const stockColumns: ColumnsType<ShanghaiAStock> = useMemo(
    () => [
      { title: '代码', dataIndex: 'code', width: 100 },
      { title: '名称', dataIndex: 'name', width: 160 },
      {
        title: '简称',
        dataIndex: 'short_name',
        width: 120,
        render: (value) => value || '-',
      },
      {
        title: '行业',
        dataIndex: 'industry',
        width: 140,
        render: (value) => value || '-',
      },
      {
        title: '上市日期',
        dataIndex: 'listing_date',
        width: 140,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '启用',
        dataIndex: 'is_active',
        width: 80,
        render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        render: (_, record) => (
          <Space>
            <Button size="small" onClick={() => handleViewDetails(record)}>
              查看详细
            </Button>
            <Button size="small" onClick={() => handleEditStock(record)}>
              编辑
            </Button>
          </Space>
        ),
      },
    ],
    []
  );

  const marketFlowColumns: ColumnsType<ShanghaiAMarketFundFlow> = [
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

  const infoColumns: ColumnsType<ShanghaiAStockInfo> = [
    { title: '信息项', dataIndex: 'info_key', width: 200 },
    { title: '数值', dataIndex: 'info_value', render: (value?: string) => value || '-' },
  ];

  const stockFlowColumns: ColumnsType<ShanghaiAStockFundFlow> = [
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
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>
          沪A股数据中心
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void Promise.all([loadStocks(), loadFundFlow()]);
            }}
          >
            全部刷新
          </Button>
        </Space>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'stocks',
          label: (
            <span>
              <DatabaseOutlined />
              股票档案
            </span>
          ),
          children: (
            <Card>
              <Space style={{ marginBottom: 16 }} wrap>
                <Input.Search
                  placeholder="按代码或名称搜索"
                  allowClear
                  onSearch={(value) => setStockKeyword(value || undefined)}
                  style={{ width: 220 }}
                />
                <Switch
                  checked={onlyActive}
                  onChange={(checked) => setOnlyActive(checked)}
                  checkedChildren="仅启用"
                  unCheckedChildren="全部"
                />
                <Button icon={<ReloadOutlined />} onClick={() => void loadStocks()} loading={stockLoading}>
                  刷新
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
                  新建股票
                </Button>
              </Space>
              <Table<ShanghaiAStock>
                columns={stockColumns}
                dataSource={stocks}
                loading={stockLoading}
                rowKey="code"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 800 }}
              />
            </Card>
          ),
        },
        {
          key: 'fundFlow',
          label: (
            <span>
              <FundOutlined />
              资金流向
            </span>
          ),
          children: (
            <Card>
              <Space style={{ marginBottom: 16 }} wrap>
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  placeholder="选择更新日期（默认今日）"
                />
                <Button icon={<ReloadOutlined />} onClick={loadFundFlow} loading={fundFlowLoading}>
                  刷新资金流向
                </Button>
                <Button
                  icon={<PlayCircleOutlined />}
                  type="primary"
                  onClick={handleManualUpdate}
                  loading={manualUpdateLoading}
                >
                  手动触发资金更新
                </Button>
              </Space>
              <Row gutter={16}>
                <Col xs={24} lg={10}>
                  <Card
                    title={
                      <Space>
                        <BarChartOutlined />
                        市场资金流向
                      </Space>
                    }
                    size="small"
                  >
                    <Table<ShanghaiAMarketFundFlow>
                      columns={marketFlowColumns}
                      dataSource={marketFundFlow}
                      loading={fundFlowLoading}
                      rowKey={(record) => record.trade_date}
                      size="small"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 700 }}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={14}>
                  <Card
                    title={
                      <Space>
                        <FundOutlined />
                        个股资金流向排名
                      </Space>
                    }
                    size="small"
                  >
                    <Table<ShanghaiAStockFundFlow>
                      columns={stockFlowColumns}
                      dataSource={stockFundFlow}
                      loading={fundFlowLoading}
                      rowKey={(record) => `${record.trade_date}-${record.stock_code}`}
                      size="small"
                      pagination={{ pageSize: 20 }}
                      scroll={{ x: 900 }}
                    />
                  </Card>
                </Col>
              </Row>
            </Card>
          ),
        },
      ]} />

      <Modal
        open={detailVisible}
        title={
          detailStock ? `查看 ${detailStock.name} (${detailStock.code})` : '查看详情'
        }
        onCancel={handleDetailClose}
        footer={null}
        width={720}
      >
        <Tabs
          activeKey={detailTab}
          onChange={setDetailTab}
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="股票代码">
                    {detailStock?.code ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="股票名称">
                    {detailStock?.name ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="股票简称">
                    {detailStock?.short_name ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="所属行业">
                    {detailStock?.industry ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="交易所">
                    {detailStock?.exchange ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="上市日期">
                    {detailStock?.listing_date ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="启用状态">
                    {detailStock ? (detailStock.is_active ? '启用' : '停用') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {detailStock?.created_at ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {detailStock?.updated_at ?? '-'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'info',
              label: '股票信息',
              children: (
                <Table<ShanghaiAStockInfo>
                  columns={infoColumns}
                  dataSource={detailInfo}
                  loading={detailLoading}
                  pagination={false}
                  rowKey={(record) => record.info_key}
                  size="small"
                  locale={{ emptyText: detailLoading ? '加载中...' : '暂无数据' }}
                />
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        open={showStockModal}
        title={editingStock ? `编辑 ${editingStock.code}` : '新建沪A股票'}
        onCancel={() => setShowStockModal(false)}
        onOk={handleSubmitStock}
        destroyOnClose
      >
        <Form<StockFormValues> layout="vertical" form={stockForm} initialValues={{ exchange: 'SH', is_active: true }}>
          <Form.Item
            label="股票代码"
            name="code"
            rules={[{ required: true, message: '请输入股票代码' }]}
          >
            <Input placeholder="例如 600000" disabled={Boolean(editingStock)} />
          </Form.Item>
          <Form.Item
            label="股票名称"
            name="name"
            rules={[{ required: true, message: '请输入股票名称' }]}
          >
            <Input placeholder="股票名称" />
          </Form.Item>
          <Form.Item label="简称" name="short_name">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="所属行业" name="industry">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item label="交易所" name="exchange">
            <Input placeholder="默认为 SH" />
          </Form.Item>
          <Form.Item label="上市日期" name="listing_date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="启用状态" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default ShanghaiA;
