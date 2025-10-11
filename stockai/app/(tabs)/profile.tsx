import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const profile = {
  name: '红杉量化',
  membership: '尊享版会员 · 有效期至 2025-12-31',
  bio: '聚焦沪市A股的稳健投资者，偏好中长期红盘趋势策略。',
  stats: [
    { label: '本周收益', value: '+3.82%', note: '跑赢沪指 2.11 个百分点' },
    { label: '自选命中率', value: '68%', note: '近30日AI策略成功率' },
    { label: '风险承受', value: '中偏上', note: '目标回撤控制 8%' },
  ],
  riskPreferences: [
    'AI聚焦红盘强势股，回避绿盘调整期',
    '优先关注高股息与科技双主线组合',
    '策略触发后分批建仓，单股不超净值 15%',
  ],
  tasks: [
    { title: '同步沪深港通资金流入提醒', status: '已开启' },
    { title: '每日早盘策略推送', status: '07:30 自动推送' },
    { title: '个股异常波动短信提醒', status: '待开启' },
  ],
  watchThemes: [
    { name: '白酒龙头', focus: '估值修复', allocation: '25%' },
    { name: '半导体设备', focus: '国产替代', allocation: '30%' },
    { name: '新能源储能', focus: '景气延续', allocation: '20%' },
    { name: '高股息央企', focus: '防御底仓', allocation: '25%' },
  ],
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View style={styles.section}>
    <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>红</ThemedText>
          </View>
          <View style={styles.headerInfo}>
            <ThemedText type="title" style={styles.title}>
              {profile.name}
            </ThemedText>
            <ThemedText style={styles.muted}>{profile.membership}</ThemedText>
            <ThemedText style={styles.bio}>{profile.bio}</ThemedText>
          </View>
        </View>

        <Section title="资产概览">
          <View style={styles.statsRow}>
            {profile.stats.map((item) => (
              <View key={item.label} style={styles.statCard}>
                <ThemedText style={styles.statLabel}>{item.label}</ThemedText>
                <ThemedText style={styles.statValue}>{item.value}</ThemedText>
                <ThemedText style={styles.statNote}>{item.note}</ThemedText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="策略偏好">
          <View style={styles.bulletList}>
            {profile.riskPreferences.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <View style={styles.dot} />
                <ThemedText style={styles.bulletText}>{item}</ThemedText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="主题仓位建议">
          <View style={styles.themeGrid}>
            {profile.watchThemes.map((item) => (
              <View key={item.name} style={styles.themeCard}>
                <ThemedText style={styles.themeTitle}>{item.name}</ThemedText>
                <ThemedText style={styles.themeFocus}>{item.focus}</ThemedText>
                <ThemedText style={styles.themeAllocation}>{item.allocation} 配置</ThemedText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="智能提醒配置">
          <View style={styles.taskList}>
            {profile.tasks.map((task) => (
              <View key={task.title} style={styles.taskRow}>
                <View style={styles.taskBadge}>
                  <ThemedText style={styles.taskBadgeText}>AI</ThemedText>
                </View>
                <View style={styles.taskInfo}>
                  <ThemedText style={styles.taskTitle}>{task.title}</ThemedText>
                  <ThemedText style={styles.taskStatus}>{task.status}</ThemedText>
                </View>
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
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#C64B3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  title: {
    letterSpacing: 1.2,
  },
  muted: {
    opacity: 0.75,
  },
  bio: {
    lineHeight: 20,
    opacity: 0.9,
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
    padding: 16,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '48%',
    backgroundColor: '#FFF5EE',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.75,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C2341F',
  },
  statNote: {
    fontSize: 12,
    opacity: 0.85,
    lineHeight: 18,
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
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeCard: {
    flexBasis: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
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
    color: '#C2341F',
  },
  taskList: {
    gap: 12,
  },
  taskRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  taskBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#C2341F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
});
