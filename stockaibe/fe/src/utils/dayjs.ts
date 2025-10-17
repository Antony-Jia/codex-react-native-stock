/**
 * Day.js 配置文件
 * 统一处理时区转换：UTC -> UTC+8 (北京时间)
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 启用 UTC 和时区插件
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认时区为上海（UTC+8）
dayjs.tz.setDefault('Asia/Shanghai');

/**
 * 格式化 UTC 时间为本地时间（UTC+8）
 * @param time UTC 时间字符串
 * @param format 格式化模板，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的本地时间字符串
 */
export const formatLocalTime = (time: string | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  return dayjs.utc(time).tz('Asia/Shanghai').format(format);
};

/**
 * 将 UTC 时间转换为本地 dayjs 对象
 * @param time UTC 时间字符串
 * @returns 本地时区的 dayjs 对象
 */
export const toLocalTime = (time: string | Date) => {
  return dayjs.utc(time).tz('Asia/Shanghai');
};

export default dayjs;
