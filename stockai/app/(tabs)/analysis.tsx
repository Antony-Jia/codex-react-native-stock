import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

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
        title: '酱酒矩阵优化升级',
        time: '昨日',
        summary: '公司强化系列酒业务，释放结构性增长潜力，AI研判利好持续。',
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
      ema: '5日、10日均线多头排列',
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
        title: '国家大基金信息',
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
        title: '储能业务拓展',
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

const CHART_HEIGHT = 130;

const CandlestickSketch = ({ data }: { data: Candlestick[] }) => {
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
          backgroundColor: isUp ? '#C2341F' : '#ED9082',
          height: bodyHeight,
        };

        return (
          <View key={item.day} style={styles.candle}>
            <View style={[styles.wick, { height: wickTop }]} />
            <View style={[styles.body, columnStyle]} />
            <View style={[styles.wick, { height: wickBottom }]} />
            <ThemedText style={styles.candleLabel}>{item.day}</ThemedText>
          </View>
        );
      })}
    </View>
  );
};

export default function AnalysisScreen() {
  const [selectedStock, setSelectedStock] = useState<StockProfile | null>(null);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            自选巡航
          </ThemedText>
          <ThemedText style={styles.subtitle}>AI盯盘，捕捉红盘核心资产</ThemedText>
        </View>

        {favoriteStocks.map((stock) => (
          <Pressable
            key={stock.code}
            onPress={() => setSelectedStock(stock)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText style={styles.stockName}>
                  {stock.name} · {stock.code}
                </ThemedText>
                <ThemedText style={styles.muted}>{stock.theme}</ThemedText>
              </View>
              <View style={styles.priceBlock}>
                <ThemedText style={styles.price}>{stock.price}</ThemedText>
                <ThemedText style={styles.positive}>{stock.change}</ThemedText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.signalRow}>
              <ThemedText style={styles.aiSignal}>{stock.aiSignal}</ThemedText>
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
        ))}
      </ScrollView>

      <Modal visible={!!selectedStock} transparent animationType="fade" onRequestClose={() => setSelectedStock(null)}>
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
                    <ThemedText style={styles.positive}>{selectedStock.change}</ThemedText>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>技术面速览</ThemedText>
                  <View style={styles.indicatorRow}>
                    <ThemedText style={styles.indicatorTag}>{selectedStock.indicators.ema}</ThemedText>
                    <ThemedText style={styles.indicatorTag}>{selectedStock.indicators.macd}</ThemedText>
                    <ThemedText style={styles.indicatorTag}>{selectedStock.indicators.volume}</ThemedText>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>K线追踪</ThemedText>
                  <CandlestickSketch data={selectedStock.kline} />
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>AI风控提示</ThemedText>
                  <ThemedText style={styles.modalText}>
                    关键位{selectedStock.resistance}附近若量能萎缩，则警惕短线回踩；若放量突破，可跟随红盘趋势逐步加仓。
                  </ThemedText>
                </View>

                <View style={styles.modalSection}>
                  <ThemedText style={styles.modalLabel}>相关新闻</ThemedText>
                  {selectedStock.news.map((item) => (
                    <View key={item.title} style={styles.newsCard}>
                      <ThemedText style={styles.newsTitle}>
                        {item.title} · {item.time}
                      </ThemedText>
                      <ThemedText style={styles.newsSummary}>{item.summary}</ThemedText>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
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
    padding: 20,
    gap: 18,
    paddingBottom: 32,
  },
  header: {
    gap: 6,
  },
  title: {
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockName: {
    fontSize: 18,
    fontWeight: '700',
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
  },
  positive: {
    color: '#C2341F',
    fontWeight: '600',
  },
  muted: {
    color: '#864136',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(194, 52, 31, 0.16)',
  },
  signalRow: {
    paddingVertical: 6,
  },
  aiSignal: {
    fontSize: 15,
    lineHeight: 22,
  },
  levels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  candle: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  wick: {
    width: 2,
    backgroundColor: '#C2341F',
  },
  body: {
    width: 12,
    borderRadius: 6,
  },
  candleLabel: {
    fontSize: 12,
    color: '#8C1D18',
  },
});
