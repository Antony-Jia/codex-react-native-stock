import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  BarChartOutlined, 
  DatabaseOutlined, 
  FileTextOutlined,
  FundOutlined, 
  LineChartOutlined,
  PlayCircleOutlined, 
  PlusOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { RangeValue } from 'rc-picker/lib/interface';

import { apiClient } from '../api/client';
import QuarterPicker from '../components/QuarterPicker';
import type {
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

type StockFormValues = ShanghaiAStockCreate & { listing_date?: Dayjs; is_active?: boolean };
type BalanceSheetTableRow = Partial<ShanghaiAStockBalanceSheetSummary> & {
  key: string;
  isGroup?: boolean;
  children?: BalanceSheetTableRow[];
};
type PerformanceTableRow = Partial<ShanghaiAStockPerformanceSummary> & {
  key: string;
  isGroup?: boolean;
  children?: PerformanceTableRow[];
};

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

  // Performance state
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performances, setPerformances] = useState<ShanghaiAStockPerformanceSummary[]>([]);
  const [performanceAnnouncementRange, setPerformanceAnnouncementRange] = useState<RangeValue<Dayjs>>(null);
  const [performanceCode, setPerformanceCode] = useState<string>();

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

  const formatQuarterLabel = (value?: string) => {
    if (!value) {
      return '-';
    }
    const normalized = value.replace(/-/g, '');
    if (normalized.length !== 8) {
      return value;
    }
    const year = normalized.slice(0, 4);
    const month = normalized.slice(4, 6);
    let quarter = '';
    if (month === '03') quarter = 'Q1';
    else if (month === '06') quarter = 'Q2';
    else if (month === '09') quarter = 'Q3';
    else if (month === '12') quarter = 'Q4';
    return quarter ? `${year} ${quarter}` : value;
  };

  const formatQuarterParam = (value: Dayjs | null) => (value ? value.format('YYYYMMDD') : undefined);
  const normalizePeriodValue = (value?: string) => (value ? value.replace(/-/g, '') : '');
  const formatDateParam = (value: Dayjs | null) => (value ? value.format('YYYY-MM-DD') : undefined);

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
        limit?: number;
      } = { limit: 100 };
      const startParam = formatDateParam(announcementStart);
      const endParam = formatDateParam(announcementEnd);
      if (startParam) {
        params.start_announcement_date = startParam;
      }
      if (endParam) {
        params.end_announcement_date = endParam;
      }
      if (balanceSheetCode) {
        const normalized = balanceSheetCode.trim();
        if (normalized) {
          params.stock_code = normalized;
        }
      }
      const data = await apiClient.getShanghaiABalanceSheetSummary(params);
      setBalanceSheets(data);
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
        limit?: number;
      } = { limit: 100 };
      const startParam = formatDateParam(announcementStart);
      const endParam = formatDateParam(announcementEnd);
      if (startParam) {
        params.start_announcement_date = startParam;
      }
      if (endParam) {
        params.end_announcement_date = endParam;
      }
      if (performanceCode) {
        const normalized = performanceCode.trim();
        if (normalized) {
          params.stock_code = normalized;
        }
      }
      const data = await apiClient.getShanghaiAPerformanceSummary(params);
      setPerformances(data);
    } catch (error) {
      console.error('Failed to load performances:', error);
      message.error('加载业绩快报失败');
    } finally {
      setPerformanceLoading(false);
    }
  };

  const balanceSheetTreeData = useMemo<BalanceSheetTableRow[]>(() => {
    if (!balanceSheets.length) {
      return [];
    }
    const grouped = new Map<string, ShanghaiAStockBalanceSheetSummary[]>();
    balanceSheets.forEach((sheet) => {
      if (!sheet.stock_code) {
        return;
      }
      const list = grouped.get(sheet.stock_code) ?? [];
      list.push(sheet);
      grouped.set(sheet.stock_code, list);
    });
    return Array.from(grouped.entries())
      .map(([code, rows]) => {
        const sorted = rows
          .slice()
          .sort((a, b) =>
            normalizePeriodValue(b.report_period).localeCompare(normalizePeriodValue(a.report_period))
          );
        const children = sorted.map((row, index) => {
          const baseKey =
            normalizePeriodValue(row.report_period) ||
            row.announcement_date ||
            row.created_at ||
            `${index}`;
          return {
            ...row,
            key: `balance-${code}-${baseKey}`,
            isGroup: false,
          };
        });
        const head = sorted[0];
        return {
          key: `balance-${code}`,
          stock_code: code,
          stock_name: head?.stock_name,
          short_name: head?.short_name,
          report_period: head?.report_period,
          announcement_date: head?.announcement_date,
          currency_funds: head?.currency_funds,
          accounts_receivable: head?.accounts_receivable,
          inventory: head?.inventory,
          total_assets: head?.total_assets,
          total_assets_yoy: head?.total_assets_yoy,
          accounts_payable: head?.accounts_payable,
          advance_receipts: head?.advance_receipts,
          total_liabilities: head?.total_liabilities,
          total_liabilities_yoy: head?.total_liabilities_yoy,
          debt_to_asset_ratio: head?.debt_to_asset_ratio,
          total_equity: head?.total_equity,
          isGroup: true,
          children,
        } as BalanceSheetTableRow;
      })
      .sort((a, b) => (a.stock_code ?? '').localeCompare(b.stock_code ?? ''));
  }, [balanceSheets]);

  const performanceTreeData = useMemo<PerformanceTableRow[]>(() => {
    if (!performances.length) {
      return [];
    }
    const grouped = new Map<string, ShanghaiAStockPerformanceSummary[]>();
    performances.forEach((perf) => {
      if (!perf.stock_code) {
        return;
      }
      const list = grouped.get(perf.stock_code) ?? [];
      list.push(perf);
      grouped.set(perf.stock_code, list);
    });
    return Array.from(grouped.entries())
      .map(([code, rows]) => {
        const sorted = rows
          .slice()
          .sort((a, b) =>
            normalizePeriodValue(b.report_period).localeCompare(normalizePeriodValue(a.report_period))
          );
        const children = sorted.map((row, index) => {
          const baseKey =
            normalizePeriodValue(row.report_period) ||
            row.announcement_date ||
            row.created_at ||
            `${index}`;
          return {
            ...row,
            key: `performance-${code}-${baseKey}`,
            isGroup: false,
          };
        });
        const head = sorted[0];
        return {
          key: `performance-${code}`,
          stock_code: code,
          stock_name: head?.stock_name,
          short_name: head?.short_name,
          industry: head?.industry,
          report_period: head?.report_period,
          announcement_date: head?.announcement_date,
          eps: head?.eps,
          revenue: head?.revenue,
          revenue_yoy: head?.revenue_yoy,
          revenue_qoq: head?.revenue_qoq,
          net_profit: head?.net_profit,
          net_profit_yoy: head?.net_profit_yoy,
          net_profit_qoq: head?.net_profit_qoq,
          bps: head?.bps,
          roe: head?.roe,
          operating_cash_flow_ps: head?.operating_cash_flow_ps,
          gross_margin: head?.gross_margin,
          isGroup: true,
          children,
        } as PerformanceTableRow;
      })
      .sort((a, b) => (a.stock_code ?? '').localeCompare(b.stock_code ?? ''));
  }, [performances]);

  useEffect(() => {
    if (activeTab === 'marketFundFlow') {
      void loadMarketFundFlow();
    } else if (activeTab === 'stockFundFlow') {
      void loadStockFundFlow();
    } else if (activeTab === 'balanceSheet') {
      void loadBalanceSheets();
    } else if (activeTab === 'performance') {
      void loadPerformances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    loadStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyActive, stockKeyword]);

  const handleViewDetails = async (stock: ShanghaiAStock) => {
    setDetailStock(stock);
    setDetailVisible(true);
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
  };

  const handleSyncStock = async (stock: ShanghaiAStock) => {
    if (syncingCodes.includes(stock.code)) {
      return;
    }
    setSyncingCodes((prev) => [...prev, stock.code]);
    try {
      const updated = await apiClient.syncShanghaiAStock(stock.code);
      setStocks((prev) =>
        prev.map((item) => (item.code === updated.code ? updated : item))
      );
      if (detailVisible && detailStock?.code === stock.code) {
        setDetailStock(updated);
        setDetailLoading(true);
        try {
          const info = await apiClient.getShanghaiAStockInfo(stock.code);
          setDetailInfo(info);
        } finally {
          setDetailLoading(false);
        }
      }
      message.success(`已同步 ${updated.name} 的股票信息`);
    } catch (error) {
      console.error('Failed to sync stock info:', error);
      message.error('同步股票信息失败');
    } finally {
      setSyncingCodes((prev) => prev.filter((code) => code !== stock.code));
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
        width: 200,
        render: (_, record) => {
          const syncing = syncingCodes.includes(record.code);
          return (
            <Space>
              <Button
                size="small"
                loading={syncing}
                onClick={() => handleSyncStock(record)}
              >
                同步信息
              </Button>
              <Button size="small" onClick={() => handleViewDetails(record)}>
                查看详细
              </Button>
              <Button size="small" onClick={() => handleEditStock(record)}>
                编辑
              </Button>
            </Space>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncingCodes]
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

  const balanceSheetColumns: ColumnsType<BalanceSheetTableRow> = [
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

  const performanceColumns: ColumnsType<PerformanceTableRow> = [
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
          key: 'marketFundFlow',
          label: (
            <span>
              <BarChartOutlined />
              市场资金概览
            </span>
          ),
          children: (
            <Card>
              <Space style={{ marginBottom: 16 }} wrap>
                <DatePicker
                  value={manualUpdateDate}
                  onChange={setManualUpdateDate}
                  placeholder="选择更新日期（默认今日）"
                />
                <Button
                  icon={<PlayCircleOutlined />}
                  type="primary"
                  onClick={handleManualUpdate}
                  loading={manualUpdateLoading}
                >
                  手动触发更新
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => void loadMarketFundFlow()} loading={marketFundFlowLoading}>
                  刷新数据
                </Button>
              </Space>
              <Table<ShanghaiAMarketFundFlow>
                columns={marketFlowColumns}
                dataSource={marketFundFlow}
                loading={marketFundFlowLoading}
                rowKey={(record) => record.trade_date}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 1000 }}
              />
            </Card>
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
            <Card>
              <Space style={{ marginBottom: 16 }} wrap>
                <DatePicker
                  value={stockFundFlowDate}
                  onChange={setStockFundFlowDate}
                  placeholder="选择交易日期"
                />
                <Input
                  placeholder="股票代码"
                  value={stockFundFlowCode}
                  onChange={(e) => setStockFundFlowCode(e.target.value || undefined)}
                  style={{ width: 150 }}
                  allowClear
                />
                <Button icon={<ReloadOutlined />} onClick={() => void loadStockFundFlow()} loading={stockFundFlowLoading}>
                  查询
                </Button>
                <DatePicker
                  value={manualUpdateDate}
                  onChange={setManualUpdateDate}
                  placeholder="更新日期（默认今日）"
                />
                <Button
                  icon={<PlayCircleOutlined />}
                  type="primary"
                  onClick={handleManualUpdate}
                  loading={manualUpdateLoading}
                >
                  手动触发更新
                </Button>
              </Space>
              <Table<ShanghaiAStockFundFlow>
                columns={stockFlowColumns}
                dataSource={stockFundFlow}
                loading={stockFundFlowLoading}
                rowKey={(record) => `${record.trade_date}-${record.stock_code}`}
                pagination={{ pageSize: 20 }}
                scroll={{ x: 1000 }}
              />
            </Card>
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
            <Card>
              <Space
                align="start"
                wrap
                style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}
              >
                <Space wrap>
                  <DatePicker.RangePicker
                    value={balanceAnnouncementRange ?? undefined}
                    onChange={(values) => setBalanceAnnouncementRange(values)}
                    placeholder={['公告开始日期', '公告结束日期']}
                    style={{ width: 320 }}
                    allowClear
                    format="YYYY-MM-DD"
                  />
                  <Input
                    placeholder="股票代码"
                    value={balanceSheetCode}
                    onChange={(e) => setBalanceSheetCode(e.target.value || undefined)}
                    style={{ width: 160 }}
                    allowClear
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => void loadBalanceSheets()}
                    loading={balanceSheetLoading}
                  >
                    查询
                  </Button>
                </Space>
                <Space wrap align="center" style={{ justifyContent: 'flex-end' }}>
                  {balanceCollectVisible && (
                    <>
                      <QuarterPicker
                        value={balanceCollectStart}
                        onChange={setBalanceCollectStart}
                        placeholder="起始季度"
                        style={{ width: 180 }}
                      />
                      <QuarterPicker
                        value={balanceCollectEnd}
                        onChange={setBalanceCollectEnd}
                        placeholder="结束季度（可选）"
                        style={{ width: 180 }}
                      />
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={async () => {
                          const startParam = formatQuarterParam(balanceCollectStart);
                          const endParam = formatQuarterParam(balanceCollectEnd);
                          if (!startParam) {
                            message.warning('请选择起始季度');
                            return;
                          }
                          if (
                            balanceCollectStart &&
                            balanceCollectEnd &&
                            balanceCollectEnd.isBefore(balanceCollectStart)
                          ) {
                            message.warning('结束季度不能早于起始季度');
                            return;
                          }
                          try {
                            setBalanceCollectLoading(true);
                            await apiClient.collectShanghaiAFinancials({
                              start_period: startParam,
                              end_period: endParam ?? startParam,
                              include_balance_sheet: true,
                              include_performance: false,
                            });
                            message.success('资产负债表数据采集已启动');
                            await loadBalanceSheets();
                          } catch (error) {
                            console.error('Balance sheet collect failed:', error);
                            message.error('资产负债表数据采集失败');
                          } finally {
                            setBalanceCollectLoading(false);
                          }
                        }}
                        loading={balanceCollectLoading}
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
                    type={balanceCollectVisible ? 'primary' : 'default'}
                    onClick={() => setBalanceCollectVisible((prev) => !prev)}
                  >
                    {balanceCollectVisible ? '收起采集' : '开始采集'}
                  </Button>
                </Space>
              </Space>
              <Table<BalanceSheetTableRow>
                columns={balanceSheetColumns}
                dataSource={balanceSheetTreeData}
                loading={balanceSheetLoading}
                rowKey={(record) => record.key}
                pagination={{ pageSize: 20 }}
                expandable={{ expandRowByClick: true }}
                scroll={{ x: 1800 }}
              />
            </Card>
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
            <Card>
              <Space
                align="start"
                wrap
                style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}
              >
                <Space wrap>
                  <DatePicker.RangePicker
                    value={performanceAnnouncementRange ?? undefined}
                    onChange={(values) => setPerformanceAnnouncementRange(values)}
                    placeholder={['公告开始日期', '公告结束日期']}
                    style={{ width: 320 }}
                    allowClear
                    format="YYYY-MM-DD"
                  />
                  <Input
                    placeholder="股票代码"
                    value={performanceCode}
                    onChange={(e) => setPerformanceCode(e.target.value || undefined)}
                    style={{ width: 160 }}
                    allowClear
                  />
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => void loadPerformances()}
                    loading={performanceLoading}
                  >
                    查询
                  </Button>
                </Space>
                <Space wrap align="center" style={{ justifyContent: 'flex-end' }}>
                  {performanceCollectVisible && (
                    <>
                      <QuarterPicker
                        value={performanceCollectStart}
                        onChange={setPerformanceCollectStart}
                        placeholder="起始季度"
                        style={{ width: 180 }}
                      />
                      <QuarterPicker
                        value={performanceCollectEnd}
                        onChange={setPerformanceCollectEnd}
                        placeholder="结束季度（可选）"
                        style={{ width: 180 }}
                      />
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={async () => {
                          const startParam = formatQuarterParam(performanceCollectStart);
                          const endParam = formatQuarterParam(performanceCollectEnd);
                          if (!startParam) {
                            message.warning('请选择起始季度');
                            return;
                          }
                          if (
                            performanceCollectStart &&
                            performanceCollectEnd &&
                            performanceCollectEnd.isBefore(performanceCollectStart)
                          ) {
                            message.warning('结束季度不能早于起始季度');
                            return;
                          }
                          try {
                            setPerformanceCollectLoading(true);
                            await apiClient.collectShanghaiAFinancials({
                              start_period: startParam,
                              end_period: endParam ?? startParam,
                              include_balance_sheet: false,
                              include_performance: true,
                            });
                            message.success('业绩快报数据采集已启动');
                            await loadPerformances();
                          } catch (error) {
                            console.error('Performance collect failed:', error);
                            message.error('业绩快报数据采集失败');
                          } finally {
                            setPerformanceCollectLoading(false);
                          }
                        }}
                        loading={performanceCollectLoading}
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
                    type={performanceCollectVisible ? 'primary' : 'default'}
                    onClick={() => setPerformanceCollectVisible((prev) => !prev)}
                  >
                    {performanceCollectVisible ? '收起采集' : '开始采集'}
                  </Button>
                </Space>
              </Space>
              <Table<PerformanceTableRow>
                columns={performanceColumns}
                dataSource={performanceTreeData}
                loading={performanceLoading}
                rowKey={(record) => record.key}
                pagination={{ pageSize: 20 }}
                expandable={{ expandRowByClick: true }}
                scroll={{ x: 1800 }}
              />
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
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>基本信息</Title>
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
          </div>
          <div>
            <Title level={5}>股票信息</Title>
            <Table<ShanghaiAStockInfo>
              columns={infoColumns}
              dataSource={detailInfo}
              loading={detailLoading}
              pagination={false}
              rowKey={(record) => record.info_key}
              size="small"
              locale={{ emptyText: detailLoading ? '加载中...' : '暂无数据' }}
            />
          </div>
        </Space>
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
