import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type Message =
  | { id: string; role: 'user'; contentType: 'text'; text: string }
  | {
      id: string;
      role: 'assistant';
      contentType: 'text';
      title?: string;
      text: string;
    }
  | {
      id: string;
      role: 'assistant';
      contentType: 'news';
      title: string;
      items: { headline: string; time: string; summary: string }[];
    }
  | {
      id: string;
      role: 'assistant';
      contentType: 'chart';
      title: string;
      points: number[];
      conclusion: string;
    }
  | {
      id: string;
      role: 'assistant';
      contentType: 'image';
      title: string;
      source: number;
      caption: string;
    };

const mockMessages: Message[] = [
  {
    id: 'm1',
    role: 'user',
    contentType: 'text',
    text: 'AI 助手，帮我看看上证指数今日为何大涨？',
  },
  {
    id: 'm2',
    role: 'assistant',
    contentType: 'text',
    title: '盘中快评',
    text: '指数上行主因在于券商、白酒等权重板块共振发力，叠加北向资金净流入超过百亿，推动市场情绪从谨慎转向积极。',
  },
  {
    id: 'm3',
    role: 'assistant',
    contentType: 'chart',
    title: '沪指 30 分钟技术折线',
    points: [3210, 3216, 3228, 3235, 3242, 3238, 3251],
    conclusion: '均线多头排列，红柱放量，短线或保持震荡上行节奏。',
  },
  {
    id: 'm4',
    role: 'assistant',
    contentType: 'news',
    title: '相关资讯',
    items: [
      {
        headline: '券商并购重组提速 利好龙头券商',
        time: '45 分钟前',
        summary: '监管层加快行业整合节奏，市场预期集中度提升带来估值修复机会。',
      },
      {
        headline: '消费复苏数据超出预期',
        time: '1 小时前',
        summary: '中秋国庆双节消费额同比增长 12%，白酒、旅游概念延续红盘表现。',
      },
    ],
  },
  {
    id: 'm5',
    role: 'assistant',
    contentType: 'image',
    title: '盘面热力图',
    source: require('@/assets/images/icon.png'),
    caption: '红色区域代表资金加速流入，权重板块全面开花。',
  },
  {
    id: 'm6',
    role: 'user',
    contentType: 'text',
    text: '科技股后续还能追吗？风险点有哪些？',
  },
  {
    id: 'm7',
    role: 'assistant',
    contentType: 'text',
    title: '策略回应',
    text: '建议把握红盘主线但节奏要分化对待。半导体具备趋势基础，可分批布局；同时关注基本面兑现与估值消化的节奏，并警惕短线回调的高位风险。',
  },
];

type PodcastEpisode = {
  id: string;
  title: string;
  summary: string;
  duration: string;
  published: string;
  category: string;
};

const podcastFeed: PodcastEpisode[] = [
  {
    id: 'p1',
    title: '早盘策略雷达：红盘主线怎么跟',
    summary: 'AI 拆解今日券商、白酒联动上涨逻辑，从资金面和情绪面给出仓位节奏建议。',
    duration: '08:32',
    published: '今日 07:30',
    category: '盘前播客',
  },
  {
    id: 'p2',
    title: '午市巡航：科技股拉升背后的信号',
    summary: '聚焦半导体与光伏的资金回流情况，提示短线高位波动风险与防守策略。',
    duration: '06:45',
    published: '今日 12:20',
    category: '午评快线',
  },
  {
    id: 'p3',
    title: '闭市复盘：机构最新调仓方向',
    summary: '复盘北向与机构持仓动向，梳理重点板块的增减仓列表，帮助晚间决策。',
    duration: '09:15',
    published: '昨日 20:00',
    category: '收盘复盘',
  },
];

const TrendLine = ({ points }: { points: number[] }) => {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  return (
    <View style={styles.chartWrapper}>
      {points.map((point, index) => {
        const height = ((point - min) / range) * 80 + 20;
        const prev = ((points[index - 1] - min) / range) * 80 + 20;
        const isUp = index === 0 || height >= prev;
        const connectorHeight = index === 0 ? 0 : Math.abs(height - prev);

        return (
          <View key={`${point}-${index}`} style={styles.chartSegment}>
            {index !== 0 && (
              <View
                style={[
                  isUp ? styles.chartConnectorUp : styles.chartConnectorDown,
                  { height: connectorHeight },
                ]}
              />
            )}
            <View
              style={[
                styles.chartBar,
                {
                  height,
                  backgroundColor: isUp ? '#C2341F' : '#148A55',
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

const renderMessage = (message: Message) => {
  const isUser = message.role === 'user';
  const bubbleStyle = isUser ? styles.userBubble : styles.assistantBubble;

  switch (message.contentType) {
    case 'text':
      return (
        <View key={message.id} style={[styles.messageRow, isUser && styles.alignEnd]}>
          <View style={bubbleStyle}>
            {'title' in message && message.title ? (
              <ThemedText style={styles.bubbleTitle}>{message.title}</ThemedText>
            ) : null}
            <ThemedText style={styles.bubbleText}>{message.text}</ThemedText>
          </View>
        </View>
      );
    case 'news':
      return (
        <View key={message.id} style={styles.messageRow}>
          <View style={styles.assistantBubble}>
            <ThemedText style={styles.bubbleTitle}>{message.title}</ThemedText>
            <View style={styles.newsList}>
              {message.items.map((item) => (
                <View key={item.headline} style={styles.newsItem}>
                  <ThemedText style={styles.newsHeadline}>
                    {item.headline} · {item.time}
                  </ThemedText>
                  <ThemedText style={styles.newsSummary}>{item.summary}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    case 'chart':
      return (
        <View key={message.id} style={styles.messageRow}>
          <View style={styles.assistantBubble}>
            <ThemedText style={styles.bubbleTitle}>{message.title}</ThemedText>
            <TrendLine points={message.points} />
            <ThemedText style={styles.bubbleText}>{message.conclusion}</ThemedText>
          </View>
        </View>
      );
    case 'image':
      return (
        <View key={message.id} style={styles.messageRow}>
          <View style={styles.assistantBubble}>
            <ThemedText style={styles.bubbleTitle}>{message.title}</ThemedText>
            <Image source={message.source} contentFit="cover" style={styles.previewImage} />
            <ThemedText style={styles.bubbleText}>{message.caption}</ThemedText>
          </View>
        </View>
      );
    default:
      return null;
  }
};

const renderPodcastEpisode = (episode: PodcastEpisode) => (
  <View key={episode.id} style={styles.podcastCard}>
    <View style={styles.podcastHeader}>
      <ThemedText style={styles.podcastCategory}>{episode.category}</ThemedText>
      <ThemedText style={styles.podcastDuration}>{episode.duration}</ThemedText>
    </View>
    <ThemedText style={styles.podcastTitle}>{episode.title}</ThemedText>
    <ThemedText style={styles.podcastSummary}>{episode.summary}</ThemedText>
    <View style={styles.podcastFooter}>
      <ThemedText style={styles.podcastPublished}>{episode.published}</ThemedText>
      <ThemedText style={styles.podcastAction}>▶ 收听</ThemedText>
    </View>
  </View>
);

export default function QAScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top + 12, 24);
  const [activeTab, setActiveTab] = useState<'qa' | 'podcast'>('qa');
  const paddingBottom = activeTab === 'qa' ? 120 : 40;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding, paddingBottom }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            智能版权
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            聚合智能问答与播客，快速掌握市场策略与音频洞察。
          </ThemedText>
        </View>
        <View style={styles.tabSwitch}>
          <Pressable
            onPress={() => setActiveTab('qa')}
            style={[styles.switchButton, activeTab === 'qa' && styles.switchButtonActive]}>
            <ThemedText style={[styles.switchLabel, activeTab === 'qa' && styles.switchLabelActive]}>
              智能问答
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('podcast')}
            style={[styles.switchButton, activeTab === 'podcast' && styles.switchButtonActive]}>
            <ThemedText
              style={[styles.switchLabel, activeTab === 'podcast' && styles.switchLabelActive]}>
              智能播客
            </ThemedText>
          </Pressable>
        </View>

        {activeTab === 'qa'
          ? mockMessages.map((message) => renderMessage(message))
          : podcastFeed.map((episode) => renderPodcastEpisode(episode))}
      </ScrollView>
      {activeTab === 'qa' ? (
        <View style={styles.inputBar}>
          <TextInput
            placeholder="请描述你想了解的股票或问题"
            placeholderTextColor="#F8C9B5"
            style={styles.input}
            returnKeyType="send"
          />
          <View style={styles.sendButton}>
            <ThemedText style={styles.sendText}>发送</ThemedText>
          </View>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 18,
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
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
    gap: 6,
  },
  switchButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: '#C2341F',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A4B3C',
  },
  switchLabelActive: {
    color: '#FFFFFF',
  },
  messageRow: {
    gap: 10,
    alignItems: 'flex-start',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: '#C2341F',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    maxWidth: '90%',
  },
  bubbleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  newsList: {
    gap: 12,
  },
  newsItem: {
    gap: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFF6EE',
  },
  newsHeadline: {
    fontWeight: '700',
    fontSize: 14,
  },
  newsSummary: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  chartWrapper: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
    height: 120,
    backgroundColor: '#FFF2E8',
    borderRadius: 12,
    padding: 12,
  },
  chartSegment: {
    alignItems: 'center',
    gap: 4,
  },
  chartConnectorUp: {
    width: 2,
    backgroundColor: '#C2341F',
  },
  chartConnectorDown: {
    width: 2,
    backgroundColor: '#148A55',
  },
  chartBar: {
    width: 10,
    borderRadius: 6,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  podcastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(194, 52, 31, 0.16)',
  },
  podcastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  podcastCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C2341F',
    backgroundColor: '#FFE7DF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  podcastDuration: {
    fontSize: 12,
    color: '#8E6157',
  },
  podcastTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7A271A',
  },
  podcastSummary: {
    fontSize: 13,
    lineHeight: 20,
    color: '#8A4C3D',
  },
  podcastFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  podcastPublished: {
    fontSize: 12,
    color: '#9C6E63',
  },
  podcastAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2341F',
  },
  inputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(140, 29, 24, 0.92)',
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    color: '#6E2017',
  },
  sendButton: {
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#C2341F',
    justifyContent: 'center',
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
