import React, { useEffect, useState } from 'react';
import {
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Typography,
  message,
  DatePicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  BarChartOutlined, 
  DatabaseOutlined, 
  FileTextOutlined,
  FundOutlined, 
  LineChartOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

type RangeValue<T> = [T | null, T | null] | null;

import { apiClient } from '../api/client';
import {
  StocksTab,
  MarketFundFlowTab,
  StockFundFlowTab,
  BalanceSheetTab,
  PerformanceTab,
  CompanyNewsTab,
  type StockFormValues,
} from '../components/ShanghaiA';
import type {
  ShanghaiACompanyNews,
  ShanghaiAManualUpdateResponse,
  ShanghaiAMarketFundFlow,
  ShanghaiAStock,
  ShanghaiAStockBalanceSheetSummary,
  ShanghaiAStockCreate,
  ShanghaiAStockFundFlow,
  ShanghaiAStockInfo,
  ShanghaiAStockPerformanceSummary,
} from '../types/api';

const { Title } = Typography;

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

  // Fund flow state - Market
  const [marketFundFlowLoading, setMarketFundFlowLoading] = useState(false);
  const [marketFundFlow, setMarketFundFlow] = useState<ShanghaiAMarketFundFlow[]>([]);
  
  // Fund flow state - Stock
  const [stockFundFlowLoading, setStockFundFlowLoading] = useState(false);
  const [stockFundFlow, setStockFundFlow] = useState<ShanghaiAStockFundFlow[]>([]);
  const [stockFundFlowDate, setStockFundFlowDate] = useState<Dayjs | null>(null);
  const [stockFundFlowCode, setStockFundFlowCode] = useState<string>();

  // Balance sheet state
  const [balanceSheetLoading, setBalanceSheetLoading] = useState(false);
  const [balanceSheets, setBalanceSheets] = useState<ShanghaiAStockBalanceSheetSummary[]>([]);
  const [balanceAnnouncementRange, setBalanceAnnouncementRange] = useState<RangeValue<Dayjs>>(null);
  const [balanceSheetCode, setBalanceSheetCode] = useState<string>();
  const [balanceSheetPage, setBalanceSheetPage] = useState(1);
  const [balanceSheetTotal, setBalanceSheetTotal] = useState(0);

  // Performance state
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performances, setPerformances] = useState<ShanghaiAStockPerformanceSummary[]>([]);
  const [performanceAnnouncementRange, setPerformanceAnnouncementRange] = useState<RangeValue<Dayjs>>(null);
  const [performanceCode, setPerformanceCode] = useState<string>();
  const [performancePage, setPerformancePage] = useState(1);
  const [performanceTotal, setPerformanceTotal] = useState(0);

  // Company news state
  const [companyNewsLoading, setCompanyNewsLoading] = useState(false);
  const [companyNews, setCompanyNews] = useState<ShanghaiACompanyNews[]>([]);
  const [companyNewsPage, setCompanyNewsPage] = useState(1);
  const [companyNewsTotal, setCompanyNewsTotal] = useState(0);

  // Financial collect state
  const [balanceCollectVisible, setBalanceCollectVisible] = useState(false);
  const [performanceCollectVisible, setPerformanceCollectVisible] = useState(false);
  const [balanceCollectLoading, setBalanceCollectLoading] = useState(false);
  const [performanceCollectLoading, setPerformanceCollectLoading] = useState(false);
  const [balanceCollectStart, setBalanceCollectStart] = useState<Dayjs | null>(null);
  const [balanceCollectEnd, setBalanceCollectEnd] = useState<Dayjs | null>(null);
  const [performanceCollectStart, setPerformanceCollectStart] = useState<Dayjs | null>(null);
  const [performanceCollectEnd, setPerformanceCollectEnd] = useState<Dayjs | null>(null);

  // Manual update state
  const [manualUpdateLoading, setManualUpdateLoading] = useState(false);
  const [manualUpdateDate, setManualUpdateDate] = useState<Dayjs | null>(null);

  const [syncingCodes, setSyncingCodes] = useState<string[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailStock, setDetailStock] = useState<ShanghaiAStock | null>(null);
  const [detailInfo, setDetailInfo] = useState<ShanghaiAStockInfo[]>([]);

  // Info columns for detail modal
  const infoColumns: ColumnsType<ShanghaiAStockInfo> = [
    { title: '信息项', dataIndex: 'info_key', width: 200 },
    { title: '数值', dataIndex: 'info_value', render: (value?: string) => value || '-' },
  ];

  // Data loading functions
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

  const loadMarketFundFlow = async () => {
    setMarketFundFlowLoading(true);
    try {
      const market = await apiClient.getShanghaiAMarketFundFlow(30);
      setMarketFundFlow(market);
    } catch (error) {
      console.error('Failed to load market fund flow:', error);
      message.error('加载市场资金流向失败');
    } finally {
      setMarketFundFlowLoading(false);
    }
  };

  const loadStockFundFlow = async () => {
    setStockFundFlowLoading(true);
    try {
      const params: { trade_date?: string; stock_code?: string; limit?: number } = { limit: 200 };
      if (stockFundFlowDate) {
        params.trade_date = stockFundFlowDate.format('YYYY-MM-DD');
      }
      if (stockFundFlowCode) {
        params.stock_code = stockFundFlowCode;
      }
      const stockFlow = await apiClient.getShanghaiAStockFundFlow(params);
      setStockFundFlow(stockFlow);
    } catch (error) {
      console.error('Failed to load stock fund flow:', error);
      message.error('加载个股资金流向失败');
    } finally {
      setStockFundFlowLoading(false);
    }
  };

  const loadBalanceSheets = async () => {
    setBalanceSheetLoading(true);
    const announcementStart = balanceAnnouncementRange?.[0] ?? null;
    const announcementEnd = balanceAnnouncementRange?.[1] ?? null;
    if (announcementStart && announcementEnd && announcementEnd.isBefore(announcementStart)) {
      message.warning('结束日期不能早于开始日期');
      setBalanceSheetLoading(false);
      return;
    }
    try {
      const params: {
        start_announcement_date?: string;
        end_announcement_date?: string;
        stock_code?: string;
        page?: number;
        page_size?: number;
      } = {
        page: balanceSheetPage,
        page_size: 20,
      };
      if (announcementStart) {
        params.start_announcement_date = announcementStart.format('YYYY-MM-DD');
      }
      if (announcementEnd) {
        params.end_announcement_date = announcementEnd.format('YYYY-MM-DD');
      }
      if (balanceSheetCode) {
        const normalized = balanceSheetCode.trim();
        if (normalized) {
          params.stock_code = normalized;
        }
      }
      const response = await apiClient.getShanghaiABalanceSheetSummary(params);
      setBalanceSheets(response.items);
      setBalanceSheetTotal(response.total);
    } catch (error) {
      console.error('Failed to load balance sheets:', error);
      message.error('加载资产负债表失败');
    } finally {
      setBalanceSheetLoading(false);
    }
  };

  const loadPerformances = async () => {
    setPerformanceLoading(true);
    const announcementStart = performanceAnnouncementRange?.[0] ?? null;
    const announcementEnd = performanceAnnouncementRange?.[1] ?? null;
    if (announcementStart && announcementEnd && announcementEnd.isBefore(announcementStart)) {
      message.warning('结束日期不能早于开始日期');
      setPerformanceLoading(false);
      return;
    }
    try {
      const params: {
        start_announcement_date?: string;
        end_announcement_date?: string;
        stock_code?: string;
        page?: number;
        page_size?: number;
      } = {
        page: performancePage,
        page_size: 20,
      };
      if (announcementStart) {
        params.start_announcement_date = announcementStart.format('YYYY-MM-DD');
      }
      if (announcementEnd) {
        params.end_announcement_date = announcementEnd.format('YYYY-MM-DD');
      }
      if (performanceCode) {
        const normalized = performanceCode.trim();
        if (normalized) {
          params.stock_code = normalized;
        }
      }
      const response = await apiClient.getShanghaiAPerformanceSummary(params);
      setPerformances(response.items);
      setPerformanceTotal(response.total);
    } catch (error) {
      console.error('Failed to load performances:', error);
      message.error('加载业绩快报失败');
    } finally {
      setPerformanceLoading(false);
    }
  };

  const loadCompanyNews = async () => {
    setCompanyNewsLoading(true);
    try {
      const response = await apiClient.getCompanyNews({
        page: companyNewsPage,
        page_size: 20,
      });
      setCompanyNews(response.items);
      setCompanyNewsTotal(response.total);
    } catch (error) {
      console.error('Failed to load company news:', error);
      message.error('加载公司动态失败');
    } finally {
      setCompanyNewsLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    if (activeTab === 'stocks') {
      void loadStocks();
    } else if (activeTab === 'marketFundFlow') {
      void loadMarketFundFlow();
    } else if (activeTab === 'stockFundFlow') {
      void loadStockFundFlow();
    } else if (activeTab === 'balanceSheet') {
      void loadBalanceSheets();
    } else if (activeTab === 'performance') {
      void loadPerformances();
    } else if (activeTab === 'companyNews') {
      void loadCompanyNews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'stocks') {
      void loadStocks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive, stockKeyword]);

  useEffect(() => {
    if (activeTab === 'balanceSheet') {
      void loadBalanceSheets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceSheetPage]);

  useEffect(() => {
    if (activeTab === 'performance') {
      void loadPerformances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performancePage]);

  useEffect(() => {
    if (activeTab === 'companyNews') {
      void loadCompanyNews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyNewsPage]);

  // Event handlers
  const handleViewDetails = async (stock: ShanghaiAStock) => {
    setDetailStock(stock);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const info = await apiClient.getShanghaiAStockInfo(stock.code);
      setDetailInfo(info);
    } catch (error) {
      console.error('Failed to load stock info:', error);
      message.error('加载股票详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSyncStock = async (stock: ShanghaiAStock) => {
    setSyncingCodes((prev) => [...prev, stock.code]);
    try {
      await apiClient.syncShanghaiAStockInfo(stock.code);
      message.success(`同步 ${stock.name} 信息成功`);
      if (detailStock?.code === stock.code) {
        const info = await apiClient.getShanghaiAStockInfo(stock.code);
        setDetailInfo(info);
      }
    } catch (error) {
      console.error('Failed to sync stock info:', error);
      message.error('同步股票信息失败');
    } finally {
      setSyncingCodes((prev) => prev.filter((c) => c !== stock.code));
    }
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
      const tradeDate = manualUpdateDate ? manualUpdateDate.format('YYYY-MM-DD') : undefined;
      const result: ShanghaiAManualUpdateResponse = await apiClient.manualUpdateShanghaiA({
        trade_date: tradeDate,
      });
      message.success(`手动更新成功: ${JSON.stringify(result.summary)}`);
      await Promise.all([loadMarketFundFlow(), loadStockFundFlow()]);
    } catch (error) {
      console.error('Manual update failed:', error);
      message.error('手动更新失败');
    } finally {
      setManualUpdateLoading(false);
    }
  };

  const handleBalanceSheetCollect = async (startPeriod: string, endPeriod: string) => {
    setBalanceCollectLoading(true);
    try {
      await apiClient.collectShanghaiAFinancials({
        data_type: 'balance_sheet',
        start_period: startPeriod,
        end_period: endPeriod,
      });
      message.success('资产负债表采集成功');
      await loadBalanceSheets();
    } catch (error) {
      console.error('Failed to collect balance sheets:', error);
      message.error('资产负债表采集失败');
    } finally {
      setBalanceCollectLoading(false);
    }
  };

  const handlePerformanceCollect = async (startPeriod: string, endPeriod: string) => {
    setPerformanceCollectLoading(true);
    try {
      await apiClient.collectShanghaiAFinancials({
        data_type: 'performance',
        start_period: startPeriod,
        end_period: endPeriod,
      });
      message.success('业绩快报采集成功');
      await loadPerformances();
    } catch (error) {
      console.error('Failed to collect performances:', error);
      message.error('业绩快报采集失败');
    } finally {
      setPerformanceCollectLoading(false);
    }
  };

  // Transform data for tree tables
  const balanceSheetTreeData = balanceSheets.reduce((acc, item) => {
    const existing = acc.find((g) => g.stock_code === item.stock_code);
    if (existing) {
      existing.children!.push({ ...item, key: `${item.stock_code}-${item.report_period}` });
    } else {
      // 父节点使用第一条数据的所有字段，并标记为分组
      acc.push({
        ...item,
        key: item.stock_code,
        isGroup: true,
        children: [{ ...item, key: `${item.stock_code}-${item.report_period}` }],
      });
    }
    return acc;
  }, [] as any[]);

  const performanceTreeData = performances.reduce((acc, item) => {
    const existing = acc.find((g) => g.stock_code === item.stock_code);
    if (existing) {
      existing.children!.push({ ...item, key: `${item.stock_code}-${item.report_period}` });
    } else {
      // 父节点使用第一条数据的所有字段，并标记为分组
      acc.push({
        ...item,
        key: item.stock_code,
        isGroup: true,
        children: [{ ...item, key: `${item.stock_code}-${item.report_period}` }],
      });
    }
    return acc;
  }, [] as any[]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ margin: 0 }}>
        沪A股数据中心
      </Title>

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
            <StocksTab
              stocks={stocks}
              loading={stockLoading}
              onlyActive={onlyActive}
              keyword={stockKeyword}
              syncingCodes={syncingCodes}
              onLoad={loadStocks}
              onSetOnlyActive={setOnlyActive}
              onSetKeyword={setStockKeyword}
              onViewDetails={handleViewDetails}
              onSync={handleSyncStock}
              onEdit={handleEditStock}
              onOpenCreate={handleOpenCreateModal}
            />
          ),
        },
        {
          key: 'marketFundFlow',
          label: (
            <span>
              <BarChartOutlined />
              市场资金概览
            </span>
          ),
          children: (
            <MarketFundFlowTab
              data={marketFundFlow}
              loading={marketFundFlowLoading}
              manualUpdateDate={manualUpdateDate}
              manualUpdateLoading={manualUpdateLoading}
              onLoad={loadMarketFundFlow}
              onSetManualUpdateDate={setManualUpdateDate}
              onManualUpdate={handleManualUpdate}
            />
          ),
        },
        {
          key: 'stockFundFlow',
          label: (
            <span>
              <FundOutlined />
              个股资金明细
            </span>
          ),
          children: (
            <StockFundFlowTab
              data={stockFundFlow}
              loading={stockFundFlowLoading}
              date={stockFundFlowDate}
              code={stockFundFlowCode}
              manualUpdateDate={manualUpdateDate}
              manualUpdateLoading={manualUpdateLoading}
              onLoad={loadStockFundFlow}
              onSetDate={setStockFundFlowDate}
              onSetCode={setStockFundFlowCode}
              onSetManualUpdateDate={setManualUpdateDate}
              onManualUpdate={handleManualUpdate}
            />
          ),
        },
        {
          key: 'balanceSheet',
          label: (
            <span>
              <FileTextOutlined />
              资产负债表
            </span>
          ),
          children: (
            <BalanceSheetTab
              data={balanceSheetTreeData}
              loading={balanceSheetLoading}
              announcementRange={balanceAnnouncementRange}
              code={balanceSheetCode}
              page={balanceSheetPage}
              total={balanceSheetTotal}
              collectVisible={balanceCollectVisible}
              collectLoading={balanceCollectLoading}
              collectStart={balanceCollectStart}
              collectEnd={balanceCollectEnd}
              onLoad={loadBalanceSheets}
              onSetAnnouncementRange={setBalanceAnnouncementRange}
              onSetCode={setBalanceSheetCode}
              onSetPage={setBalanceSheetPage}
              onSetCollectVisible={setBalanceCollectVisible}
              onSetCollectStart={setBalanceCollectStart}
              onSetCollectEnd={setBalanceCollectEnd}
              onCollect={handleBalanceSheetCollect}
            />
          ),
        },
        {
          key: 'performance',
          label: (
            <span>
              <LineChartOutlined />
              业绩快报
            </span>
          ),
          children: (
            <PerformanceTab
              data={performanceTreeData}
              loading={performanceLoading}
              announcementRange={performanceAnnouncementRange}
              code={performanceCode}
              page={performancePage}
              total={performanceTotal}
              collectVisible={performanceCollectVisible}
              collectLoading={performanceCollectLoading}
              collectStart={performanceCollectStart}
              collectEnd={performanceCollectEnd}
              onLoad={loadPerformances}
              onSetAnnouncementRange={setPerformanceAnnouncementRange}
              onSetCode={setPerformanceCode}
              onSetPage={setPerformancePage}
              onSetCollectVisible={setPerformanceCollectVisible}
              onSetCollectStart={setPerformanceCollectStart}
              onSetCollectEnd={setPerformanceCollectEnd}
              onCollect={handlePerformanceCollect}
            />
          ),
        },
        {
          key: 'companyNews',
          label: (
            <span>
              <NotificationOutlined />
              公司动态
            </span>
          ),
          children: (
            <CompanyNewsTab
              data={companyNews}
              loading={companyNewsLoading}
              page={companyNewsPage}
              total={companyNewsTotal}
              onLoad={loadCompanyNews}
              onSetPage={setCompanyNewsPage}
            />
          ),
        },
      ]} />

      {/* Stock Detail Modal */}
      <Modal
        title={`股票详情 - ${detailStock?.name ?? ''}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {detailStock && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="代码">{detailStock.code}</Descriptions.Item>
              <Descriptions.Item label="名称">{detailStock.name}</Descriptions.Item>
              <Descriptions.Item label="简称">{detailStock.short_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="行业">{detailStock.industry || '-'}</Descriptions.Item>
              <Descriptions.Item label="上市日期">{detailStock.listing_date || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {detailStock.is_active ? '启用' : '停用'}
              </Descriptions.Item>
            </Descriptions>
            <Table<ShanghaiAStockInfo>
              columns={infoColumns}
              dataSource={detailInfo}
              loading={detailLoading}
              rowKey="info_key"
              pagination={false}
              size="small"
              scroll={{ y: 400 }}
            />
          </>
        )}
      </Modal>

      {/* Stock Edit/Create Modal */}
      <Modal
        title={editingStock ? '编辑股票' : '新建股票'}
        open={showStockModal}
        onOk={handleSubmitStock}
        onCancel={() => setShowStockModal(false)}
      >
        <Form form={stockForm} layout="vertical">
          {!editingStock && (
            <Form.Item
              name="code"
              label="股票代码"
              rules={[{ required: true, message: '请输入股票代码' }]}
            >
              <Input placeholder="例如: 600000" />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label="股票名称"
            rules={[{ required: true, message: '请输入股票名称' }]}
          >
            <Input placeholder="例如: 浦发银行" />
          </Form.Item>
          <Form.Item name="short_name" label="股票简称">
            <Input placeholder="例如: 浦发银行" />
          </Form.Item>
          <Form.Item name="industry" label="所属行业">
            <Input placeholder="例如: 银行" />
          </Form.Item>
          <Form.Item name="listing_date" label="上市日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用" valuePropName="checked" initialValue={true}>
            <Input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default ShanghaiA;
