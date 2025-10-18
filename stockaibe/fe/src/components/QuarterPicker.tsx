import React from 'react';
import { Select, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

interface QuarterPickerProps {
  value?: Dayjs | null;
  onChange?: (value: Dayjs | null) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

/**
 * 季度选择器组件
 * 选择年份和季度，返回季度末日期（如 2024-Q1 -> 2024-03-31）
 */
const QuarterPicker: React.FC<QuarterPickerProps> = ({
  value,
  onChange,
  placeholder = '选择季度',
  style,
  allowClear = true,
}) => {
  // 生成年份选项（从2010年到当前年份+1）
  const currentYear = dayjs().year();
  const years = Array.from({ length: currentYear - 2009 + 1 }, (_, i) => 2010 + i);

  // 季度映射到月末日期
  const quarterEndDates: Record<string, string> = {
    Q1: '03-31',
    Q2: '06-30',
    Q3: '09-30',
    Q4: '12-31',
  };

  // 解析当前值
  const parseValue = (val: Dayjs | null | undefined): { year: number; quarter: string } | null => {
    if (!val) return null;
    const month = val.month() + 1; // dayjs month is 0-indexed
    let quarter = 'Q1';
    if (month <= 3) quarter = 'Q1';
    else if (month <= 6) quarter = 'Q2';
    else if (month <= 9) quarter = 'Q3';
    else quarter = 'Q4';
    return { year: val.year(), quarter };
  };

  const parsed = parseValue(value);
  const selectedYear = parsed?.year;
  const selectedQuarter = parsed?.quarter;

  // 生成季度末日期
  const getQuarterEndDate = (year: number, quarter: string): Dayjs => {
    const dateStr = `${year}-${quarterEndDates[quarter]}`;
    return dayjs(dateStr);
  };

  const handleYearChange = (year: number) => {
    const quarter = selectedQuarter || 'Q1';
    const newDate = getQuarterEndDate(year, quarter);
    onChange?.(newDate);
  };

  const handleQuarterChange = (quarter: string) => {
    const year = selectedYear || currentYear;
    const newDate = getQuarterEndDate(year, quarter);
    onChange?.(newDate);
  };

  const handleClear = () => {
    onChange?.(null);
  };

  return (
    <Space.Compact style={style}>
      <Select
        value={selectedYear}
        onChange={handleYearChange}
        placeholder="年份"
        style={{ width: 100 }}
        allowClear={allowClear}
        onClear={handleClear}
        showSearch
      >
        {years.map((year) => (
          <Select.Option key={year} value={year}>
            {year}
          </Select.Option>
        ))}
      </Select>
      <Select
        value={selectedQuarter}
        onChange={handleQuarterChange}
        placeholder="季度"
        style={{ width: 80 }}
        allowClear={allowClear}
        onClear={handleClear}
      >
        <Select.Option value="Q1">Q1</Select.Option>
        <Select.Option value="Q2">Q2</Select.Option>
        <Select.Option value="Q3">Q3</Select.Option>
        <Select.Option value="Q4">Q4</Select.Option>
      </Select>
    </Space.Compact>
  );
};

export default QuarterPicker;
