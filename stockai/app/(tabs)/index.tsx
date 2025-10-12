import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StockSearchBar } from '@/components/stock-search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const marketOverview = {
  indices: [
    { name: '上证指数', value: '3,218.46', change: '+32.51', percent: '+1.02%', turnover: '4,562亿' },
    { name: '上证50', value: '2,845.21', change: '+41.13', percent: '+1.47%', turnover: '1,238亿' },
    { name: '科创50', value: '1,219.07', change: '-8.36', percent: '-0.68%', turnover: '527亿' },
  ],
  capitalFlow: [
    { name: '主板', netFlow: '+95.4亿', direction: '北向净流入', focus: '权重蓝筹获机构买入' },
    { name: '科创板', netFlow: '+12.7亿', direction: '北向净流入', focus: '半导体龙头获加仓' },
    { name: '两融余额', netFlow: '+38.1亿', direction: '融资净买入', focus: '新能源链延续活跃' },
  ],
  sectors: [
    { name: '高端装备', heat: '热点板块', leader: '沪航科技 +7.23%' },
    { name: '消费复苏', heat: '趋势回暖', leader: '申城百货 +4.82%' },
    { name: '数字经济', heat: '政策催化', leader: '浦江数科 +5.15%' },
  ],
  topMovers: [
    { name: '国芯科技', price: '42.18', change: '+9.98%', reason: 'Chiplet 概念爆发' },
    { name: '东方锦鲤', price: '18.63', change: '+7.35%', reason: '旅游消费旺季预期' },
    { name: '红旗药业', price: '23.41', change: '+6.10%', reason: '传统中药订单增长' },
  ],
  highlights: [
    {
      title: '午后点评',
      content: '券商领衔发力推动沪指重回3200点之上，红色行情提振市场人气。',
    },
    {
      title: '北向动向',
      content: '北向资金全天净流入超百亿，重点增持高股息与科技双主线。',
    },
    {
      title: '风险提示',
      content: '短线涨幅居前品种存获利兑现压力，控制节奏，精选真成长。',
    },
  ],
};

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View style={styles.section}>
    <ThemedText type="subtitle" style={styles.sectionTitle}>
      {title}
    </ThemedText>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function MarketOverviewScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 24);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPadding }]}>
        <StockSearchBar />
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            沪市红日
          </ThemedText>
          <ThemedText style={styles.subtitle}>聚焦A股主板，捕捉红色行情脉络</ThemedText>
        </View>

        <SectionCard title="指数表现">
          {marketOverview.indices.map((item) => {
            const trendStyle = item.change.startsWith('-') ? styles.negative : styles.positive;
            return (
            <View key={item.name} style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>{item.name}</ThemedText>
                <ThemedText style={styles.rowValue}>{item.value}</ThemedText>
              </View>
              <View style={styles.rowMeta}>
                <ThemedText style={trendStyle}>{item.change}</ThemedText>
                <ThemedText style={trendStyle}>{item.percent}</ThemedText>
                <ThemedText style={styles.muted}>成交额 {item.turnover}</ThemedText>
              </View>
            </View>
          );
          })}
        </SectionCard>

        <SectionCard title="主力资金动向">
          {marketOverview.capitalFlow.map((item) => (
            <View key={item.name} style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>{item.name}</ThemedText>
                <ThemedText style={styles.muted}>{item.direction}</ThemedText>
              </View>
              <View style={styles.rowMeta}>
                <ThemedText
                  style={item.netFlow.startsWith('-') ? styles.negative : styles.positive}>
                  {item.netFlow}
                </ThemedText>
                <ThemedText style={styles.muted}>{item.focus}</ThemedText>
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="板块温度计">
          {marketOverview.sectors.map((item) => (
            <View key={item.name} style={styles.pillRow}>
              <View style={styles.pill}>
                <ThemedText style={styles.rowTitle}>{item.name}</ThemedText>
                <ThemedText style={styles.muted}>{item.heat}</ThemedText>
              </View>
              <ThemedText style={styles.positive}>{item.leader}</ThemedText>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="红盘领涨">
          {marketOverview.topMovers.map((item) => (
            <View key={item.name} style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>{item.name}</ThemedText>
                <ThemedText style={styles.muted}>{item.reason}</ThemedText>
              </View>
              <View style={styles.rowMeta}>
                <ThemedText style={styles.rowValue}>{item.price}</ThemedText>
                <ThemedText style={styles.positive}>{item.change}</ThemedText>
              </View>
            </View>
          ))}
        </SectionCard>

        <SectionCard title="盘面速递">
          {marketOverview.highlights.map((item) => (
            <View key={item.title} style={styles.highlight}>
              <ThemedText style={styles.highlightTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.highlightText}>{item.content}</ThemedText>
            </View>
          ))}
        </SectionCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    gap: 6,
  },
  title: {
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.85,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: 1,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowValue: {
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
  muted: {
    color: '#864136',
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  highlight: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7EF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7A332A',
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#8A4537',
  },
});
