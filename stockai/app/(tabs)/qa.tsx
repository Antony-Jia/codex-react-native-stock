import { Image } from 'expo-image';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
    text: 'AI助手，帮我看看上证指数今日为何大涨？',
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
    title: '沪指30分钟技术折线',
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
        time: '45分钟前',
        summary: '监管层加快行业整合节奏，市场预期集中度提升带来估值修复机会。',
      },
      {
        headline: '消费复苏数据超出预期',
        time: '1小时前',
        summary: '中秋国庆双节消费额同比增长12%，白酒、旅游概念延续红盘表现。',
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

const TrendLine = ({ points }: { points: number[] }) => {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  return (
    <View style={styles.chartWrapper}>
      {points.map((point, index) => {
        const height = ((point - min) / range) * 80 + 20;
        const prev = ((points[index - 1] - min) / range) * 80 + 20;
        const isUp = height >= prev;

        return (
          <View key={`${point}-${index}`} style={styles.chartSegment}>
            {index !== 0 && (
              <View style={[styles.chartConnector, { height: Math.abs(height - prev) }]} />
            )}
            <View
              style={[
                styles.chartBar,
                { height, backgroundColor: isUp || index === 0 ? '#C2341F' : '#ED9082' },
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
            {message.title && (
              <ThemedText style={styles.bubbleTitle}>{message.title}</ThemedText>
            )}
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

export default function QAScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            沪市AI问答
          </ThemedText>
          <ThemedText style={styles.subtitle}>多模态智能解读，信息一屏掌握</ThemedText>
        </View>
        {mockMessages.map((message) => renderMessage(message))}
      </ScrollView>
      <View style={styles.inputBar}>
        <TextInput
          placeholder="请描述你想了解的股票或问题…"
          placeholderTextColor="#F8C9B5"
          style={styles.input}
        />
        <View style={styles.sendButton}>
          <ThemedText style={styles.sendText}>发送</ThemedText>
        </View>
      </View>
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
    padding: 20,
    paddingBottom: 120,
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
  chartConnector: {
    width: 2,
    backgroundColor: '#C2341F',
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
