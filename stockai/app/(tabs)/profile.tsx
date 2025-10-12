import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Stat = { label: string; value: string; note: string };
type SettingItem = { key: string; title: string; caption: string; status?: string };
type SupportItem = { key: string; title: string; caption: string };

const profile = {
  name: '红杉量化',
  membershipLabel: '尊享版会员',
  membershipExpire: '2025-12-31',
  bio: '聚焦沪市 A 股的稳健投资者，偏好中长期红盘趋势策略。',
  stats: [
    { label: '本周收益', value: '+3.82%', note: '跑赢沪指 2.11 个百分点' },
    { label: '自选命中率', value: '68%', note: '近 30 日 AI 策略成功率' },
    { label: '风险承受', value: '中偏稳', note: '目标回撤控制 8%' },
  ] satisfies Stat[],
  settings: [
    { key: 'membership', title: '会员设置', caption: '权益与续费计划', status: '尊享版' },
    { key: 'profile', title: '个人信息', caption: '实名认证、联系方式、偏好管理' },
    { key: 'risk', title: '风险评估', caption: '更新风险承受等级与资金档位' },
    { key: 'notification', title: '通知与提醒', caption: '推送、短信、邮件提醒偏好' },
  ] satisfies SettingItem[],
  support: [
    { key: 'strategy', title: '策略回测记录', caption: '查看历史指令与 AI 建议' },
    { key: 'privacy', title: '数据与隐私', caption: '管理数据授权与隐私设置' },
    { key: 'help', title: '帮助与客服', caption: '7×24 专属顾问联系渠道' },
  ] satisfies SupportItem[],
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 24);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Section title="个人信息">
          <View style={styles.profileCard}>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>红</ThemedText>
              </View>
              <View style={styles.headerInfo}>
                <ThemedText type="title" style={styles.title}>
                  {profile.name}
                </ThemedText>
                <View style={styles.membershipRow}>
                  <ThemedText style={styles.muted}>{profile.membershipLabel}</ThemedText>
                  <View style={styles.membershipBadge}>
                    <ThemedText style={styles.membershipBadgeText}>VIP</ThemedText>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.profileMeta}>
              <View style={styles.metaRow}>
                <ThemedText style={styles.metaLabel}>有效期</ThemedText>
                <ThemedText style={styles.metaValue}>{profile.membershipExpire}</ThemedText>
              </View>
              <View style={styles.metaRow}>
                <ThemedText style={styles.metaLabel}>个性签名</ThemedText>
                <ThemedText style={styles.metaValue}>{profile.bio}</ThemedText>
              </View>
            </View>
          </View>
        </Section>

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

        <Section title="账户设置">
          <View style={styles.settingList}>
            {profile.settings.map((item) => (
              <Pressable key={item.key} style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <ThemedText style={styles.settingTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.settingCaption}>{item.caption}</ThemedText>
                </View>
                {item.status ? <ThemedText style={styles.settingStatus}>{item.status}</ThemedText> : null}
                <IconSymbol name="chevron.right" size={18} color="#B76A5C" />
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="服务支持">
          <View style={styles.settingList}>
            {profile.support.map((item) => (
              <Pressable key={item.key} style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <ThemedText style={styles.settingTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.settingCaption}>{item.caption}</ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={18} color="#B76A5C" />
              </Pressable>
            ))}
          </View>
        </Section>

        <View style={styles.footerNote}>
          <ThemedText style={styles.footerTitle}>账户安全提示</ThemedText>
          <ThemedText style={styles.footerText}>
            建议定期更新密码与风险评估等级，保持提醒通道畅通，确保 AI 策略能及时触达。
          </ThemedText>
        </View>
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
    gap: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  header: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C2341F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    gap: 6,
    alignItems: 'flex-start',
  },
  title: {
    letterSpacing: 1.2,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  membershipBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F7D8CB',
  },
  membershipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C1D18',
  },
  muted: {
    color: '#864136',
    fontSize: 14,
  },
  profileMeta: {
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  metaLabel: {
    fontSize: 13,
    color: '#864136',
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    color: '#7A3B32',
    fontSize: 13,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'column',
    gap: 12,
  },
  statCard: {
    width: '100%',
    backgroundColor: '#FFF5EE',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
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
  settingList: {
    gap: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.12)',
    backgroundColor: '#FFF8F3',
    gap: 12,
  },
  settingInfo: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  settingCaption: {
    fontSize: 12,
    color: '#885144',
    lineHeight: 18,
  },
  settingStatus: {
    fontSize: 12,
    color: '#C2341F',
    fontWeight: '700',
  },
  footerNote: {
    gap: 6,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#FFF6EF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  footerTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#7A3B32',
  },
});