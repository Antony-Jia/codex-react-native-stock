import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StockSearchBar } from '@/components/stock-search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Candlestick = {
  day: string;
  open: number;
  close: number;
  high: number;
  low: number;
};

type StockProfile = {
  code: string;
  name: string;
  price: string;
  change: string;
  theme: string;
  aiSignal: string;
  resistance: string;
  support: string;
  indicators: { ema: string; macd: string; volume: string };
  news: { title: string; time: string; summary: string }[];
  kline: Candlestick[];
};

type DraftStock = {
  code: string;
  name: string;
  price: string;
  change: string;
  theme: string;
  aiSignal: string;
};

const favoriteStocks: StockProfile[] = [
  {
    code: '600519',
    name: '贵州茅台',
    price: '1,865.30',
    change: '+2.15%',
    theme: '高端白酒 · 核心资产',
    aiSignal: 'AI诊断：资金持续回暖，短线维持强势红盘格局。',
    resistance: '1,900',
    support: '1,820',
    indicators: {
      ema: '短中期均线齐头向上',
      macd: '红柱放大 +0.23',
      volume: '日均放量 +15%',
    },
    news: [
      {
        title: '中秋国庆消费旺季超预期',
        time: '2小时前',
        summary: '高端白酒动销加速，渠道反馈节奏健康，提价预期升温。',
      },
      {
        title: '酱香系列矩阵优化升级',
        time: '昨日',
        summary: '公司强化系列酒业务，释放结构性增长潜力，AI研判利好延续。',
      },
    ],
    kline: [
      { day: '10-03', open: 1812, close: 1820, high: 1825, low: 1802 },
      { day: '10-04', open: 1821, close: 1835, high: 1842, low: 1816 },
      { day: '10-07', open: 1833, close: 1850, high: 1855, low: 1828 },
      { day: '10-08', open: 1856, close: 1865, high: 1873, low: 1844 },
      { day: '10-09', open: 1868, close: 1862, high: 1878, low: 1850 },
    ],
  },
  {
    code: '600703',
    name: '三安光电',
    price: '24.67',
    change: '+4.31%',
    theme: '半导体 · 第三代化合物芯片',
    aiSignal: 'AI诊断：景气度拐点明确，短线加速行情，高位注意节奏控制。',
    resistance: '26.00',
    support: '23.50',
    indicators: {
      ema: '5日 / 10日均线多头排列',
      macd: '红柱延续 +0.31',
      volume: '连续两日放量',
    },
    news: [
      {
        title: '车规级LED迎突破',
        time: '1小时前',
        summary: 'Mini LED订单供不应求，新型显示业务贡献弹性。',
      },
      {
        title: '国家大基金信号再起',
        time: '今日早盘',
        summary: '市场传闻大基金或增持，提升资金关注度，AI策略建议逢低布局。',
      },
    ],
    kline: [
      { day: '10-03', open: 22.1, close: 22.8, high: 23.1, low: 21.9 },
      { day: '10-04', open: 22.9, close: 23.4, high: 23.6, low: 22.5 },
      { day: '10-07', open: 23.6, close: 24.1, high: 24.5, low: 23.2 },
      { day: '10-08', open: 24.2, close: 24.5, high: 24.9, low: 23.7 },
      { day: '10-09', open: 24.7, close: 24.67, high: 25.1, low: 24.2 },
    ],
  },
  {
    code: '601012',
    name: '隆基绿能',
    price: '32.18',
    change: '+1.96%',
    theme: '光伏龙头 · 一体化制造',
    aiSignal: 'AI诊断：板块低位修复中，红盘延续仍需关注组件价格走势。',
    resistance: '33.50',
    support: '30.80',
    indicators: {
      ema: '中期拐头向上',
      macd: '红绿转换，金叉蓄势',
      volume: '缩量整理，等待突破',
    },
    news: [
      {
        title: '硅料价格止跌企稳',
        time: '30分钟前',
        summary: '产业链价格改善，企业签订海外大单，推动估值修复。',
      },
      {
        title: '储能业务持续扩张',
        time: '今日午市',
        summary: '布局新型储能项目，增强协同效应，AI建议关注盈利兑现节奏。',
      },
    ],
    kline: [
      { day: '10-03', open: 30.1, close: 30.5, high: 30.9, low: 29.6 },
      { day: '10-04', open: 30.6, close: 31.1, high: 31.4, low: 30.2 },
      { day: '10-07', open: 31.2, close: 31.5, high: 31.9, low: 30.9 },
      { day: '10-08', open: 31.6, close: 32.4, high: 32.6, low: 31.2 },
      { day: '10-09', open: 32.5, close: 32.18, high: 32.9, low: 31.8 },
    ],
  },
];

const EMPTY_DRAFT: DraftStock = {
  code: '',
  name: '',
  price: '',
  change: '',
  theme: '',
  aiSignal: '',
};

const CHART_HEIGHT = 130;

const CandlestickSketch = ({ data }: { data: Candlestick[] }) => {
  if (!data.length) {
    return (
      <View style={[styles.chartContainer, styles.chartPlaceholder]}>
        <ThemedText style={styles.placeholderText}>暂无 K 线数据</ThemedText>
      </View>
    );
  }

  const high = Math.max(...data.map((item) => item.high));
  const low = Math.min(...data.map((item) => item.low));
  const range = high - low || 1;

  return (
    <View style={[styles.chartContainer, { minHeight: CHART_HEIGHT + 40 }]}>
      {data.map((item) => {
        const isUp = item.close >= item.open;
        const bodyHeight = Math.max(
          (Math.abs(item.close - item.open) / range) * CHART_HEIGHT,
          6,
        );
        const wickTop = ((item.high - Math.max(item.open, item.close)) / range) * CHART_HEIGHT;
        const wickBottom = ((Math.min(item.open, item.close) - item.low) / range) * CHART_HEIGHT;

        const columnStyle: ViewStyle = {
          backgroundColor: isUp ? '#C2341F' : '#148A55',
          height: bodyHeight,
        };
        const wickStyle = isUp ? styles.wick : styles.wickDown;

        return (
          <View key={item.day} style={styles.candle}>
            <View style={[wickStyle, { height: wickTop }]} />
            <View style={[styles.body, columnStyle]} />
            <View style={[wickStyle, { height: wickBottom }]} />
            <ThemedText style={styles.candleLabel}>{item.day}</ThemedText>
          </View>
        );
      })}
    </View>
  );
};

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 24);
  const [stocks, setStocks] = useState<StockProfile[]>(favoriteStocks);
  const [selectedStock, setSelectedStock] = useState<StockProfile | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [draft, setDraft] = useState<DraftStock>(EMPTY_DRAFT);
  const [formError, setFormError] = useState('');
  const keyword = searchKeyword.trim().toLowerCase();

  const filteredStocks = keyword
    ? stocks.filter((stock) => {
        return (
          stock.name.toLowerCase().includes(keyword) ||
          stock.code.toLowerCase().includes(keyword)
        );
      })
    : stocks;

  const handleRemoveStock = (code: string) => {
    setStocks((prev) => prev.filter((item) => item.code !== code));
    if (selectedStock?.code === code) {
      setSelectedStock(null);
    }
  };

  const handleDraftChange = (field: keyof DraftStock, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const openAddModal = () => {
    setDraft(EMPTY_DRAFT);
    setFormError('');
    setIsAddVisible(true);
  };

  const closeAddModal = () => {
    setIsAddVisible(false);
    setDraft(EMPTY_DRAFT);
    setFormError('');
  };

  const normalizeChange = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '+0.00%';
    if (/^[+-]/.test(trimmed)) {
      return trimmed;
    }
    return `+${trimmed}`;
  };

  const handleSubmitDraft = () => {
    if (!draft.code.trim() || !draft.name.trim()) {
      setFormError('请输入股票名称和代码');
      return;
    }
    if (stocks.some((item) => item.code === draft.code.trim())) {
      setFormError('该股票已在列表中');
      return;
    }

    const newStock: StockProfile = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      price: draft.price.trim() || '--',
      change: normalizeChange(draft.change),
      theme: draft.theme.trim() || '自定义策略标的',
      aiSignal: draft.aiSignal.trim() || 'AI 诊断：策略分析生成中，稍后刷新。',
      resistance: '--',
      support: '--',
      indicators: {
        ema: '均线数据生成中',
        macd: 'MACD 数据生成中',
        volume: '成交量更新中',
      },
      news: [],
      kline: [],
    };

    setStocks((prev) => [...prev, newStock]);
    setSearchKeyword('');
    setDraft(EMPTY_DRAFT);
    setFormError('');
    setIsAddVisible(false);
  };

  const renderRightActions = (code: string) => (
    <View style={styles.deleteActionWrapper}>
      <Pressable
        onPress={() => handleRemoveStock(code)}
        style={styles.deleteAction}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <ThemedText style={styles.deleteActionText}>删除</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}>
        <StockSearchBar onSubmit={setSearchKeyword} />

        <View style={styles.topRow}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              自选巡航
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              AI 盯盘，捕捉红盘核心资产，把控风险节奏。
            </ThemedText>
          </View>

          <Pressable onPress={openAddModal} style={styles.addButton}>
            <ThemedText style={styles.addButtonText}>+ 添加个股</ThemedText>
          </Pressable>
        </View>

        {searchKeyword ? (
          <Pressable style={styles.clearFilter} onPress={() => setSearchKeyword('')}>
            <ThemedText style={styles.clearFilterText}>
              正在筛选：{searchKeyword} · 点击重置
            </ThemedText>
          </Pressable>
        ) : null}

        {filteredStocks.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyTitle}>暂无匹配的个股</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              尝试调整搜索条件，或直接添加新的关注标的。
            </ThemedText>
            <Pressable style={styles.secondaryButton} onPress={openAddModal}>
              <ThemedText style={styles.secondaryButtonText}>添加个股</ThemedText>
            </Pressable>
          </View>
        ) : (
          filteredStocks.map((stock) => {
            const changeStyle = stock.change.trim().startsWith('-')
              ? styles.negative
              : styles.positive;

            return (
              <Swipeable
                key={stock.code}
                renderRightActions={() => renderRightActions(stock.code)}
                overshootRight={false}
                friction={2}>
                <Pressable
                  onPress={() => setSelectedStock(stock)}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <ThemedText style={styles.stockName}>
                        {stock.name} · {stock.code}
                      </ThemedText>
                      <ThemedText style={styles.muted}>{stock.theme}</ThemedText>
                    </View>
                    <View style={styles.priceColumn}>
                      <ThemedText style={styles.price}>{stock.price}</ThemedText>
                      <ThemedText style={changeStyle}>{stock.change}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.signalRow}>
                    <ThemedText style={styles.aiSignal}>
                      {stock.aiSignal || 'AI 诊断：策略更新中，请稍后查看。'}
                    </ThemedText>
                  </View>

                  <View style={styles.levels}>
                    <View>
                      <ThemedText style={styles.label}>压力位</ThemedText>
                      <ThemedText style={styles.levelValue}>{stock.resistance}</ThemedText>
                    </View>
                    <View>
                      <ThemedText style={styles.label}>支撑位</ThemedText>
                      <ThemedText style={styles.levelValue}>{stock.support}</ThemedText>
                    </View>
                    <View>
                      <ThemedText style={styles.label}>成交量</ThemedText>
                      <ThemedText style={styles.levelValue}>{stock.indicators.volume}</ThemedText>
                    </View>
                  </View>
                </Pressable>
              </Swipeable>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!selectedStock}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedStock(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedStock && (
              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>
                    {selectedStock.name}（{selectedStock.code}）
                  </ThemedText>
                  <Pressable onPress={() => setSelectedStock(null)} style={styles.closeButton}>
                    <ThemedText style={styles.closeText}>关闭</ThemedText>
                  </Pressable>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>即时报价</ThemedText>
                  <View style={styles.modalQuote}>
                    <ThemedText style={styles.modalPrice}>{selectedStock.price}</ThemedText>
                    <ThemedText
                      style={
                        selectedStock.change.trim().startsWith('-')
                          ? styles.negative
                          : styles.positive
                      }>
                      {selectedStock.change}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>技术面速览</ThemedText>
                  <View style={styles.indicatorRow}>
                    <ThemedText style={styles.indicatorTag}>{selectedStock.indicators.ema}</ThemedText>
                    <ThemedText style={styles.indicatorTag}>{selectedStock.indicators.macd}</ThemedText>
                    <ThemedText style={styles.indicatorTag}>
                      {selectedStock.indicators.volume}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>AI 策略研判</ThemedText>
                  <ThemedText style={styles.modalText}>
                    {selectedStock.aiSignal || 'AI 诊断：暂无数据，稍后刷新。'}
                  </ThemedText>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>迷你 K 线</ThemedText>
                  <CandlestickSketch data={selectedStock.kline} />
                  <ThemedText style={styles.modalText}>
                    {selectedStock.resistance === '--' && selectedStock.support === '--'
                      ? '暂无关键位数据，待策略更新后同步。'
                      : '关键位附近若量能萎缩，则警惕短线回踩；若放量突破，可跟随红盘趋势逐步加仓。'}
                  </ThemedText>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>最新资讯</ThemedText>
                  {selectedStock.news.length ? (
                    selectedStock.news.map((item) => (
                      <View key={item.title} style={styles.newsCard}>
                        <ThemedText style={styles.newsTitle}>
                          {item.title} · {item.time}
                        </ThemedText>
                        <ThemedText style={styles.newsSummary}>{item.summary}</ThemedText>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.modalText}>
                      暂无相关新闻，AI 正在持续监控。
                    </ThemedText>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={isAddVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddModal}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.formWrapper}>
            <View style={styles.formModal}>
              <View style={styles.formHeader}>
                <ThemedText style={styles.modalTitle}>添加关注个股</ThemedText>
                <Pressable onPress={closeAddModal}>
                  <ThemedText style={styles.dismissText}>取消</ThemedText>
                </Pressable>
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.formLabel}>股票名称</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="例如 贵州茅台"
                  placeholderTextColor="#B2877A"
                  value={draft.name}
                  onChangeText={(text) => handleDraftChange('name', text)}
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.formLabel}>股票代码</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="例如 600519"
                  placeholderTextColor="#B2877A"
                  value={draft.code}
                  onChangeText={(text) => handleDraftChange('code', text)}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.formLabel}>最新价（可选）</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="例如 1865.30"
                  placeholderTextColor="#B2877A"
                  value={draft.price}
                  onChangeText={(text) => handleDraftChange('price', text)}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.formLabel}>涨跌幅（可选）</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="例如 +2.15%"
                  placeholderTextColor="#B2877A"
                  value={draft.change}
                  onChangeText={(text) => handleDraftChange('change', text)}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.formLabel}>所属主题（可选）</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="例如 高端白酒 · 核心资产"
                  placeholderTextColor="#B2877A"
                  value={draft.theme}
                  onChangeText={(text) => handleDraftChange('theme', text)}
                />
              </View>

              <View style={styles.formField}>
                <ThemedText style={styles.formLabel}>AI 策略提示（可选）</ThemedText>
                <TextInput
                  style={styles.inputMultiline}
                  placeholder="填写你对该个股的关注点，AI 会优先跟踪。"
                  placeholderTextColor="#B2877A"
                  value={draft.aiSignal}
                  onChangeText={(text) => handleDraftChange('aiSignal', text)}
                  multiline
                />
              </View>

              {formError ? <ThemedText style={styles.errorText}>{formError}</ThemedText> : null}

              <View style={styles.formActions}>
                <Pressable style={styles.submitButton} onPress={handleSubmitDraft}>
                  <ThemedText style={styles.submitText}>保存到自选</ThemedText>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  header: {
    flex: 1,
    gap: 6,
  },
  title: {
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85,
  },
  addButton: {
    backgroundColor: '#C2341F',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  clearFilter: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFE4D8',
    borderRadius: 14,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#9A4B3C',
    fontWeight: '600',
  },
  emptyState: {
    gap: 10,
    backgroundColor: '#FFF6F0',
    borderRadius: 18,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#9A4B3C',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFE1D5',
  },
  secondaryButtonText: {
    color: '#B03A2E',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '700',
  },
  muted: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  priceColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
  },
  positive: {
    color: '#C2341F',
    fontWeight: '600',
  },
  negative: {
    color: '#148A55',
    fontWeight: '600',
  },
  deleteActionWrapper: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  deleteAction: {
    backgroundColor: '#C2341F',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(194, 52, 31, 0.16)',
  },
  signalRow: {
    gap: 8,
  },
  aiSignal: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7A271A',
  },
  levels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    opacity: 0.85,
    color: '#864136',
    fontSize: 13,
  },
  levelValue: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(92, 18, 12, 0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '90%',
    padding: 16,
  },
  modalScroll: {
    gap: 18,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8C1D18',
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#B03A2E',
  },
  closeText: {
    color: '#FFE8D6',
    fontWeight: '600',
  },
  modalSection: {
    gap: 10,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8C1D18',
  },
  modalQuote: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  modalPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#B03A2E',
  },
  indicatorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  indicatorTag: {
    backgroundColor: '#FFF1E3',
    color: '#9A2F20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 13,
    fontWeight: '600',
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7A271A',
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
    gap: 6,
  },
  newsTitle: {
    fontWeight: '700',
    color: '#8C1D18',
  },
  newsSummary: {
    color: '#7A271A',
    lineHeight: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 30,
    paddingHorizontal: 4,
    backgroundColor: '#FFF2E8',
    borderRadius: 12,
    paddingBottom: 16,
  },
  chartPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#8A6D65',
  },
  candle: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  wick: {
    width: 2,
    backgroundColor: '#C2341F',
  },
  wickDown: {
    width: 2,
    backgroundColor: '#148A55',
  },
  body: {
    width: 12,
    borderRadius: 6,
  },
  candleLabel: {
    fontSize: 12,
    color: '#8C1D18',
  },
  formWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  formModal: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dismissText: {
    color: '#B03A2E',
    fontWeight: '700',
  },
  formField: {
    gap: 8,
  },
  formLabel: {
    fontWeight: '700',
    color: '#7A271A',
  },
  input: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.2)',
    backgroundColor: '#FFF6F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#6E1F16',
  },
  inputMultiline: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.2)',
    backgroundColor: '#FFF6F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#6E1F16',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#C2341F',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorText: {
    color: '#B03A2E',
    fontSize: 13,
    fontWeight: '600',
  },
});
