import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StockSearchBar } from '@/components/stock-search-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const investmentData = {
  summary: [
    { label: '策略焦点', value: '红盘趋势跟踪' },
    { label: '风险阈值', value: '8% 动态止损' },
    { label: '仓位利用率', value: '72%' },
  ],
  preferences: [
    'AI 聚焦红盘强势股，回避绿盘调整节奏。',
    '优先关注高股息与科技双主线组合，兼顾稳健与成长。',
    '策略触发后分批建仓，单股仓位不超过总资产的 15%。',
  ],
  allocations: [
    { name: '白酒龙头', focus: '估值修复', allocation: '25%' },
    { name: '半导体设备', focus: '国产替代', allocation: '30%' },
    { name: '新能源储能', focus: '景气延续', allocation: '20%' },
    { name: '高股息央企', focus: '防御底仓', allocation: '25%' },
  ],
  automations: [
    { title: '同步沪深港通资金流入提醒', status: '已开启', type: '资金' },
    { title: '每日早盘策略推送', status: '07:30 自动发送', type: '策略' },
    { title: '个股异常波动短信提醒', status: '待开启', type: '风控' },
  ],
  signals: [
    {
      name: '主线强势股',
      insight: '红盘延续，重点跟踪放量突破形态的白酒与军工龙头。',
      score: '88',
    },
    {
      name: '资金回流板块',
      insight: '北向资金偏好高股息与科技板块，建议维持分散配置。',
      score: '82',
    },
  ],
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function InvestmentAnalysisScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 24);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}>
        <StockSearchBar />

        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            投资分析
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            聚焦资产配置与策略偏好，AI 帮你管仓、管风控、管执行。
          </ThemedText>
        </View>

        <View style={styles.summaryRow}>
          {investmentData.summary.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <ThemedText style={styles.summaryLabel}>{item.label}</ThemedText>
              <ThemedText style={styles.summaryValue}>{item.value}</ThemedText>
            </View>
          ))}
        </View>

        <Section title="策略偏好">
          <View style={styles.bulletList}>
            {investmentData.preferences.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.dot} />
                <ThemedText style={styles.bulletText}>{item}</ThemedText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="主题仓位建议">
          <View style={styles.themeGrid}>
            {investmentData.allocations.map((item) => (
              <View key={item.name} style={styles.themeCard}>
                <ThemedText style={styles.themeTitle}>{item.name}</ThemedText>
                <ThemedText style={styles.themeFocus}>{item.focus}</ThemedText>
                <ThemedText style={styles.themeAllocation}>{item.allocation}</ThemedText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="智能提醒配置">
          <View style={styles.taskList}>
            {investmentData.automations.map((task) => (
              <View key={task.title} style={styles.taskRow}>
                <View style={styles.taskBadge}>
                  <ThemedText style={styles.taskBadgeText}>{task.type}</ThemedText>
                </View>
                <View style={styles.taskInfo}>
                  <ThemedText style={styles.taskTitle}>{task.title}</ThemedText>
                  <ThemedText style={styles.taskStatus}>{task.status}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="AI 焦点观察">
          <View style={styles.signalGrid}>
            {investmentData.signals.map((signal) => (
              <View key={signal.name} style={styles.signalCard}>
                <View style={styles.signalHeader}>
                  <ThemedText style={styles.signalName}>{signal.name}</ThemedText>
                  <ThemedText style={styles.signalScore}>{signal.score}</ThemedText>
                </View>
                <ThemedText style={styles.signalInsight}>{signal.insight}</ThemedText>
              </View>
            ))}
          </View>
        </Section>
      </ScrollView>
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
  header: {
    gap: 8,
  },
  title: {
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 110,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFF5EE',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  bulletList: {
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C2341F',
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    lineHeight: 22,
    fontSize: 15,
  },
  themeGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  themeCard: {
    width: '100%',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  themeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  themeFocus: {
    fontSize: 13,
    opacity: 0.85,
  },
  themeAllocation: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C2341F',
  },
  taskList: {
    gap: 12,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF6EF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  taskBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C2341F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  taskInfo: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    fontWeight: '700',
  },
  taskStatus: {
    fontSize: 12,
    color: '#7A3B32',
  },
  signalGrid: {
    gap: 12,
  },
  signalCard: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F3FAF6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 138, 85, 0.25)',
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signalName: {
    fontWeight: '700',
    fontSize: 15,
  },
  signalScore: {
    fontWeight: '700',
    color: '#148A55',
    fontSize: 18,
  },
  signalInsight: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1C613F',
  },
});
