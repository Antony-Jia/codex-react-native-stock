/**
 * 测试时区转换
 * 用于验证 UTC 时间是否正确转换为 UTC+8
 */

import { formatLocalTime, toLocalTime } from './dayjs';

// 测试用例
const testCases = [
  {
    name: '测试 UTC 时间转换',
    utcTime: '2024-01-15T10:30:00Z', // UTC 10:30
    expectedLocal: '2024-01-15 18:30:00', // 北京时间 18:30 (UTC+8)
  },
  {
    name: '测试数据库格式时间',
    utcTime: '2024-01-15T10:30:00.000000', // 数据库格式
    expectedLocal: '2024-01-15 18:30:00',
  },
  {
    name: '测试跨天时间',
    utcTime: '2024-01-15T20:00:00Z', // UTC 20:00
    expectedLocal: '2024-01-16 04:00:00', // 北京时间次日 04:00
  },
];

console.log('=== 时区转换测试 ===\n');

testCases.forEach(({ name, utcTime, expectedLocal }) => {
  const result = formatLocalTime(utcTime);
  const passed = result === expectedLocal;
  
  console.log(`${name}:`);
  console.log(`  输入 (UTC):     ${utcTime}`);
  console.log(`  期望输出:       ${expectedLocal}`);
  console.log(`  实际输出:       ${result}`);
  console.log(`  测试结果:       ${passed ? '✅ 通过' : '❌ 失败'}\n`);
});

// 测试当前时间
const now = new Date();
const utcNow = now.toISOString();
const localNow = formatLocalTime(utcNow);

console.log('=== 当前时间测试 ===');
console.log(`系统当前时间:     ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
console.log(`UTC 时间:         ${utcNow}`);
console.log(`转换后本地时间:   ${localNow}`);
console.log('\n如果转换后的时间与系统当前时间一致，说明时区转换正确！');
